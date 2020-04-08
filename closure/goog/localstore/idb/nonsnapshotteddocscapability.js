/**
 * @fileoverview The capability used to track non-snapshotted documents using an
 * IndexedDB database.


 */

goog.provide('office.localstore.idb.NonSnapshottedDocsCapability');

goog.require('office.localstore.NonSnapshottedDocsCapability');



/**
 * The capability used to track non-snapshotted documents using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.NonSnapshottedDocsCapability}
 */
office.localstore.idb.NonSnapshottedDocsCapability = function(
    db, storageObjectReaderWriter) {
  goog.base(this);
  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * The object used for reading and writing LocalStore data to IndexedDB.
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;
};
goog.inherits(office.localstore.idb.NonSnapshottedDocsCapability,
    office.localstore.NonSnapshottedDocsCapability);


/**
 * The data types for the ProfileData store.
 * @type {string}
 */
office.localstore.idb.NonSnapshottedDocsCapability.PROFILE_DATA_TYPE =
    '';


/** @override*/
office.localstore.idb.NonSnapshottedDocsCapability.prototype.
    pushNonSnapshottedDocumentId = function(
        documentId, resultCallback, opt_errorCallback) {
  this.storageObjectReaderWriter_.pushProfileDataDocumentId(this.db_,
      office.localstore.idb.NonSnapshottedDocsCapability.PROFILE_DATA_TYPE,
      documentId, resultCallback, opt_errorCallback);
};


/** @override*/
office.localstore.idb.NonSnapshottedDocsCapability.prototype.
    removeNonSnapshottedDocumentIds = function(
        documentIds, resultCallback, opt_errorCallback) {
  this.storageObjectReaderWriter_.removeProfileDataDocumentIds(this.db_,
      office.localstore.idb.NonSnapshottedDocsCapability.PROFILE_DATA_TYPE,
      documentIds, resultCallback, opt_errorCallback);
};
