/**
 * @fileoverview Concrete implementation of the docos capability using an
 * IndexedDB database at version 5.


 */

goog.provide('office.localstore.idb.V5DocosCapability');

goog.require('office.localstore.idb.DocosCapability');



/**
 * Concrete implementation of the docos capability using an IndexedDB database
 * at version 5.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.idb.DocosCapability}
 */
office.localstore.idb.V5DocosCapability = function(
    db, idbUtil, storageObjectReaderWriter) {
  goog.base(this, db, idbUtil, storageObjectReaderWriter);
};
goog.inherits(office.localstore.idb.V5DocosCapability,
    office.localstore.idb.DocosCapability);


/**
 * The data type for the ProfileData store.
 * @type {string}
 */
office.localstore.idb.V5DocosCapability.PROFILE_DATA_TYPE = 'unknownddid';


/** @override*/
office.localstore.idb.V5DocosCapability.prototype.pushMissingDocosDocumentId =
    function(documentId, resultCallback, opt_errorCallback) {
  this.getStorageObjectReaderWriter().pushProfileDataDocumentId(this.getDb(),
      office.localstore.idb.V5DocosCapability.PROFILE_DATA_TYPE, documentId,
      resultCallback, opt_errorCallback);
};


/** @override*/
office.localstore.idb.V5DocosCapability.prototype.removeMissingDocosDocumentIds =
    function(documentIds, resultCallback, opt_errorCallback) {
  this.getStorageObjectReaderWriter().removeProfileDataDocumentIds(this.getDb(),
      office.localstore.idb.V5DocosCapability.PROFILE_DATA_TYPE, documentIds,
      resultCallback, opt_errorCallback);
};
