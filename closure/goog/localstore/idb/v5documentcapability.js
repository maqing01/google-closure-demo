goog.provide('office.localstore.idb.V5DocumentCapability');

goog.require('office.localstore.idb.NonSnapshottedDocsCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.V4DocumentCapability');
goog.require('office.localstore.idb.V5DocosCapability');



/**
 * Concrete implementation of document capability for version 5 of the schema,
 * based on IndexedDB.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.V4DocumentCapability}
 */
office.localstore.idb.V5DocumentCapability = function(
    db, idbUtil, storageObjectReaderWriter, documentAdapters) {
  goog.base(this, db, idbUtil, storageObjectReaderWriter, documentAdapters);
};
goog.inherits(office.localstore.idb.V5DocumentCapability,
    office.localstore.idb.V4DocumentCapability);


/**
 * The data types for the ProfileData store.
 * @type {string}
 * @private
 */
office.localstore.idb.V5DocumentCapability.PROFILE_DATA_TYPE_ =
    'unknownddid';


/** @override */
office.localstore.idb.V5DocumentCapability.prototype.readNonSnapshottedDocuments =
    function(resultCallback, opt_errorCallback) {
  this.getProfileDataDocuments_(
      office.localstore.idb.NonSnapshottedDocsCapability.PROFILE_DATA_TYPE,
      resultCallback, opt_errorCallback);
};


/** @override */
office.localstore.idb.V5DocumentCapability.prototype.readMissingDocosDocuments =
    function(resultCallback, opt_errorCallback) {
  this.getProfileDataDocuments_(
      office.localstore.idb.V5DocumentCapability.PROFILE_DATA_TYPE_,
      resultCallback, opt_errorCallback);
};


/**
 * Gets documents whose document IDs are stored the ProfileData store.
 * @param {string} dataType The data type in the ProfileData store.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback The
 *     result callback.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 * @private
 */
office.localstore.idb.V5DocumentCapability.prototype.getProfileDataDocuments_ =
    function(dataType, resultCallback, opt_errorCallback) {
  var transaction = this.getDb().openTransaction([
    office.localstore.idb.StoreName.DOCUMENTS,
    office.localstore.idb.StoreName.PROFILE_DATA
  ], 'Error reading document ids', opt_errorCallback);

  var capability = this;
  this.getStorageObjectReaderWriter().readProfileDataDocumentIds(
      capability.getDb(), dataType,
      function(storedIds) {
        capability.loadDocuments(transaction, resultCallback, storedIds);
      } /* readCallback */,
      transaction);
};


/** @override */
office.localstore.idb.V5DocumentCapability.prototype.deleteDocumentInternal =
    function(operation, transaction) {
  goog.base(this, 'deleteDocumentInternal', operation, transaction);

  var docId = operation.getKey();

  this.getStorageObjectReaderWriter().removeProfileDataDocumentIds(this.getDb(),
      office.localstore.idb.NonSnapshottedDocsCapability.PROFILE_DATA_TYPE,
      [docId], goog.nullFunction);

  this.getStorageObjectReaderWriter().removeProfileDataDocumentIds(this.getDb(),
      office.localstore.idb.V5DocosCapability.PROFILE_DATA_TYPE, [docId],
      goog.nullFunction);
};
