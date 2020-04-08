goog.provide('office.localstore.idb.Transaction');

goog.require('office.diagnostics.CsiConstants');
goog.require('office.diagnostics.PerformanceManager');
goog.require('office.localstore.IdleDelay');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.ObjectStore');
goog.require('office.localstore.idb.RequestTracker');
goog.require('office.localstore.idb.TransactionMode');
goog.require('office.localstore.idb.TransactionStatusRecorder');
goog.require('goog.asserts');
goog.require('goog.log');



/**
 * @param {!IDBDatabase} db The IndexedDB database.
 * @param {!Array.<office.localstore.idb.StoreName>} storeNames The store names
 *     affected by the transaction.
 * @param {string} errorContext The string to log with IndexedDB errors.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 * @param {boolean=} opt_allowWrite Whether the transaction needs write access.
 * @param {number=} opt_timeoutMs The amount of time in ms to allow for a
 *     transaction to run before logging an error and calling
 *     {@code opt_timeoutCallback} if specified. A default value will be used if
 *     this parameter is unspecified.
 * @param {function()=} opt_timeoutCallback The function to call when the
 *     transaction times out. If specified, the transaction will abort when it
 *     times out, and only {@code opt_timeoutCallback} will be called. Pending
 *     request events will also be suppressed. If unspecified, only an error is
 *     logged when the transaction times out, and the transaction is not
 *     aborted.
 * @param {?string=} opt_csiConstant The CSI constant to use for reporting the
 *     transaction timing, or null to disable reporting for this transaction.
 *     If unspecified, a default constant based on {@code opt_allowWrite} is
 *     used.
 * @constructor
 * @struct
 */
office.localstore.idb.Transaction = function(db, storeNames, errorContext,
    errorReporter, errorCallback, opt_allowWrite, opt_timeoutMs,
    opt_timeoutCallback, opt_csiConstant) {
  /**
   * @type {!IDBDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!Array.<office.localstore.idb.StoreName>}
   * @private
   */
  this.storeNames_ = storeNames;

  /**
   * The string to log with IndexedDB errors.
   * @type {string}
   * @private
   */
  this.errorContext_ = errorContext;

  /**
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /** @private {function(!office.localstore.LocalStoreError)} */
  this.errorCallback_ = errorCallback;

  /**
   * Whether the error callback has been called. This bit is used to ensure
   * that the error callback is called only once for a transaction.
   * @private {boolean}
   */
  this.errorCallbackCalled_ = false;

  /**
   * Whether the transaction should allow writing to the database.
   * @type {boolean}
   * @private
   */
  this.allowWrite_ = !!opt_allowWrite;

  /**
   * The function to call when the transaction completes, or null.
   * @type {?function()}
   * @private
   */
  this.completionCallback_ = null;

  /**
   * The underlying IndexedDB transaction, or null if not yet started.
   * @type {IDBTransaction}
   * @private
   */
  this.transaction_ = null;

  /**
   * The recorder for status information.
   * @type {!office.localstore.idb.TransactionStatusRecorder}
   * @private
   */
  this.statusRecorder_ = new office.localstore.idb.TransactionStatusRecorder();

  /**
   * The tracker for requests on this transactions, to aid with logging and
   * debugging
   * @type {!office.localstore.idb.RequestTracker}
   * @private
   */
  this.requestTracker_ = new office.localstore.idb.RequestTracker();

  /**
   * @type {number}
   * @private
   */
  this.timeoutMs_ =
      opt_timeoutMs || office.localstore.idb.Transaction.DEFAULT_TIMEOUT_MS_;

  /**
   * The idle delay for timing out the transaction.
   * @type {!office.localstore.IdleDelay}
   * @private
   */
  this.timeoutDelay_ = new office.localstore.IdleDelay(
      goog.bind(this.handleTimeout_, this), this.timeoutMs_, document);

  /**
   * The function to call when the transaction has timed out.
   * @type {?function()}
   * @private
   */
  this.timeoutCallback_ = opt_timeoutCallback || null;

  /**
   * The CSI performance manager for tracking latency metrics.
   * @type {!office.diagnostics.PerformanceManager}
   * @private
   */
  this.performanceManager_ = office.diagnostics.PerformanceManager.getInstance();

  /**
   * The performance manager's event ID to track how long the transaction runs,
   * or null if the transaction hasn't yet started or is not being reported.
   * @type {?string}
   * @private
   */
  this.eventId_ = null;

  /**
   * The identifier of this transaction for logging and debugging.
   * @type {number}
   * @private
   */
  this.id_ = office.localstore.idb.Transaction.nextId_++;

  var csiVariable = office.diagnostics.CsiConstants.Variable;
  /**
   * The CSI constant to use for reporting the transaction timing, or null if
   * reporting is disabled.
   * @type {?string}
   * @private
   */
  this.csiConstant_ = goog.isDef(opt_csiConstant) ?
      opt_csiConstant :
      (this.allowWrite_ ?
          csiVariable.INDEXEDDB_READWRITE_TRANSACTION :
          csiVariable.INDEXEDDB_READONLY_TRANSACTION);
};


/**
 * The maximum time in ms to allow a transaction to run before logging an error.
 * @type {number}
 * @private
 */
office.localstore.idb.Transaction.DEFAULT_TIMEOUT_MS_ = 60 * 1000;


/**
 * The ID to assign to the next transaction.
 * @type {number}
 * @private
 */
office.localstore.idb.Transaction.nextId_ = 0;


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.Transaction.prototype.logger_ =
    goog.log.getLogger('office.localstore.idb.Transaction');


/**
 * Opens the transaction. This creates the underlying IndexedDB transaction. The
 * transaction has to be opened before any calls to {@code #getObjectStore} or
 * {@code #abort}.
 */
office.localstore.idb.Transaction.prototype.open = function() {
  if (this.csiConstant_ != null) {
    this.eventId_ = this.performanceManager_.startEvent(this.csiConstant_);
  }

  var transactionMode = this.allowWrite_ ?
      office.localstore.idb.TransactionMode.READ_WRITE :
      office.localstore.idb.TransactionMode.READ_ONLY;

  goog.log.info(this.logger_, transactionMode + ' transaction ' + this.id_ +
      ' opened on ' + this.storeNames_);

  this.timeoutDelay_.start();

  var transaction = this.db_.transaction(this.storeNames_, transactionMode);
  transaction.onabort =
      this.errorReporter_.protectFunction(this.onAbort_, this);
  transaction.oncomplete =
      this.errorReporter_.protectFunction(this.onComplete_, this);
  // onerror handler rethrows any errors to correctly abort the transaction.
  transaction.onerror =
      this.errorReporter_.protectFunction(this.onError_, this,
          true /* opt_rethrow */);
  this.transaction_ = transaction;
};


/**
 * Executes the error callback with the given local store error, if it has not
 * been called already.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.Transaction.prototype.maybeExecuteErrorCallback_ =
    function(localStoreError) {
  if (!this.errorCallbackCalled_) {
    this.errorCallback_(localStoreError);
    this.errorCallbackCalled_ = true;
  }
};


/**
 * Abandons the transaction so that future error callback or reporting will be
 * suppressed. Should be a used for read only transaction in the case that
 * subsequent errors from the transactions (i.e. only really internal aborts)
 * should be ignored. Also, in read-write transactions where nothing was
 * actually written. (see b/12802923 for details).
 */
office.localstore.idb.Transaction.prototype.abandon = function() {
  goog.asserts.assert(!this.statusRecorder_.isAbandoned(),
      'The transaction was already abandoned.');
  goog.asserts.assert(!this.completionCallback_, 'Cannot abandon a ' +
      'transaction with completion callback.');
  goog.asserts.assert(!this.requestTracker_.hasPendingRequests(), 'Cannot ' +
      'abandon a transaction with pending requests.');
  this.statusRecorder_.recordAbandoned();
  this.timeoutDelay_.dispose();
  if (this.eventId_) {
    this.performanceManager_.discardEvent(this.eventId_);
    this.eventId_ = null;
  }
};


/**
 * Aborts the transaction, without triggering the completion callback. Pending
 * request events will be suppressed. If a local store error is provided, the
 * error callback for the transaction is called with the given error.
 * @param {!office.localstore.LocalStoreError=} opt_localStoreError
 */
office.localstore.idb.Transaction.prototype.abort = function(
    opt_localStoreError) {
  goog.asserts.assert(!this.statusRecorder_.isAbandoned(),
      'The transaction was already abandoned.');
  this.abort_(false /* fromTimeout */, opt_localStoreError);
};


/**
 * Aborts the transaction, without triggering the completion callback. If a
 * local store error is provided, the error callback for the transaction is
 * called with the given error.
 * @param {boolean} fromTimeout Whether the abort is due to the transaction
 *     timing out.
 * @param {!office.localstore.LocalStoreError=} opt_localStoreError
 * @private
 */
office.localstore.idb.Transaction.prototype.abort_ = function(
    fromTimeout, opt_localStoreError) {
  var statusRecorder = this.statusRecorder_;
  if (statusRecorder.wasAborted() || statusRecorder.wasAbortRequested()) {
    return;
  }

  this.assertTransaction_();
  goog.log.info(this.logger_, 'Abort requested for transaction ' + this.id_);
  statusRecorder.recordAbortRequested();

  try {
    this.transaction_.abort();
    if (opt_localStoreError) {
      this.maybeExecuteErrorCallback_(opt_localStoreError);
    }
  } catch (e) {
    if (e.name != 'InvalidStateError' || !fromTimeout) {
      // Aborting a transaction will error with an InvalidStateError (DOM
      // exception 11) if the transaction has already finished internally
      // (i.e. completed or aborted). This can happen if the timeout callback is
      // executed between a transaction finishing internally and the onabort or
      // oncomplete handler executing. All other abort calls should be behind
      // request callbacks or in the execution path that created the
      // transaction, and thus should not trigger this error.
      var context = this.createDebugContext_();
      context['abortFromTimeout'] = fromTimeout;
      //  Should probably change this to a fatal error, since it
      // means the transaction wasn't aborted when an abort was requested.
      this.errorReporter_.info(e, context);
    }
  }
  this.timeoutDelay_.dispose();
};


/**
 * @param {office.localstore.idb.StoreName} storeName The name of the object
 *     store.
 * @return {!office.localstore.idb.ObjectStore} The object store.
 */
office.localstore.idb.Transaction.prototype.getObjectStore = function(storeName) {
  this.assertTransaction_();
  return new office.localstore.idb.ObjectStore(
      this.transaction_.objectStore(storeName), this.statusRecorder_,
      this.requestTracker_, this.errorReporter_);
};


/**
 * @param {function()} completionCallback The completion callback.
 */
office.localstore.idb.Transaction.prototype.setCompletionCallback = function(
    completionCallback) {
  if (this.completionCallback_) {
    throw Error('Completion callback already set');
  }
  goog.asserts.assert(!this.statusRecorder_.isAbandoned(),
      'Cannot set completion callback on an abandoned transaction.');

  this.completionCallback_ = completionCallback;
};


//  Remove this method and use abandon() instead.
/**
 * Clears the timeout callback. This is useful to prevent the timeout callback
 * from executing when processing on this transaction is done, but the
 * transaction might not yet have completed. Note even when the timeout callback
 * was cleared, an error report is still sent in the case of a timeout.
 */
office.localstore.idb.Transaction.prototype.clearTimeoutCallback = function() {
  this.timeoutCallback_ = null;
};


/**
 * @return {!office.localstore.idb.TransactionStatus} The status information for
 *     this transaction.
 */
office.localstore.idb.Transaction.prototype.getStatus = function() {
  return this.statusRecorder_;
};


/**
 * Asserts that the underlying transaction exists.
 * @private
 */
office.localstore.idb.Transaction.prototype.assertTransaction_ = function() {
  if (!this.transaction_) {
    throw Error('Transaction does not exist');
  }
};


/**
 * Handles the abortion of the transaction.
 * @param {!Event} e The IndexedDB event.
 * @private
 */
office.localstore.idb.Transaction.prototype.onAbort_ = function(e) {
  if (this.statusRecorder_.isAbandoned()) {
    return;
  }

  this.statusRecorder_.recordAbort();
  if (this.eventId_) {
    this.performanceManager_.discardEvent(this.eventId_);
    this.eventId_ = null;
  }
  this.timeoutDelay_.dispose();
  if (this.statusRecorder_.wasAbortRequested()) {
    goog.log.info(
        this.logger_, 'Transaction ' + this.id_ + ' aborted explicitly');
  } else {
    var ErrorContextField = office.localstore.idb.DatabaseUtil.ErrorContextField;
    e.target[ErrorContextField.INTERNAL_ABORT] = true;

    // Quota exceeded errors in read-only transactions internally aborted will
    // be ignored. This is a work around for a Chrome bug, IndexedDB should
    // allow readonly transactions to complete without checking for quota.
    // The relevant Chrome bug is
    // https://code.google.com/p/chromium/issues/detail?id=177853
    if (!this.allowWrite_ && e.target['error'] &&
        e.target['error'].name == 'QuotaExceededError') {
      goog.log.info(this.logger_, 'Transaction ' + this.id_ + ' aborted due ' +
          'to a QuotaExceededError: ' +
          office.localstore.idb.DatabaseUtil.formatError(e));
      if (this.completionCallback_) {
        this.completionCallback_();
      }
      return;
    }

    this.processError_('',
        this.createDebugContext_(), e);
  }
};


/**
 * Handles the completion of the transaction by calling the completion callback.
 * @param {!Event} e The IndexedDB event.
 * @private
 */
office.localstore.idb.Transaction.prototype.onComplete_ = function(e) {
  if (this.statusRecorder_.isAbandoned()) {
    return;
  }
  if (this.eventId_) {
    this.performanceManager_.completeEvent(this.eventId_);
    this.eventId_ = null;
  }
  goog.log.info(this.logger_, 'Transaction ' + this.id_ + ' completed');
  this.timeoutDelay_.dispose();
  if (this.completionCallback_) {
    this.completionCallback_();
  }
};


/**
 * Handles request errors by logging the error and passing it on to the error
 * callback. Event propagation is stopped, so the event will not bubble up to
 * the the database's error handler.
 * @param {!Event} e The IndexedDB event.
 * @private
 */
office.localstore.idb.Transaction.prototype.onError_ = function(e) {
  e.stopPropagation();
  var statusRecorder = this.statusRecorder_;
  if (statusRecorder.isAbandoned()) {
    return;
  }
  if (statusRecorder.wasAborted() || statusRecorder.wasAbortRequested()) {
    // Request errors are expected on aborted transactions.
    return;
  }

  var domError = e.target['error'];
  if (domError && domError.name == 'AbortError') {
    // On aborted transactions, the request's error callback can fire before
    // transaction's abort callback.
    return;
  }

  var ErrorContextField = office.localstore.idb.DatabaseUtil.ErrorContextField;
  var context = this.createDebugContext_();
  context['request'] = e.target[ErrorContextField.REQUEST_CONTEXT];

  this.processError_('', context, e);
};


/**
 * Processes an IndexedDB error by logging it, and either passing it on to the
 * error callback or triggering a fatal error.
 * @param {string} message
 * @param {!Object} context The debug context to be sent with the error report.
 * @param {!Event} e The IndexedDB event.
 * @private
 */
office.localstore.idb.Transaction.prototype.processError_ = function(
    message, context, e) {
  var errorMessage = message + ' (' + this.errorContext_ + '): ' +
      office.localstore.idb.DatabaseUtil.formatError(e);

  goog.log.info(this.logger_, 'Transaction ' + this.id_ + ': ' + errorMessage);

  this.errorReporter_.info(Error(errorMessage), context);
  this.maybeExecuteErrorCallback_(new office.localstore.LocalStoreError(
      office.localstore.LocalStoreError.Type.DATABASE_ERROR, errorMessage, e));
};


/**
 * Handles a transaction timeout.
 * @private
 */
office.localstore.idb.Transaction.prototype.handleTimeout_ = function() {
  if (this.statusRecorder_.isAbandoned()) {
    return;
  }
  goog.log.info(this.logger_, 'Transaction ' + this.id_ + ' running for more ' +
      'than ' + this.timeoutMs_ + 'ms');
  var context = this.createDebugContext_();
  context['transactionTimeout'] = this.timeoutMs_;
  context['timeoutDelays'] = this.timeoutDelay_.getDelays().toString();
  context['documentHidden'] = document['hidden'] || document['webkitHidden'];
  this.errorReporter_.info(
      Error('A transaction was running for a long time (' +
          this.errorContext_ + ')'), context);

  this.timeoutDelay_.dispose();

  if (this.timeoutCallback_) {
    this.abort_(true /* fromTimeout */);
    this.timeoutCallback_();

    // Null out the completion event handler on the transaction, so that we
    // don't execute the completion callback if the transaction has already
    // completed internally. The abort event handler is safe to be called since
    // it is a no-op when an abort was requested, and the error event handler
    // needs to remain to prevent propagation of any error events from pending
    // requests to the database's error handler.
    //  Consider checking for wasAbortRequested in #onComplete
    // instead.
    this.transaction_.oncomplete = null;
  }
};


/**
 * @return {!Object} An object containing debug information to be used as the
 * context for error reports.
 * @private
 */
office.localstore.idb.Transaction.prototype.createDebugContext_ = function() {
  var context = {
    'transactionAllowWrite': this.allowWrite_,
    'transactionContext': this.errorContext_,
    'transactionId': this.id_,
    'transactionObjectStores': this.storeNames_.toString()
  };
  this.requestTracker_.extendDebugContext(context);
  return context;
};
