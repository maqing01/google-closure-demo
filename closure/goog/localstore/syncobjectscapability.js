goog.provide('office.localstore.SyncObjectsCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');



/**
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.SyncObjectsCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.SyncObjectsCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.SyncObjectsCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.SYNC_OBJECT];
};


/**
 * Gets an array of all SyncObjects in storage.
 * @param {function(!Array.<!office.localstore.SyncObject>)} resultCallback A
 *     function which will be called asynchronously to report the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     A callback for handling errors.
 */
office.localstore.SyncObjectsCapability.prototype.getAllSyncObjects =
    goog.abstractMethod;


/** @override */
office.localstore.SyncObjectsCapability.prototype.getKeyForRecord =
    function(record) {
  var syncObject = /** @type {!office.localstore.SyncObject} */ (record);
  return record.getKeyPath();
};


/** @override */
office.localstore.SyncObjectsCapability.prototype.isOperationSupported =
    function(operation) {
  return goog.base(this, 'isOperationSupported', operation) &&
      operation.getType() == office.localstore.Operation.Type.UPDATE_RECORD &&
          (/** @type {!office.localstore.UpdateRecordOperation} */ (operation)).
              isNew();
};
