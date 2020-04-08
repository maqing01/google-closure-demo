goog.provide('office.localstore.idb.LockManager');

goog.require('office.diagnostics.CsiConstants');
goog.require('office.flag');
goog.require('office.localstore.DocumentLockCapability');
goog.require('office.localstore.Flags');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.LockAcquisitionResult');
goog.require('office.localstore.idb.DocumentLock');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.VersionChangeEvent');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.functions');
goog.require('goog.log');
goog.require('goog.math');



/**
 * @param {string} sessionId The session id to use for locking.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. If non-zero, the lock will
 *     be refreshed automatically before it expires.
 * @param {!office.localstore.idb.DocsDatabase} db The database object.
 * @param {!office.debug.ErrorReporterApi} errorReporter An error reporter.
 * @param {function(!office.localstore.LocalStoreError)=}
 *     opt_lockRefreshErrorCallback The error callback for handling lock refresh
 *     errors. If unspecified, the database default error callback is used.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.idb.LockManager = function(
    sessionId, lockDuration, db, errorReporter, opt_lockRefreshErrorCallback) {
  goog.asserts.assert(
      lockDuration <= office.localstore.idb.DocumentLock.MAX_VALID_LOCK_DURATION,
      'Lock duration is too long');

  goog.base(this);

  /**
   * The session id to be used to hold locks.
   * @private {string}
   */
  this.sessionId_ = sessionId;

  /**
   * The amount of time in milliseconds the application can hold on to the lock
   * for the given document.
   * @private {number}
   */
  this.lockDuration_ = lockDuration;

  /** @private {!office.localstore.idb.DocsDatabase} */
  this.db_ = db;

  /**
   * The error callback for handling lock refresh errors.
   * @private {function(!office.localstore.LocalStoreError)}
   */
  this.lockRefreshErrorCallback_ =
      opt_lockRefreshErrorCallback || this.db_.getErrorCallback();

  /**
   * The latest lock expiration time that we attempted to write to storage.
   * @private {number}
   */
  this.lastWrittenExpirationTime_ = 0;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /** @private {!goog.events.EventHandler.<!office.localstore.idb.LockManager>} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.listen(db,
      office.localstore.idb.VersionChangeEvent.EVENT_TYPE,
      this.handleVersionChange_);
};
goog.inherits(office.localstore.idb.LockManager, goog.events.EventTarget);


/**
 * The amount of leeway to give to ensure a lock is refreshed with enough time,
 * in milliseconds.
 * @private {number}
 */
office.localstore.idb.LockManager.LOCK_REFRESH_DELTA_ = 5 * 1000;


/** @private {goog.log.Logger} */
office.localstore.idb.LockManager.prototype.logger_ =
    goog.log.getLogger('office.localstore.idb.LockManager');


/**
 * A timer for refreshing the document lock.
 * NOTE: Only one document can have a refreshing lock at any given time.
 * @private {goog.Timer}
 */
office.localstore.idb.LockManager.prototype.refreshTimer_ = null;


/**
 * Handles a database version change by releasing the lock and stopping the lock
 * refresh timer.
 * @param {goog.events.Event} e
 * @private
 */
office.localstore.idb.LockManager.prototype.handleVersionChange_ = function(e) {
  this.releaseAllLocks();
};


/**
 * Acquires the document lock for the given document ID, and starts the refresh
 * timer if the acquisition was successful and the lock duration is non-zero.
 * @param {string} docId
 * @param {function(office.localstore.LockAcquisitionResult)} resultCallback The
 *     function to call with the result of the lock acquisition. Only called
 *     when there was no storage error.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback The
 *     function to call when there was a storage error.
 */
office.localstore.idb.LockManager.prototype.acquireDocumentLock = function(
    docId, resultCallback, opt_errorCallback) {
  goog.log.info(this.logger_, 'acquireDocumentLock(' + docId + ')');
  goog.asserts.assert(!this.shouldRefreshLock_() || !this.refreshTimer_,
      'A refreshing lock can only be acquired once');
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_LOCKS],
      '' /* errorMessage */,
      opt_errorCallback,
      true /* opt_allowWrite */,
      office.flag.getInstance().getNumber(
          office.localstore.Flags.IDB_LOCK_ACQUISITION_TIMEOUT),
      goog.partial(
          resultCallback, office.localstore.LockAcquisitionResult.TIMEOUT),
      office.diagnostics.CsiConstants.Variable.INDEXEDDB_LOCK_ACQUISITION);
  var lockAcquisitionResultCallback = goog.bind(
      this.handleLockAcquisitionResult_, this, docId, resultCallback,
      transaction);
  var lockStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.DOCUMENT_LOCKS);
  var lockAvailableCallback = goog.bind(this.writeLockIfAvailable_, this, docId,
      lockStore, lockAcquisitionResultCallback, null /* errorCallback */);
  this.readLock_(docId, lockAvailableCallback, lockStore,
      false /* ensureCurrentLockHolder */,
      true /* dispatchLockAcquisitionStartedEvent */);
};


/**
 * Handles the result of a lock acquisition attempt.
 * @param {string} docId The document ID.
 * @param {function(office.localstore.LockAcquisitionResult)} resultCallback
 *     The function to call with the result of the lock acquisition.
 * @param {!office.localstore.idb.Transaction} transaction The IndexedDB
 *     transaction.
 * @param {office.localstore.LockAcquisitionResult} lockAcquisitionResult The
 *     result of the lock acquisition.
 * @private
 */
office.localstore.idb.LockManager.prototype.handleLockAcquisitionResult_ =
    function(docId, resultCallback, transaction, lockAcquisitionResult) {
  goog.log.info(this.logger_, 'handleLockAcquisitionResult_(docId: ' + docId +
      ', lockAcquisitionResult: ' + lockAcquisitionResult + ')');
  if (lockAcquisitionResult == office.localstore.LockAcquisitionResult.ACQUIRED) {
    transaction.setCompletionCallback(goog.bind(
        this.handleLockAcquisitionSuccess_, this, docId, resultCallback));
  } else {
    // The lock was not acquired, and we're not waiting for the transaction to
    // complete, so clear the timeout callback to prevent calling the result
    // callback again.
    transaction.clearTimeoutCallback();
    resultCallback(lockAcquisitionResult);
  }
};


/**
 * Handles the result of a lock acquisition attempt. Starts the refresh timer if
 * the lock was acquired.
 * @param {string} docId The document ID.
 * @param {function(office.localstore.LockAcquisitionResult)} resultCallback
 *     The function to call with the result of the lock acquisition.
 * @private
 */
office.localstore.idb.LockManager.prototype.handleLockAcquisitionSuccess_ =
    function(docId, resultCallback) {
  goog.log.info(
      this.logger_, 'handleLockAcquisitionSuccess_(docId: ' + docId + ')');

  if (this.refreshTimer_) {
    throw Error('Lock refresh timer should not be running on lock acquisition');
  }

  if (!this.isDisposed() && this.shouldRefreshLock_()) {
    goog.log.info(this.logger_, 'Starting lock refresh timer');
    this.refreshTimer_ = new goog.Timer(this.getLockRefreshTime_());
    this.eventHandler_.
        listen(this.refreshTimer_, goog.Timer.TICK,
            goog.bind(this.handleRefreshTimer_, this, docId));
    this.refreshTimer_.start();
  }

  resultCallback(office.localstore.LockAcquisitionResult.ACQUIRED);
};


/**
 * Ensures that the document lock for the given document ID is available. If the
 * lock is not available, {@code transaction} is aborted with
 * {@code LocalStoreError.Type.LOCK_MISSING}.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction The transaction. Note
 *     that {@code StoreName.DOCUMENT_LOCKS} must be one of the stores the
 *     transaction has open.
 */
office.localstore.idb.LockManager.prototype.ensureDocumentLockAvailable =
    function(docId, transaction) {
  goog.log.info(this.logger_, 'ensureDocumentLockAvailable(' + docId + ')');
  this.readLock_(docId,
      goog.bind(this.handleLockAvailableForEnsurance_, this, transaction),
      transaction.getObjectStore(office.localstore.idb.StoreName.DOCUMENT_LOCKS),
      false /* ensureCurrentLockHolder */,
      false /* dispatchLockAcquisitionStartedEvent */);
};


/**
 * Handles the result of checking the lock when ensuring that the document is
 * available.
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {boolean} lockAvailable
 * @param {?number} currentExpirationTime The current expiration time stored for
 *     the current session. Null if the lock is not available or if the previous
 *     lock was for another session or did not exist.
 * @private
 */
office.localstore.idb.LockManager.prototype.handleLockAvailableForEnsurance_ =
    function(transaction, lockAvailable, currentExpirationTime) {
  if (!lockAvailable) {
    transaction.abort(new office.localstore.LocalStoreError(
        office.localstore.LocalStoreError.Type.LOCK_MISSING,
        ''));
  }
};


/**
 * Refreshes the document lock for the given document ID. If the lock is held by
 * this session, its expiration time is updated. If it is not held, the given
 * transaction is aborted with {@code LocalStoreError.Type.LOCK_MISSING}.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction The transaction within
 *     which to acquire the lock. Note that {@code StoreName.DOCUMENT_LOCKS}
 *     must be one of the stores the transaction has open, and the transaction
 *     has to be writable.
 */
office.localstore.idb.LockManager.prototype.refreshDocumentLock = function(
    docId, transaction) {
  goog.log.info(this.logger_, 'refreshDocumentLock(' + docId + ')');
  var lockAcquisitionResultCallback = goog.bind(
      this.handleLockAcquisitionResultForRefresh_, this, docId, transaction);
  var errorCallback =
      goog.bind(this.stopLockRefreshAndAbort_, this, docId, transaction);
  var lockStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.DOCUMENT_LOCKS);
  var lockAvailableCallback = goog.bind(this.writeLockIfAvailable_, this, docId,
      lockStore, lockAcquisitionResultCallback, errorCallback);
  this.readLock_(docId, lockAvailableCallback, lockStore,
      true /* ensureCurrentLockHolder */,
      false /* dispatchLockAcquisitionStartedEvent */, errorCallback);
};


/**
 * Handles the result of a lock acquisition attempt when the lock refreshed.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {office.localstore.LockAcquisitionResult} lockAcquisitionResult
 * @private
 */
office.localstore.idb.LockManager.prototype.
    handleLockAcquisitionResultForRefresh_ = function(
        docId, transaction, lockAcquisitionResult) {
  if (lockAcquisitionResult != office.localstore.LockAcquisitionResult.ACQUIRED) {
    this.stopLockRefreshAndAbort_(docId, transaction);
  }
};


/**
 * Stops the lock refresh timer and aborts the given transaction.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.LockManager.prototype.stopLockRefreshAndAbort_ = function(
    docId, transaction) {
  goog.log.info(this.logger_, 'stopLockRefreshAndAbort_(docId: ' + docId + ')');
  this.stopLockRefresh_();
  transaction.abort(
      new office.localstore.LocalStoreError(
          office.localstore.LocalStoreError.Type.LOCK_MISSING,
          ''));
};


/**
 * Reads a document lock from storage and checks whether it is available for
 * this session.
 * @param {string} docId
 * @param {function(boolean, ?number)} lockAvailableCallback The function to
 *     call with a boolean indicating whether the lock is available and a
 *     number with the current expiration time.
 * @param {!office.localstore.idb.ObjectStore} lockStore
 * @param {boolean} ensureCurrentLockHolder Whether to require that the
 *     lock is currently held by this session.
 * @param {boolean} dispatchLockAcquisitionStartedEvent
 * @param {function()=} opt_errorCallback
 * @private
 */
office.localstore.idb.LockManager.prototype.readLock_ = function(docId,
    lockAvailableCallback, lockStore, ensureCurrentLockHolder,
    dispatchLockAcquisitionStartedEvent, opt_errorCallback) {
  var request = lockStore.get([docId]);
  request.setSuccessCallback(goog.bind(this.checkLockAvailable_, this, docId,
      lockAvailableCallback, ensureCurrentLockHolder,
      dispatchLockAcquisitionStartedEvent));
  if (opt_errorCallback) {
    request.setErrorCallback(goog.functions.lock(opt_errorCallback));
  }
};


/**
 * Checks whether the in-storage lock is available.
 * @param {string} docId
 * @param {function(boolean, ?number)} callback The function to call with a
 *     boolean indicating whether the lock is available and the current
 *     expiration time stored for the current session. Null if the lock is not
 *     available or if the previous lock was for another session or did not
 *     exist.
 * @param {boolean} ensureCurrentLockHolder Whether to require that the lock is
 *     currently held by this session.
 * @param {boolean} dispatchLockAcquisitionStartedEvent
 * @param {Event} e The IndexedDB request event.
 * @private
 */
office.localstore.idb.LockManager.prototype.checkLockAvailable_ = function(
    docId, callback, ensureCurrentLockHolder,
    dispatchLockAcquisitionStartedEvent, e) {
  goog.log.fine(this.logger_, 'checkLockAvailable_(docId: ' + docId +
      ', ensureCurrentLockHolder: ' + ensureCurrentLockHolder + ')');

  // If an object is disposed while waiting for success callback, just exit
  // early.
  if (this.isDisposed()) {
    return;
  }

  var result = e.target.result;
  var currentExpirationTime = null;
  if (result) {
    var documentLock =
        office.localstore.idb.DocumentLock.createFromStoreObject(result);
    var lockHoldingSessionId = documentLock.getSessionId();
    if (lockHoldingSessionId == this.sessionId_) {
      currentExpirationTime = documentLock.getExpirationTime();
    }
    if ((ensureCurrentLockHolder && lockHoldingSessionId != this.sessionId_) ||
        !documentLock.isAvailableForSessionId(this.sessionId_)) {
      var now = goog.now();
      var context = {};
      context['sdb'] = this.sessionId_;
      context['sc'] = lockHoldingSessionId;
      context['remaingtime'] = documentLock.getExpirationTime() - now;
      context[''] =
          this.lastWrittenExpirationTime_ - now;
      this.errorReporter_.info(Error('IndexedDB document lock not available'),
          context);
      callback(false /* lockAvailable */, null /* currentExpirationTime */);
      return;
    }
  } else if (ensureCurrentLockHolder) {
    var context = {};
    context['sessionId'] = this.sessionId_;
    this.errorReporter_.info(Error('IndexedDB document lock not available ' +
        'because the lock does not exist'), context);
    callback(false /* lockAvailable */, null /* currentExpirationTime */);
    return;
  }

  if (dispatchLockAcquisitionStartedEvent) {
    this.dispatchEvent(office.localstore.DocumentLockCapability.EventType.
        DOCUMENT_LOCK_ACQUISITION_STARTED);
  }
  callback(true /* lockAvailable */, currentExpirationTime);
};


/**
 * Acquires the document lock by writing a new lock to storage if the lock was
 * available.
 * @param {string} docId
 * @param {!office.localstore.idb.ObjectStore} lockStore
 * @param {function(office.localstore.LockAcquisitionResult)} resultCallback The
 *     function called with the result of the lock acquisition.
 * @param {?function()} errorCallback
 * @param {boolean} lockAvailable
 * @param {?number} currentExpirationTime The current expiration time stored for
 *     the current session. Null if the lock is not available or if the previous
 *     lock was for another session or did not exist.
 * @private
 */
office.localstore.idb.LockManager.prototype.writeLockIfAvailable_ = function(
    docId, lockStore, resultCallback, errorCallback, lockAvailable,
    currentExpirationTime) {
  if (lockAvailable) {
    this.writeLock_(
        docId,
        lockStore,
        currentExpirationTime,
        goog.partial(
            resultCallback, office.localstore.LockAcquisitionResult.ACQUIRED),
        errorCallback);
  } else {
    resultCallback(office.localstore.LockAcquisitionResult.UNAVAILABLE);
  }
};


/**
 * Writes the lock to IDB without checking if this session already possesses it.
 * @param {string} docId
 * @param {!office.localstore.idb.ObjectStore} lockStore
 * @param {?number} currentExpirationTime The current expiration time stored for
 *     the current session. Null if the lock is not available or if the previous
 *     lock was for another session or did not exist.
 * @param {function()} successCallback Called when the write succeeded.
 * @param {?function()} errorCallback Called when there was a storage error.
 * @private
 */
office.localstore.idb.LockManager.prototype.writeLock_ = function(
    docId, lockStore, currentExpirationTime, successCallback, errorCallback) {
  goog.log.fine(this.logger_, 'writeLock_(docId: ' + docId + ')');
  var now = goog.now();
  var maxExpirationTime =
      now + office.localstore.idb.DocumentLock.MAX_VALID_LOCK_DURATION;
  var expirationTime = goog.math.clamp(now + this.lockDuration_ /* value */,
      currentExpirationTime || 0 /* min */,
      maxExpirationTime /* max */);
  this.lastWrittenExpirationTime_ = expirationTime;
  var request = lockStore.put(new office.localstore.idb.DocumentLock(
      expirationTime, docId, this.sessionId_).serialize());
  request.setSuccessCallback(goog.functions.lock(successCallback));
  if (errorCallback) {
    request.setErrorCallback(goog.functions.lock(errorCallback));
  }
};


/**
 * @return {boolean} Whether the lock should be periodically refreshed.
 * @private
 */
office.localstore.idb.LockManager.prototype.shouldRefreshLock_ = function() {
  return this.lockDuration_ != 0;
};


/**
 * @return {number} The lock refresh time interval in milliseconds.
 * @private
 */
office.localstore.idb.LockManager.prototype.getLockRefreshTime_ = function() {
  var lockRefreshTime = this.lockDuration_ -
      office.localstore.idb.LockManager.LOCK_REFRESH_DELTA_;
  return Math.max(lockRefreshTime, 0);
};


/**
 * Refreshes the document lock for the given document.
 * @param {string} docId The document id.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.localstore.idb.LockManager.prototype.handleRefreshTimer_ = function(
    docId, e) {
  goog.log.info(this.logger_, 'handleRefreshTimer_()');
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_LOCKS],
      '' /* errorMessage */,
      goog.bind(this.handleRefreshTransactionError_, this),
      true /* opt_allowWrite */);
  this.refreshDocumentLock(docId, transaction);
};


/**
 * Handles a transaction error when refreshing the lock on the timer. Stops the
 * timer and passes theerror on to the lock refresh error callback.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.LockManager.prototype.handleRefreshTransactionError_ =
    function(localStoreError) {
  this.stopLockRefresh_();
  this.lockRefreshErrorCallback_(localStoreError);
};


/**
 * Stops the lock refresh timer.
 * @private
 */
office.localstore.idb.LockManager.prototype.stopLockRefresh_ = function() {
  goog.dispose(this.refreshTimer_);
  this.refreshTimer_ = null;
};


/**
 * Synchronously releases all locks held by the current session.
 */
office.localstore.idb.LockManager.prototype.releaseAllLocks = function() {
  goog.log.info(this.logger_, 'releaseAllLocks()');
  this.stopLockRefresh_();

  var store = /** @type {Storage} */ (window.localStorage);
  if (store) {
    store.setItem(
        office.localstore.idb.DocumentLock.WEB_STORAGE_PREFIX + this.sessionId_,
        String(goog.now()));
  }
};


/** @override */
office.localstore.idb.LockManager.prototype.disposeInternal = function() {
  this.eventHandler_.dispose();
  goog.dispose(this.refreshTimer_);
  goog.base(this, 'disposeInternal');
};
