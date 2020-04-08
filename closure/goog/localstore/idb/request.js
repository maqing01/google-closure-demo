goog.provide('office.localstore.idb.Request');

goog.require('office.diagnostics.PerformanceManager');
goog.require('office.localstore.IdleDelay');
goog.require('office.localstore.idb.DatabaseUtil');



/**
 * @param {!IDBRequest} request The underlying IndexedDB request.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @param {string} debugString The debug description of this request.
 * @param {!office.localstore.idb.TransactionStatus} transactionStatus
 * @param {!office.localstore.idb.RequestTracker} requestTracker
 * @param {function()=} opt_timeoutCallback The timeout callback. If not
 *     provided the request will never timeout.
 * @param {boolean=} opt_logTimeout Whether to log the timeout even when a
 *     timeout callback isn't provided.
 * @param {number=} opt_timeoutMs The timeout to use in ms. If unspecified, the
 *     request will never time out.
 * @param {string=} opt_csiConstant The CSI constant to use for reporting the
 *     request timing. If unspecified, timing won't be reported.
 * @constructor
 * @struct
 */
office.localstore.idb.Request = function(request, errorReporter, debugString,
    transactionStatus, requestTracker, opt_timeoutCallback, opt_logTimeout,
    opt_timeoutMs, opt_csiConstant) {
  /** @private {!IDBRequest} */
  this.request_ = request;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /** @private {string} */
  this.debugString_ = debugString;

  /** @private {!office.localstore.idb.TransactionStatus} */
  this.transactionStatus_ = transactionStatus;

  /** @private {!office.localstore.idb.RequestTracker} */
  this.requestTracker_ = requestTracker;

  /** @private {number} */
  this.requestId_ = requestTracker.addRequest(debugString);

  /** @private {?function(!Event)} */
  this.successCallback_ = null;

  /** @private {?function(!Event)} */
  this.errorCallback_ = null;

  /**
   * The function to call when the request has timed out.
   * @private {?function()}
   */
  this.timeoutCallback_ = opt_timeoutCallback || null;

  /**
   * The performance manager for tracking latency metrics.
   * @private {!office.diagnostics.PerformanceManager}
   */
  this.performanceManager_ = office.diagnostics.PerformanceManager.getInstance();

  /**
   * The performance manager's event ID to track how long the request runs,
   * or null if no CSI constant is provided.
   * @private {?string}
   */
  this.eventId_ = opt_csiConstant ?
      this.performanceManager_.startEvent(opt_csiConstant) : null;

  /** @private {number} */
  this.timeoutMs_ = opt_timeoutMs || 0;

  /**
   * The idle delay for timing out the request.
   * @private {office.localstore.IdleDelay}
   */
  this.timeoutDelay_ = null;

  if (this.timeoutMs_ > 0 && (this.timeoutCallback_ || opt_logTimeout)) {
    this.timeoutDelay_ = new office.localstore.IdleDelay(
        goog.bind(this.handleTimeout_, this), this.timeoutMs_, document);
    this.timeoutDelay_.start();
  }

  // Callbacks are protected to report detailed error information, and rethrow
  // any errors to abort the transaction.
  this.request_.onsuccess = this.errorReporter_.protectFunction(
      this.onSuccess_, this, true /* opt_rethrow */);
  this.request_.onerror = this.errorReporter_.protectFunction(
      this.onError_, this, true /* opt_rethrow */);
};


/**
 * @return {string} The debug description of this request.
 * @protected
 */
office.localstore.idb.Request.prototype.getDebugString = function() {
  return this.debugString_;
};


/**
 * @return {!office.debug.ErrorReporterApi}
 * @protected
 */
office.localstore.idb.Request.prototype.getErrorReporter = function() {
  return this.errorReporter_;
};


/**
 * Gets the result of the request. May only be called when the request is done.
 * @return {*} The result of the request.
 */
office.localstore.idb.Request.prototype.getResult = function() {
  return this.request_.result;
};


/**
 * @param {function(!Event)} successCallback The success callback.
 */
office.localstore.idb.Request.prototype.setSuccessCallback = function(
    successCallback) {
  if (this.successCallback_) {
    throw Error('Success callback already set');
  }
  this.successCallback_ = successCallback;

};


/**
 * Handles request success.
 * @param {!Event} e
 * @private
 */
office.localstore.idb.Request.prototype.onSuccess_ = function(e) {
  this.disposeTimer();
  if (this.eventId_) {
    this.performanceManager_.completeEvent(
        /** @type {string} */ (this.eventId_));
  }
  this.requestTracker_.recordSuccess(this.requestId_);

  if (this.transactionStatus_.wasAbortRequested()) {
    // Suppress the success callback call when the underlying transaction was
    // requested to abort, either explicitly or because it timed out.
    return;
  }

  if (this.successCallback_) {
    this.successCallback_(e);
  }
};


/**
 * Sets the callback to be called when there was a request error. After the
 * callback was called, the error will bubble up to its transaction unless
 * propagation was stopped. On the transaction, the error is logged and passed
 * on the the transaction's error callback.
 * @param {function(!Event)} errorCallback The error callback.
 */
office.localstore.idb.Request.prototype.setErrorCallback = function(
    errorCallback) {
  if (this.errorCallback_) {
    throw Error('Error callback already set');
  }
  this.errorCallback_ = errorCallback;
};


/**
 * Handles request error.
 * @param {!Event} e
 * @private
 */
office.localstore.idb.Request.prototype.onError_ = function(e) {
  this.disposeTimer();
  if (this.eventId_) {
    this.performanceManager_.discardEvent(
        /** @type {string} */ (this.eventId_));
  }
  this.requestTracker_.recordError(this.requestId_);

  e.target[office.localstore.idb.DatabaseUtil.ErrorContextField.REQUEST_CONTEXT] =
      this.debugString_;

  if (this.transactionStatus_.wasAbortRequested()) {
    // Suppress the error callback call when the underlying transaction was
    // requested to abort, either explicitly or because it timed out.
    return;
  }

  var domError = e.target['error'];
  if (domError && domError.name == 'AbortError') {
    // Suppress the error callback call when the request errored because the
    // transaction was aborted.
    return;
  }

  if (this.errorCallback_) {
    this.errorCallback_(e);
  }
};


/**
 * Disposes of the timer. Should be called only for event handlers on the
 * request.
 * @protected
 */
office.localstore.idb.Request.prototype.disposeTimer = function() {
  goog.dispose(this.timeoutDelay_);
};


/**
 * Nulls out any callbacks added to the request. Should be extended by
 * subclasses that add callbacks.
 * @param {!IDBRequest} request
 * @protected
 */
office.localstore.idb.Request.prototype.nullOutCallbacks = function(request) {
  request.onsuccess = goog.nullFunction;
  request.onerror = goog.nullFunction;
};


/**
 * Handles a request timeout.
 * @private
 */
office.localstore.idb.Request.prototype.handleTimeout_ = function() {
  if (this.eventId_) {
    this.performanceManager_.discardEvent(
        /** @type {string} */ (this.eventId_));
  }
  var context = {
    'documentHidden': document['hidden'] || document['webkitHidden'],
    'request': this.debugString_,
    'requestTimeoutMs': this.timeoutMs_,
    'timeoutCallbackSet': !!this.timeoutCallback_,
    'timeoutDelays': this.timeoutDelay_.getDelays().toString()
  };
  this.errorReporter_.info(
      Error('A request was running for a long time'), context);

  this.disposeTimer();

  if (this.transactionStatus_.wasAbortRequested()) {
    // Suppress the timeout callback call when the underlying transaction was
    // requested to abort, either explicitly or because it timed out.
    return;
  }

  if (this.timeoutCallback_) {
    this.nullOutCallbacks(this.request_);
    this.timeoutCallback_();
  }
};
