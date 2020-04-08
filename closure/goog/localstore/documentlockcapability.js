goog.provide('office.localstore.DocumentLockCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('goog.events');



/**
 * Base class that hosts the public APIs used to to acquire and release
 * documents locks.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DocumentLockCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.DocumentLockCapability,
    office.localstore.AbstractStorageCapability);


/**
 * Event types dispatched by the document lock capability.
 * @enum {string}
 */
office.localstore.DocumentLockCapability.EventType = {
  // Indicates that it is safe to ready the document and pending queue records
  // to allow for more parallelization during initial load, but the event
  // dispatch isn't guaranteed.
  DOCUMENT_LOCK_ACQUISITION_STARTED:
      goog.events.getUniqueId('document_lock_started')
};


/** @override */
office.localstore.DocumentLockCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [];
};


/**
 * Attempts to acquire the document lock for the given document ID. Multiple
 * calls are allowed. This method might dispatch a
 * DOCUMENT_LOCK_ACQUISITION_STARTED event when it is safe to ready the document
 * and pending queue records to allow for more parallelization during initial
 * load, but the event dispatch isn't guaranteed.
 * @param {string} docId
 * @param {function(office.localstore.LockAcquisitionResult)} resultCallback The
 *     function to call with the result of the lock acquisition.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback The
 *     function to call when there was a storage error.
 */
office.localstore.DocumentLockCapability.prototype.acquireDocumentLock =
    goog.abstractMethod;


/**
 * Synchronously releases all locks held by the current session.
 */
office.localstore.DocumentLockCapability.prototype.releaseAllLocks =
    goog.abstractMethod;
