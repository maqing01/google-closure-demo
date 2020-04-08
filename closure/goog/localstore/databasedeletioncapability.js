goog.provide('office.localstore.DatabaseDeletionCapability');

goog.require('office.localstore.AbstractStorageCapability');



/**
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DatabaseDeletionCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.DatabaseDeletionCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.DatabaseDeletionCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [];
};


/**
 * Deletes all data from storage. After this is called, no more
 * local store calls are allowed.
 * @param {function()} completionCallback A function which will be called
 *     asynchronously once the deletion is complete.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DatabaseDeletionCapability.prototype.deleteAllData =
    goog.abstractMethod;


/** @override */
office.localstore.DatabaseDeletionCapability.prototype.
    createOperationsForRecordInternal = function(
    record, opt_nullableProperties) {
  throw Error('No operation is supported.');
};


/** @override */
office.localstore.DatabaseDeletionCapability.prototype.getKeyForRecord =
    function(record) {
  throw Error('No record is supported.');
};


/** @override */
office.localstore.DatabaseDeletionCapability.prototype.isOperationSupported =
    function(operation) {
  return false;
};
