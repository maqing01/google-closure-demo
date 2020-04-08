goog.provide('office.localstore.idb.DocumentCapability');

goog.require('office.localstore.Document');
goog.require('office.localstore.DocumentCapability');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.PendingQueueStorageObject');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.unsavedChangesBit');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.log');
goog.require('goog.object');



/**
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @param {!Object.<string, !office.localstore.DocumentAdapter>} documentAdapters
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DocumentCapability = function(
    db, idbUtil, storageObjectReaderWriter, documentAdapters) {
  goog.base(this, documentAdapters);

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

  /**
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;
};
goog.inherits(office.localstore.idb.DocumentCapability,
    office.localstore.DocumentCapability);


/**
 * @type {goog.log.Logger}
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.logger =
    goog.log.getLogger('office.localstore.DocumentCapability');


/**
 * The key of the document commands metadata and companion staging object
 * stores.
 * @type {string}
 */
office.localstore.idb.DocumentCapability.DOCUMENT_COMMANDS_METADATA_KEY_NAME =
    'mpath';


/**
 * @return {!office.localstore.idb.DocsDatabase}
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.getDb = function() {
  return this.db_;
};


/**
 * @return {!office.localstore.idb.DatabaseUtil}
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.getIdbUtil = function() {
  return this.idbUtil_;
};


/**
 * @return {!office.localstore.idb.StorageObjectReaderWriter}
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.getStorageObjectReaderWriter =
    function() {
  return this.storageObjectReaderWriter_;
};


/**
 * Gets the document id from an object stored in the DocumentCommandsMetadata or
 * DocumentCommandsMetadataStaging object stores.
 * @param {!Object} obj The object from the commands metadata or staging store.
 * @return {string} The document id.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.
    getDocIdForCommandsMetadataEntry_ = function(obj) {
  return obj[
      office.localstore.idb.DocumentCapability.
          DOCUMENT_COMMANDS_METADATA_KEY_NAME][0];
};


/**
 * Fetches some document objects.
 * @param {?string} userId If set, restricts to documents accessible to this
 *     user.
 * @param {?string} docId If set, restricts to only the document with the given
 *     id.
 * @param {boolean} requireFullySynced Whether to return data if the
 *     document to be returned has a stored document record but only staged
 *     model data.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.readDocuments_ = function(
    userId, docId, requireFullySynced, resultCallback, opt_errorCallback) {
  if (this.db_.hasVersionChanged()) {
    // Since this is used during startup, make sure the callback is called
    // asynchronously.
    goog.Timer.callOnce(goog.partial(resultCallback, [] /* documents */));
    return;
  }

  var transaction = this.db_.openTransaction([
    office.localstore.idb.StoreName.DOCUMENTS,
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA,
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING
  ], '.', opt_errorCallback);

  var abandonTransactionAndResultCallback = function(result) {
    transaction.abandon();
    resultCallback(result);
  };

  if (requireFullySynced) {
    this.readFullySyncedDocuments_(
        userId, docId, abandonTransactionAndResultCallback, transaction);
  } else {
    this.retrieveDocumentsFromStore_(userId, docId,
        abandonTransactionAndResultCallback,
        transaction, {} /* documentsToIgnore */,
        false /* ignoreDocumentsWithPartialModelData */);
  }
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.
    readDocumentsWithPendingChanges = function(
        resultCallback, opt_errorCallback) {
  goog.log.fine(this.logger, 'readDocumentsWithPendingChanges()');
  if (this.db_.hasVersionChanged()) {
    // To mirror the success/failure cases below, callback asynchronously.
    goog.Timer.callOnce(goog.partial(resultCallback, [] /* documents */));
    return;
  }

  var transaction = this.db_.openTransaction([
    office.localstore.idb.StoreName.DOCUMENTS,
    office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS
  ], 'Error reading documents with pending changes.', opt_errorCallback);

  //  Consider adding an index on DocId to improve performance.
  this.idbUtil_.iterateIdbCursor(transaction,
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS,
      function(obj) {
        var CommandKey =
            office.localstore.idb.PendingQueueStorageObject.CommandKey;
        var commands = obj[CommandKey.COMMANDS];
        // This shouldn't happen in practice, but if there are any entries which
        // have no actual commands, make sure those are not considered for
        // bulk syncing.
        if (!commands || commands.length == 0) {
          return null;
        }
        var CommandKeyIndex =
            office.localstore.idb.PendingQueueStorageObject.CommandKeyIndex;
        return obj[CommandKey.KEY][CommandKeyIndex.DOC_ID];
      },
      goog.bind(this.loadDocuments, this, transaction, resultCallback));
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.readDocumentsByUser = function(
    userId, resultCallback, opt_errorCallback) {
  this.readDocuments_(userId, null /* docId */,
      true /* requireFullySynced */, resultCallback, opt_errorCallback);
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.readDocument = function(docId,
    requireFullySynced, resultCallback, opt_errorCallback) {
  this.readDocuments_(null /* userId */, docId, requireFullySynced,
      function(documents) {
        if (documents.length == 1) {
          resultCallback(documents[0]);
        } else {
          goog.asserts.assert(documents.length == 0,
              'Querying for a document by id returned multiple results');
          resultCallback(null);
        }
      },
      opt_errorCallback);
};


/**
 * Loads the given documents from storage.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback Callback
 *     to deliver the list of documents. The list of documents might be ordered
 *     differently than the given list of document IDs, and will not contain any
 *     duplicates.
 * @param {!Array.<string>} docIds The documents to read.
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.loadDocuments = function(
    transaction, resultCallback, docIds) {
  if (docIds.length <= 0) {
    resultCallback([] /* documents */);
    return;
  }
  goog.array.removeDuplicates(docIds);

  var loadedDocuments = [];
  for (var i = 0; i < docIds.length; i++) {
    var docId = docIds[i];

    this.idbUtil_.iterateIdbCursor(transaction,
        office.localstore.idb.StoreName.DOCUMENTS,
        goog.bind(this.createAndReadDocumentFromStore_, this, null /* userId */,
            {} /* documentsToIgnore */,
            false /* ignoreDocumentsWithPartialModelData */),
        function(results) {
          // The list of results could be empty if
          // createAndReadDocumentFromStore_ returns null.
          goog.asserts.assert(results.length <= 1,
              'Atmost one document should have been read.');
          if (results.length > 0) {
            loadedDocuments.push(results[0]);
          }
        },
        docId /* opt_lowerBound */
    );
  }
  transaction.setCompletionCallback(function() {
    resultCallback(loadedDocuments);
  });
};


/**
 * Reads documents in local storage, filtering out any document that might be
 * actively staged.
 * @param {?string} userId If set, restricts to documents accessible to this
 *     user.
 * @param {?string} docId If set, restricts to only the document with the given
 *     id.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the list of documents.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.readFullySyncedDocuments_ =
    function(userId, docId, resultCallback, transaction) {
  // We want to prevent the user from seeing documents which have incomplete
  // data locally. This case arises when the user opens a document that is not
  // synced locally, for the first time. We write the entries to the Documents
  // store so that the document shows up in the launcher. But the data entries
  // for the document are written in the staging table (currently only true for
  // Trix) until all the the data for the document is available on the client.
  // Note that it is ok to show a document in the launcher even if it has
  // staging table entries if it has entries in the main tables as well since
  // that indicates that we have an outdated but complete data for it. We do
  // this by creating a set of all doc ids which exist in the commands metadata
  // staging store without a corresponding entry in the commands metadata store.
  var documentsWithMetadata = {};
  var metadataStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA);
  var request = this.idbUtil_.getCursorRequest(
      metadataStore,
      docId ? [docId] : undefined,
      docId ? [docId, []] : undefined);
  request.setSuccessCallback(goog.bind(this.handleCommandsMetadataRead_, this,
      userId, docId, resultCallback, transaction, documentsWithMetadata));
};


/**
 * Handles reading the document commands metadata object store by accumulating
 * all document ids which have a complete set of commands available in local
 * storage.
 * @param {?string} userId If set, restricts to documents accessible to this
 *     user.
 * @param {?string} docId If set, restricts to only the document with the given
 *     id.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the list of documents.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @param {!Object.<boolean>} documentsWithMetadata A set of document ids that
 *     contain a complete row of metadata.
 * @param {Event} e The success event.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.handleCommandsMetadataRead_ =
    function(
        userId, docId, resultCallback, transaction, documentsWithMetadata, e) {
  var cursorRequest = e.target;
  office.localstore.idb.DatabaseUtil.verifyRequestDone(cursorRequest);
  var cursor = cursorRequest.result;
  if (cursor) {
    var cursorDocId = this.getDocIdForCommandsMetadataEntry_(
        cursor.value);
    documentsWithMetadata[cursorDocId] = true;
    cursor['continue']();
  } else {
    var metadataStagingStore = transaction.getObjectStore(
        office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING);
    var request = this.idbUtil_.getCursorRequest(
        metadataStagingStore,
        docId ? [docId] : undefined,
        docId ? [docId, []] : undefined);
    var stagedDocuments = {};
    request.setSuccessCallback(goog.bind(
        this.handleDocumentsMetadataStagingRead_, this, userId, docId,
        resultCallback, transaction, stagedDocuments, documentsWithMetadata));
  }
};


/**
 * Handles reading the document commands metadata staging object store by
 * accumulating a set of document ids which are currently being staged which
 * have no complete set of commands available in local storage.
 * @param {?string} userId If set, restricts to documents accessible to this
 *     user.
 * @param {?string} docId If set, restricts to only the document with the given
 *     id.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the list of documents.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @param {!Object.<boolean>} stagedDocuments A set of document ids that contain
 *     staging entries with no entries in the commands metadata store.
 * @param {!Object.<boolean>} documentsWithMetadata A set of document ids that
 *     contain a complete row of metadata.
 * @param {Event} e The success event.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.
    handleDocumentsMetadataStagingRead_ = function(userId, docId,
        resultCallback, transaction, stagedDocuments, documentsWithMetadata,
        e) {
  var cursorRequest = e.target;
  office.localstore.idb.DatabaseUtil.verifyRequestDone(cursorRequest);
  var cursor = cursorRequest.result;
  if (cursor) {
    var cursorDocId = this.getDocIdForCommandsMetadataEntry_(
        cursor.value);
    if (!documentsWithMetadata[cursorDocId]) {
      stagedDocuments[cursorDocId] = true;
    }
    cursor['continue']();
  } else {
    this.retrieveDocumentsFromStore_(userId, docId, resultCallback, transaction,
        stagedDocuments /* documentsToIgnore */,
        true /* ignoreDocumentsWithPartialModelData */);
  }
};


/**
 * Reads documents from storage.
 * @param {?string} userId If set, and this document is not accessible to the
 *     given user, this method will return null.
 * @param {?string} docId Restricts to only the document with the given id.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the list of documents.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @param {!Object.<boolean>} documentsToIgnore A set of document ids that
 *     signify that the document should not be read. Typically, this will be a
 *     set of staging entries with no entries in the commands metadata store.
 * @param {boolean} ignoreDocumentsWithPartialModelData Whether to ignore
 *     documents that have only partial model data available.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.retrieveDocumentsFromStore_ =
    function(userId, docId, resultCallback, transaction, documentsToIgnore,
        ignoreDocumentsWithPartialModelData) {
  if (docId) {
    var request = transaction.getObjectStore(
        office.localstore.idb.StoreName.DOCUMENTS).get(docId);
    request.setSuccessCallback(goog.bind(
        function(e) {
          var obj = e.target.result;
          if (obj) {
            resultCallback([this.createAndReadDocumentFromStore_(userId,
                documentsToIgnore, ignoreDocumentsWithPartialModelData, obj)]);
          } else {
            resultCallback([] /* documents */);
          }
        }, this));
  } else {
    this.idbUtil_.iterateIdbCursor(transaction,
        office.localstore.idb.StoreName.DOCUMENTS,
        goog.bind(this.createAndReadDocumentFromStore_, this, userId,
            documentsToIgnore, ignoreDocumentsWithPartialModelData),
        resultCallback,
        undefined /* opt_lowerBound */
    );
  }
};


/**
 * Creates a new document record from a stored document object. If a matching
 * document adapter is given, it will be used to read the document.
 * @param {?string} userId If set, and this document is not accessible to the
 *     given user, this method will return null.
 * @param {!Object.<boolean>} documentsToIgnore A set of document ids that
 *     signify that the document should not be read. Typically, this will be a
 *     set of staging entries with no entries in the commands metadata store.
 * @param {boolean} ignoreDocumentsWithPartialModelData Whether to ignore
 *     documents that have only partial model data available.
 * @param {!Object} obj The object from the document store.
 * @return {office.localstore.Document} The new document object, or null if the
 *     document was not accessible to the provided user.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.
    createAndReadDocumentFromStore_ = function(userId, documentsToIgnore,
        ignoreDocumentsWithPartialModelData, obj) {
  if (documentsToIgnore[obj[office.localstore.Document.Property.ID]]) {
    return null;
  }
  if (ignoreDocumentsWithPartialModelData &&
      obj[office.localstore.Document.Property_v6.HAS_PARTIAL_MODEL_DATA_ONLY]) {
    return null;
  }
  var doc = this.createDocumentFromStore(userId, obj);
  if (!doc) {
    return null;
  }
  doc.markAsInitialized();

  var documentAdapter = this.getDocumentAdapters()[doc.getType()];
  if (!documentAdapter) {
    return doc;
  }

  return documentAdapter.readDocument(doc);
};


/**
 * Creates a new document record from a stored document object.
 * @param {?string} userId If set, and this document is not accessible to the
 *     given user, this method will return null.
 * @param {!Object} obj The object from the document store.
 * @return {office.localstore.Document} The new document object, or null if the
 *     document was not accessible to the provided user.
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.createDocumentFromStore =
    function(userId, obj) {
  // Make sure the user has an access level entry in the store. This ensures
  // that SyncStats are not read when reading the documents store. This check
  // can be removed when we stop writing SyncStats entries into the documents
  // store.
  if (goog.isDefAndNotNull(userId) &&
      obj[office.localstore.Document.Property.ACL] &&
          !goog.isDef(obj[office.localstore.Document.Property.ACL][userId])) {
    return null;
  }

  var doc = new office.localstore.Document(
      obj[office.localstore.Document.Property.ID],
      obj[office.localstore.Document.Property.DOCUMENT_TYPE],
      false /* isNew */);
  doc.setTitle(obj[office.localstore.Document.Property.TITLE]);
  doc.setLastSyncedTimestamp(
      obj[office.localstore.Document.Property.LAST_SYNCED_TIMESTAMP]);
  doc.setJobset(obj[office.localstore.Document.Property.JOBSET]);
  doc.setIsFastTrack(!!obj[office.localstore.Document.Property.IS_FAST_TRACK]);
  doc.setLastModifiedServerTimestamp(
      obj[office.localstore.Document.Property_v2.LAST_MODIFIED_SERVER_TIMESTAMP]);
  doc.setLastColdStartedTimestamp(
      obj[office.localstore.Document.Property_v2.LAST_COLD_STARTED_TIMESTAMP]);
  doc.setLastWarmStartedTimestamp(
      obj[office.localstore.Document.Property_v2.LAST_WARM_STARTED_TIMESTAMP]);
  var acl = obj[office.localstore.Document.Property.ACL];
  for (var user in acl) {
    doc.setAccessLevel(user, acl[user]);
  }
  return doc;
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.clearAllStagedRecords =
    function(saveDocIds, opt_completionCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING,
       office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING],
      'Error clearing staged records.', opt_errorCallback,
      true /* opt_allowWrite */);
  if (opt_completionCallback) {
    transaction.setCompletionCallback(opt_completionCallback);
  }

  var commandsStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING);
  var metadataStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING);
  if (saveDocIds.length == 0) {
    // If there are no doc ids to be saved, we want to completely clear all
    // staging stores.
    commandsStagingStore.clear();
    metadataStagingStore.clear();
  } else {
    // Otherwise we have to loop through each staged record in the stores to see
    // if we want to keep the record or not.
    var saveDocIdMap = goog.object.createSet(saveDocIds);
    this.deleteNonMatchingStagingData_(saveDocIdMap, commandsStagingStore);
    this.deleteNonMatchingStagingData_(saveDocIdMap, metadataStagingStore);
  }
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.clearStagedRecords = function(
    docId, opt_completionCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING,
       office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING],
      'Error clearing staged record for doc: ' + docId, opt_errorCallback,
      true /* opt_allowWrite */);
  if (opt_completionCallback) {
    transaction.setCompletionCallback(opt_completionCallback);
  }

  var commandsStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING);
  var metadataStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING);
  this.deleteMatchingStagingData_(docId, commandsStagingStore);
  this.deleteMatchingStagingData_(docId, metadataStagingStore);
};


/**
 * Deletes all objects in the specified object store that match the given docid.
 * @param {string} docId The document id whose staging data will be cleared.
 * @param {!office.localstore.idb.ObjectStore} objectStore The object store. The
 *     store must have an array-based key where the first element in the array
 *     is the doc id.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.deleteMatchingStagingData_ =
    function(docId, objectStore) {
  var request = this.idbUtil_.getCursorRequest(
      objectStore, [docId], [docId, []]);

  // Delete all matching records without excluding any doc ids (since the cursor
  // is already restricted to the given doc id).
  request.setSuccessCallback(goog.bind(
      this.handleDeleteNonMatchingStagingData_, this, {} /* docIdMap */));
};


/**
 * Deletes all objects in the specified object store that do not belong to one
 * of the docids contained in the given map of doc ids.
 * @param {!Object.<boolean>} docIdMap A map of docids to preserve. Any objects
 *     in the objectStore with IDs not in this map will be deleted.
 * @param {!office.localstore.idb.ObjectStore} objectStore The object store. The
 *     store must have an array-based key where the first element in the array
 *     is the doc id.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.deleteNonMatchingStagingData_ =
    function(docIdMap, objectStore) {
  var request = this.idbUtil_.getCursorRequest(objectStore);
  request.setSuccessCallback(
      goog.bind(this.handleDeleteNonMatchingStagingData_, this, docIdMap));
};


/**
 * Handles the on success event of the request to iterate over a
 * staging store for the purposes of clearing out all stale staged objects.
 * @param {!Object.<boolean>} docIdMap A map of docids to preserve. If the
 *     object key in this result's doc ID is not present in this map, it will be
 *     deleted.
 * @param {!Event} e The IDBRequest success event.
 * @private
 */

office.localstore.idb.DocumentCapability.prototype.
    handleDeleteNonMatchingStagingData_ = function(docIdMap, e) {
  var request = e.target;
  office.localstore.idb.DatabaseUtil.verifyRequestDone(request);
  var cursor = request.result;
  if (cursor) {
    var currentKey = cursor.key;
    // The doc id should always be the first element in the key.
    if (!docIdMap[currentKey[0]]) {
      cursor['delete']();
    }
    cursor['continue']();
  }
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.readNonSnapshottedDocuments =
    function(resultCallback, opt_errorCallback) {
  resultCallback([]);
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.readMissingDocosDocuments =
    function(resultCallback, opt_errorCallback) {
  resultCallback([]);
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  if (!this.isOperationSupported(operation)) {
    throw Error('Cannot get object store names for operation type ' +
        operation.getType());
  }

  var storeNames = [
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS,
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING,
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA,
    office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING,
    office.localstore.idb.StoreName.DOCUMENTS
  ];

  if (operation.getType() == office.localstore.Operation.Type.DELETE_RECORD) {
    storeNames = storeNames.concat([
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS,
      office.localstore.idb.StoreName.PENDING_QUEUES
    ]);
  }

  return storeNames;
};


/** @override */
office.localstore.idb.DocumentCapability.prototype.performOperation = function(
    operation, transaction) {
  var documentStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENTS);
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      if (updateOperation.isNew()) {
        this.writeNewDocument(updateOperation, documentStore);
      } else {
        this.updateDocument(updateOperation, documentStore);
      }
      break;
    case office.localstore.Operation.Type.DELETE_RECORD:
      var deleteOperation =
          /** @type {!office.localstore.DeleteRecordOperation} */ (operation);
      this.deleteDocument_(deleteOperation, transaction);
      break;
    default:
      // Delegate all other operations to the appropriate document adapter.
      var documentOperation =
          /** @type {!office.localstore.DocumentOperation} */ (operation);
      var documentAdapter =
          /** @type {!office.localstore.idb.DocumentAdapter} */
          (this.getAdapterForType(documentOperation.getDocType()));
      documentAdapter.performOperation(documentOperation, transaction);
  }
};


/**
 * @param {!office.localstore.UpdateRecordOperation} operation
 * @param  {!office.localstore.idb.ObjectStore} documentStore
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.writeNewDocument = function(
    operation, documentStore) {
  documentStore.add(operation.getModifications());
};


/**
 * @param {!office.localstore.UpdateRecordOperation} operation
 * @param  {!office.localstore.idb.ObjectStore} documentStore
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.updateDocument = function(
    operation, documentStore) {
  this.storageObjectReaderWriter_.saveModifications(
      operation.getKey(), operation.getModifications(), documentStore);
};


/**
 * Deletes a document, including all its related entries in other tables.
 * Ensures that there are no pending changes.
 * @param {!office.localstore.DeleteRecordOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction The transaction.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.deleteDocument_ = function(
    operation, transaction) {
  this.hasPendingChanges(/** @type {string} */ (operation.getKey()),
      transaction,
      goog.bind(function(hasPendingChanges) {
        if (hasPendingChanges) {
          transaction.abort(new office.localstore.LocalStoreError(
              office.localstore.LocalStoreError.Type.DELETION_PREVENTED,
              ''));
        } else {
          this.deleteDocumentInternal(operation, transaction);
        }
      }, this));
};


/**
 * Checks whether there are pending changes.
 * @param {string} docId
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {function(boolean)} resultCallback The function to call with a boolean
 *      indicating whether there are pending changes.
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.hasPendingChanges = function(
    docId, transaction, resultCallback) {
  var request = this.idbUtil_.getCursorRequest(
      transaction.getObjectStore(
          office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS),
      [docId] /* opt_lowerBouind */,
      [docId, []] /* opt_upperBound */);
  request.setSuccessCallback(function(e) {
    resultCallback(!!e.target.result);
  });
};


/**
 * Deletes a document, including all its related entries in other tables.
 * @param {!office.localstore.DeleteRecordOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @protected
 */
office.localstore.idb.DocumentCapability.prototype.deleteDocumentInternal =
    function(operation, transaction) {
  var docId = /** @type {string} */ (operation.getKey());
  goog.log.info(this.logger, 'Deleting document record, id ' + docId);

  // Delete all commands.
  var documentCommandsStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS);
  this.idbUtil_.deleteFromStore(documentCommandsStore, [docId], [docId, []]);

  // Delete all staged commands.
  var documentCommandsStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING);
  this.idbUtil_.deleteFromStore(
      documentCommandsStagingStore, [docId], [docId, []]);

  // Delete metadata.
  var documentCommandsMetadataStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA);
  this.idbUtil_.deleteFromStore(
      documentCommandsMetadataStore, [docId], [docId, []]);

  // Delete metadata staging.
  var documentCommandsMetadataStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING);
  this.idbUtil_.deleteFromStore(
      documentCommandsMetadataStagingStore, [docId], [docId, []]);

  // Delete the pending queue entries.
  this.deletePendingQueueForDoc_(docId, transaction);

  // Delete the document from the Documents store.
  var documentStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENTS);
  this.idbUtil_.deleteFromStore(documentStore, docId);

  // Delete the document lock entry to ensure that existing sessions with an
  // expired lock fail when refreshing the lock.
  var documentLockStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.DOCUMENT_LOCKS);
  this.idbUtil_.deleteFromStore(documentLockStore, [docId]);
};


/**
 * Deletes all pending queue entries for the given doc id.
 * @param {string} docId The document id to delete.
 * @param {!office.localstore.idb.Transaction} transaction The transaction.
 * @private
 */
office.localstore.idb.DocumentCapability.prototype.deletePendingQueueForDoc_ =
    function(docId, transaction) {
  // Delete all pending queue commands for the doc.
  var pendingQueueCommandsStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  this.idbUtil_.deleteFromStore(
      pendingQueueCommandsStore, [docId], [docId, []]);

  // Delete pending queue for doc.
  var pendingQueuesStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUES);
  this.idbUtil_.deleteFromStore(pendingQueuesStore, docId);
};


/**
 * Updates the data loss bit in LocalStorage depending on whether there are any
 * remaining changes left in any pending queues.
 *
 * @param {!office.debug.ErrorReporter} errorReporter The docs error reporter.
 * @param {function()=} opt_completionCallback
 */
office.localstore.idb.DocumentCapability.prototype.updateUnsavedChangesBit =
    function(errorReporter, opt_completionCallback) {
  goog.log.fine(this.logger, 'updateUnsavedChangesBit()');
  //  The caller (background page) should reload after a version
  // change.

  // Open a read-write transaction even though we're only reading. This ensures
  // that there are no other transactions in progress that could write to the
  // pending queue commands store and set the unsaved changes bit before it's
  // cleared here.
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS],
      'Error reading pending changes for unsaved bit.',
      undefined /* opt_errorCallback */, true /* opt_allowWrite */);
  if (opt_completionCallback) {
    transaction.setCompletionCallback(opt_completionCallback);
  }

  var pendingQueueCommandsStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  var request = pendingQueueCommandsStore.get(
      this.idbUtil_.createUnboundedKeyRange());
  request.setSuccessCallback(function(e) {
    if (e.target.result) {
      office.localstore.idb.unsavedChangesBit.set(errorReporter);
    } else {
      office.localstore.idb.unsavedChangesBit.clear(errorReporter);
    }
  });
};
