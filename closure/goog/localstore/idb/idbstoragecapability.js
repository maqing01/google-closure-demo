/**
 * @fileoverview The interface for all IDB storage capabilities.

 */

goog.provide('office.localstore.idb.IdbStorageCapability');

goog.require('office.localstore.StorageCapability');



/**
 * The interface for a storage capability. The interface should be implemented
 * by features that require offline storage support.
 * @interface
 * @extends {office.localstore.StorageCapability}
 */
office.localstore.idb.IdbStorageCapability = function() {};


/**
 * @param {!office.localstore.Operation} operation
 * @return {!Array.<office.localstore.idb.StoreName>} The object store names for
 *     the specified operation. Implementors should throw an error if the record
 *     type isn't supported by the capability.
 */
office.localstore.idb.IdbStorageCapability.prototype.
    getObjectStoreNamesForOperation = goog.abstractMethod;


/**
 * Performs the specified operation.
 * @param {!office.localstore.Operation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 */
office.localstore.idb.IdbStorageCapability.prototype.performOperation =
    goog.abstractMethod;
