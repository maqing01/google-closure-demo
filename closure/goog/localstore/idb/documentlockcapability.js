goog.provide('office.localstore.idb.DocumentLockCapability');

goog.require('office.localstore.DocumentLockCapability');
goog.require('office.localstore.DocumentLockRequirement');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.LockManager');
goog.require('office.localstore.idb.StoreName');



/**
 * @param {!office.localstore.idb.DocsDatabase} db The database.
 * @param {string} sessionId The session ID to use for locking.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. If non-zero, the lock will
 *     be refreshed automatically before it expires.
 * @param {!office.debug.ErrorReporterApi} errorReporter An error reporter.
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentLockCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DocumentLockCapability = function(
    db, sessionId, lockDuration, errorReporter) {
  goog.base(this);

  /** @private {!office.localstore.idb.DocsDatabase} */
  this.db_ = db;

  /** @private {!office.localstore.idb.LockManager} */
  this.lockManager_ = new office.localstore.idb.LockManager(sessionId,
      lockDuration, db, errorReporter,
      this.db_.getErrorCallback() /* lockRefreshErrorCallback */);
  this.lockManager_.setParentEventTarget(this);
};
goog.inherits(office.localstore.idb.DocumentLockCapability,
    office.localstore.DocumentLockCapability);


/** @override */
office.localstore.idb.DocumentLockCapability.prototype.acquireDocumentLock =
    function(docId, resultCallback, opt_errorCallback) {
  this.lockManager_.acquireDocumentLock(
      docId, resultCallback, opt_errorCallback);
};


/** @override */
office.localstore.idb.DocumentLockCapability.prototype.releaseAllLocks =
    function() {
  this.lockManager_.releaseAllLocks();
};


/** @override */
office.localstore.idb.DocumentLockCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.DOCUMENT_LOCKS];
};


/** @override */
office.localstore.idb.DocumentLockCapability.prototype.performOperation =
    function(operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.DOCUMENT_LOCK:
      var lockOperation = /** @type {!office.localstore.DocumentLockOperation} */
          (operation);
      switch (lockOperation.getLevel()) {
        case office.localstore.DocumentLockRequirement.Level.OWNER:
          this.lockManager_.refreshDocumentLock(
              lockOperation.getDocId(), transaction);
          break;
        case office.localstore.DocumentLockRequirement.Level.AVAILABLE:
          this.lockManager_.ensureDocumentLockAvailable(
              lockOperation.getDocId(), transaction);
          break;
      }
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/** @override */
office.localstore.idb.DocumentLockCapability.prototype.disposeInternal =
    function() {
  this.lockManager_.dispose();

  goog.base(this, 'disposeInternal');
};
