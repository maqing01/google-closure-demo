goog.provide('office.localstore.StorageCapability');



/**
 * @interface
 */
office.localstore.StorageCapability = function() {};


/**
 * The possible types of keys supported in localstore.
 * @typedef {number|string|!Array}
 */
office.localstore.StorageCapability.KeyType;


/**
 * @return {!Array.<office.localstore.Record.Type>} The record types supported by
 *     this capability.
 */
office.localstore.StorageCapability.prototype.getSupportedRecordTypes =
    goog.abstractMethod;


/**
 * Examines the specified record and determines which operations, if any, need
 * to be performed to update or delete the record in storage.
 * @param {!office.localstore.Record} record The record to be written.
 * @return {!Array.<!office.localstore.Operation>} The operations to perform in
 *     order to write this record.
 */
office.localstore.StorageCapability.prototype.createOperationsForRecord =
    goog.abstractMethod;


/**
 * Returns a unique key to identify the specified record in storage. This
 * is done at the capability level rather than in the record itself because
 * different storage implementations may choose to structure their keys
 * differently. Null should only be returned to signify that the key is for a
 * singleton record.
 * @param {!office.localstore.Record} record
 * @return {?office.localstore.StorageCapability.KeyType}
 */
office.localstore.StorageCapability.prototype.getKeyForRecord =
    goog.abstractMethod;
