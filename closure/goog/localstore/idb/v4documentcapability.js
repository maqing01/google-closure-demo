goog.provide('office.localstore.idb.V4DocumentCapability');

goog.require('office.localstore.Comment');
goog.require('office.localstore.Document');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.DocumentCapability');
goog.require('office.localstore.idb.IndexName');
goog.require('office.localstore.idb.StoreName');



/**
 * Concrete implementation of document capability for version 4 of the schema,
 * based on IndexedDB.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.DocumentCapability}
 */
office.localstore.idb.V4DocumentCapability = function(
    db, idbUtil, storageObjectReaderWriter, documentAdapters) {
  goog.base(this, db, idbUtil, storageObjectReaderWriter, documentAdapters);
};
goog.inherits(office.localstore.idb.V4DocumentCapability,
    office.localstore.idb.DocumentCapability);


/**
 * Array index for docId element in the comments state index key path.
 * @type {number}
 */
office.localstore.idb.V4DocumentCapability.COMMENTS_STATE_INDEX_FOR_DOCID = 1;


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.createDocumentFromStore =
    function(userId, obj) {
  var doc = goog.base(this, 'createDocumentFromStore', userId, obj);
  if (!doc) {
    return null;
  }
  doc.setDocosKeyData(obj[office.localstore.Document.Property_v4.
      DOCOS_KEY_DATA] || null);
  doc.setIsCreated(
      !obj[office.localstore.Document.Property_v4.IS_NOT_CREATED]);
  var lastModifiedClientTimestamp =
      obj[office.localstore.Document.Property_v4.
          LAST_MODIFIED_CLIENT_TIMESTAMP];
  if (goog.isDefAndNotNull(lastModifiedClientTimestamp)) {
    doc.setLastModifiedClientTimestamp(lastModifiedClientTimestamp);
  }
  return doc;
};


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.
    readDocumentsWithPendingComments = function(
        resultCallback, opt_errorCallback) {
  var transaction = this.getDb().openTransaction(
      [office.localstore.idb.StoreName.COMMENTS,
       office.localstore.idb.StoreName.DOCUMENTS],
      'Error reading comments.', opt_errorCallback);
  this.getIdbUtil().iterateIdbCursor(
      transaction,
      office.localstore.idb.StoreName.COMMENTS,
      function(key) {
        return key[office.localstore.idb.V4DocumentCapability.
            COMMENTS_STATE_INDEX_FOR_DOCID];
      },
      goog.bind(this.loadDocuments, this, transaction, resultCallback),
      [office.localstore.Comment.State.DIRTY],
      [office.localstore.Comment.State.DIRTY, []],
      office.localstore.idb.IndexName.COMMENTS_STATE,
      false /* opt_reverse */,
      true /* opt_keyedCursor */);
};


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  var storeNames =
      goog.base(this, 'getObjectStoreNamesForOperation', operation);
  if (operation.getType() == office.localstore.Operation.Type.DELETE_RECORD) {
    storeNames.push(office.localstore.idb.StoreName.COMMENTS);
  }
  return storeNames;
};


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.updateDocument = function(
    operation, documentStore) {
  this.getStorageObjectReaderWriter().saveModifications(
      operation.getKey(), operation.getModifications(), documentStore,
      [office.localstore.Document.Property_v4.LAST_MODIFIED_CLIENT_TIMESTAMP]
      /* opt_nullableProperties */);
};


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.hasPendingChanges =
    function(docId, transaction, resultCallback) {
  goog.base(this, 'hasPendingChanges', docId, transaction,
      goog.bind(function(hasPendingChanges) {
        if (hasPendingChanges) {
          resultCallback(true);
        } else {
          this.hasPendingComments_(docId, transaction, resultCallback);
        }
      }, this));
};


/**
 * Checks whether there are pending comments.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {function(boolean)} resultCallback The function to call with a boolean
 *      indicating whether there are pending changes.
 * @private
 */
office.localstore.idb.V4DocumentCapability.prototype.hasPendingComments_ =
    function(docId, transaction, resultCallback) {
  var store =
      transaction.getObjectStore(office.localstore.idb.StoreName.COMMENTS);
  var index = store.getIndex(office.localstore.idb.IndexName.COMMENTS_STATE);
  var request = index.get([office.localstore.Comment.State.DIRTY, docId]);
  request.setSuccessCallback(function(e) {
    resultCallback(!!e.target.result);
  });
};


/** @override */
office.localstore.idb.V4DocumentCapability.prototype.deleteDocumentInternal =
    function(operation, transaction) {
  goog.base(this, 'deleteDocumentInternal', operation, transaction);

  var docId = operation.getKey();

  // Delete all comments.
  var commentsStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.COMMENTS);
  this.getIdbUtil().deleteFromStore(commentsStore, [docId], [docId, []]);
};
