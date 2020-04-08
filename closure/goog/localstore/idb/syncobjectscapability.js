goog.provide('office.localstore.idb.SyncObjectsCapability');

goog.require('office.localstore.Operation');
goog.require('office.localstore.SyncObject');
goog.require('office.localstore.SyncObjectsCapability');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');



/**
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @constructor
 * @struct
 * @extends {office.localstore.SyncObjectsCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.SyncObjectsCapability = function(db, idbUtil) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;
};
goog.inherits(office.localstore.idb.SyncObjectsCapability,
    office.localstore.SyncObjectsCapability);


/**
 * Returns a SyncObject from the storage representation.
 * @param {!Object} obj The storage object.
 * @return {!office.localstore.SyncObject} syncObject The sync object.
 * @private
 */
office.localstore.idb.SyncObjectsCapability.prototype.createSyncObjectFromStore_ =
    function(obj) {
  var data = obj[office.localstore.SyncObject.Property.DATA];
  var keyPath = obj[office.localstore.SyncObject.Property.KEYPATH];
  var state = obj[office.localstore.SyncObject.Property.STATE];

  var syncObject = new office.localstore.SyncObject(
      false /* isNew */, keyPath, state);
  syncObject.setData(data);
  syncObject.markAsInitialized();
  return syncObject;
};


/** @override */
office.localstore.idb.SyncObjectsCapability.prototype.getAllSyncObjects =
    function(resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.SYNC_OBJECTS],
      'Error reading SyncObjects.', opt_errorCallback);
  this.idbUtil_.iterateIdbCursor(
      transaction,
      office.localstore.idb.StoreName.SYNC_OBJECTS,
      goog.bind(this.createSyncObjectFromStore_, this),
      resultCallback,
      undefined /* opt_lowerBound */,
      undefined /* opt_upperBound */,
      undefined /* opt_index */,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/** @override */
office.localstore.idb.SyncObjectsCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.SYNC_OBJECTS];
};


/** @override */
office.localstore.idb.SyncObjectsCapability.prototype.performOperation =
    function(operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateRecordOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      this.writeSyncObject_(updateRecordOperation,
          transaction.getObjectStore(
              office.localstore.idb.StoreName.SYNC_OBJECTS));
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Writes a SyncObject to the store.
 * @param {!office.localstore.UpdateRecordOperation} updateRecordOperation
 * @param {!office.localstore.idb.ObjectStore} syncObjectStore The SyncObject
 *     object store.
 * @private
 */
office.localstore.idb.SyncObjectsCapability.prototype.writeSyncObject_ = function(
    updateRecordOperation, syncObjectStore) {
  if (updateRecordOperation.isNew()) {
    syncObjectStore.put(updateRecordOperation.getModifications());
  } else {
    //  Add when implementing read/write SyncObjects.
    throw Error('SyncObject update is not implemented.');
  }
};
