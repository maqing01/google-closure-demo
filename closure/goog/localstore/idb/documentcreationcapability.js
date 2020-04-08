

/**
 * @fileoverview The capability used to handle document creation using an
 * IndexedDB database.

 */

goog.provide('office.localstore.idb.DocumentCreationCapability');

goog.require('office.localstore.ApplicationMetadata');
goog.require('office.localstore.DocumentCreationCapability');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');



/**
 * The capability used to handle document creation using an IndexedDB database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentCreationCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DocumentCreationCapability = function(
    db, idbUtil, documentAdapters, storageObjectReaderWriter) {
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
   * The object for reading and writing to IndexedDB storage.
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;
};
goog.inherits(office.localstore.idb.DocumentCreationCapability,
    office.localstore.DocumentCreationCapability);


/**
 * IDB property names to support document creation.
 * @enum {string}
 * @private
 */
office.localstore.idb.DocumentCreationCapability.IdbPropertyName_ = {
  DOCUMENT_IDS: 'documentIds'
};


/**
 * Keys used for storing document entities.
 * @enum {string}
 */
office.localstore.idb.DocumentCreationCapability.DocumentTypeFields = {
  KEY: 'dtKey'
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.popUnusedDocumentId =
    function(documentType, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.NEW_DOCUMENT_IDS],
      'Error reading new document ids.', opt_errorCallback,
      true /* opt_allowWrite */);
  var request = transaction.getObjectStore(
      office.localstore.idb.StoreName.NEW_DOCUMENT_IDS).get(documentType);

  var errorCallback = opt_errorCallback || this.db_.getErrorCallback();
  request.setSuccessCallback(goog.bind(this.handleDocumentIdPopRead_, this,
      documentType, transaction, resultCallback, errorCallback));
};


/**
 * Pops an id from the list of new document ids currently in storage, writes the
 * shortened list back to storage, and calls the result callback with the
 * popped id.
 * @param {office.localstore.Document.Type} documentType The document type.
 * @param {!office.localstore.idb.Transaction} transaction The transaction.
 * @param {function(number)} resultCallback The result callback.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback The error
 *     callback.
 * @param {!Event} e The IDBRequest success event.
 * @private
 */
office.localstore.idb.DocumentCreationCapability.prototype.
    handleDocumentIdPopRead_ = function(
        documentType, transaction, resultCallback, errorCallback, e) {
  var unusedDocIdsObject = e.target.result;
  var documentIdsKey = office.localstore.idb.DocumentCreationCapability.
      IdbPropertyName_.DOCUMENT_IDS;
  if (!(unusedDocIdsObject && unusedDocIdsObject[documentIdsKey]) ||
      unusedDocIdsObject[documentIdsKey].length == 0) {
    errorCallback(new office.localstore.LocalStoreError(
        office.localstore.LocalStoreError.Type.DATA_MISSING,
        '.'));
    return;
  }

  var unusedDocIds = unusedDocIdsObject[documentIdsKey];
  var newId = unusedDocIds.pop();
  var record = this.createDocumentIdsRecord_(documentType, unusedDocIds);
  var store =
      transaction.getObjectStore(
          office.localstore.idb.StoreName.NEW_DOCUMENT_IDS);
  var request = store.put(record);

  transaction.setCompletionCallback(function() {
    resultCallback(newId);
  });
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.pushUnusedDocumentIds =
    function(documentType, ids, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.NEW_DOCUMENT_IDS],
      'Error writing new document ids.', opt_errorCallback,
      true /* opt_allowWrite */);
  transaction.setCompletionCallback(resultCallback);

  var request = transaction.getObjectStore(
      office.localstore.idb.StoreName.NEW_DOCUMENT_IDS).get(documentType);

  var capability = this;
  request.setSuccessCallback(function(e) {
    var unusedDocIds = e.target.result;
    var documentIdsKey = office.localstore.idb.DocumentCreationCapability.
        IdbPropertyName_.DOCUMENT_IDS;
    var storedIds = (unusedDocIds && unusedDocIds[documentIdsKey]) ?
        unusedDocIds[documentIdsKey] : [];
    var record = capability.createDocumentIdsRecord_(
        documentType, storedIds.concat(ids));
    transaction.getObjectStore(office.localstore.idb.StoreName.NEW_DOCUMENT_IDS).
        put(record);
  });
};


/**
 * Creates a document IDs record to be written to storage.
 * @param {office.localstore.Document.Type} documentType The document type.
 * @param {!Array.<string>} documentIds The document ids.
 * @return {!Object} A new object record to write to the database.
 * @private
 */
office.localstore.idb.DocumentCreationCapability.prototype.
    createDocumentIdsRecord_ = function(documentType, documentIds) {
  var record = {};
  record[office.localstore.idb.DocumentCreationCapability.DocumentTypeFields.
      KEY] = documentType;
  record[office.localstore.idb.DocumentCreationCapability.IdbPropertyName_.
      DOCUMENT_IDS] = documentIds;
  return record;
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.
    getUnusedDocumentIdCount = function(
        documentType, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.NEW_DOCUMENT_IDS],
      'Error reading new document ids.', opt_errorCallback);
  var request = transaction.getObjectStore(
      office.localstore.idb.StoreName.NEW_DOCUMENT_IDS).get(documentType);

  request.setSuccessCallback(function(e) {
    var unusedDocIds = e.target.result;
    var documentIdsKey = office.localstore.idb.DocumentCreationCapability.
        IdbPropertyName_.DOCUMENT_IDS;
    transaction.abandon();
    resultCallback((unusedDocIds && unusedDocIds[documentIdsKey]) ?
        unusedDocIds[documentIdsKey].length : 0);
  });
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.
    getApplicationMetadata = function(
        documentType, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.APPLICATION_METADATA],
      'Error reading application metadata.', opt_errorCallback);
  var request = transaction.getObjectStore(
      office.localstore.idb.StoreName.APPLICATION_METADATA).get(documentType);

  var capability = this;
  request.setSuccessCallback(function(e) {
    transaction.abandon();
    var storageObject = e.target.result;
    if (!storageObject) {
      resultCallback(null);
      return;
    }
    resultCallback(
        capability.createApplicationMetadataFromStorageObject_(storageObject));
  });
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.
    getAllApplicationMetadata = function(resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.APPLICATION_METADATA],
      'Error reading application metadata.', opt_errorCallback);
  this.idbUtil_.iterateIdbCursor(
      transaction,
      office.localstore.idb.StoreName.APPLICATION_METADATA,
      goog.bind(this.createApplicationMetadataFromStorageObject_, this),
      resultCallback,
      undefined /* opt_lowerBound */,
      undefined /* opt_upperBound */,
      undefined /* opt_index */,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/**
 * Creates application metadata from a storage object.
 * @param {!Object} storageObject The storage object.
 * @return {!office.localstore.ApplicationMetadata} The application metadata
 *     object corresponding to the storage object.
 * @private
 */
office.localstore.idb.DocumentCreationCapability.prototype.
    createApplicationMetadataFromStorageObject_ = function(storageObject) {
  var docType = storageObject[
      office.localstore.ApplicationMetadata.Property.DOC_TYPE];
  if (!goog.isDefAndNotNull(docType)) {
    throw Error('Document type expected to be defined.');
  }

  var applicationMetadata = new office.localstore.ApplicationMetadata(
      docType, false /* isNew */);
  var documentAdapter = this.getAdapterForType(docType);

  var jobset =
      storageObject[office.localstore.ApplicationMetadata.Property.JOBSET];
  if (goog.isDefAndNotNull(jobset)) {
    applicationMetadata.setJobset(jobset);
  }
  var initialCommands = storageObject[
      office.localstore.ApplicationMetadata.Property.INITIAL_COMMANDS];
  if (goog.isDefAndNotNull(initialCommands)) {
    var idbCommandBasedDocumentAdapter =
        /**@type {!office.localstore.idb.CommandBasedDocumentAdapter} */
        (documentAdapter);
    var finalCommands =
        idbCommandBasedDocumentAdapter.parseCommands(initialCommands);
    applicationMetadata.setInitialCommands(finalCommands);
  }
  var docosKeyData = storageObject[
      office.localstore.ApplicationMetadata.Property.DOCOS_KEY_DATA];
  if (docosKeyData) {
    applicationMetadata.setDocosKeyData(docosKeyData);
  }

  applicationMetadata.markAsInitialized();

  return applicationMetadata;
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  if (!this.isOperationSupported(operation)) {
    throw Error('Cannot get object store names for operation type ' +
        operation.getType());
  }

  return [office.localstore.idb.StoreName.APPLICATION_METADATA];
};


/** @override */
office.localstore.idb.DocumentCreationCapability.prototype.performOperation =
    function(operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_APPLICATION_METADATA:
      var updateApplicationMetadataOperation =
          /** @type {!office.localstore.UpdateApplicationMetadataOperation} */
          (operation);
      this.writeApplicationMetadata_(
          updateApplicationMetadataOperation, transaction);
      break;
    default:
      throw Error('Cannot perform operation of type ' + operation.getType());
  }
};


/**
 * Writes or updates an application metadata object in IndexedDB.
 * @param {!office.localstore.UpdateApplicationMetadataOperation}
 *     updateApplicationMetadataOperation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.DocumentCreationCapability.prototype.
    writeApplicationMetadata_ = function(
    updateApplicationMetadataOperation, transaction) {
  var documentAdapter = this.getAdapterForType(
      /** @type {string} */ (updateApplicationMetadataOperation.getKey()));
  var modifications = updateApplicationMetadataOperation.getModifications();
  if (updateApplicationMetadataOperation.hasNewInitialCommands()) {
    var commands = updateApplicationMetadataOperation.getInitialCommands();
    modifications[
        office.localstore.ApplicationMetadata.Property.INITIAL_COMMANDS
    ] = this.createCommandObjects_(commands, documentAdapter);
  }

  var applicationMetadataStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.APPLICATION_METADATA);

  if (updateApplicationMetadataOperation.isNew()) {
    applicationMetadataStore.put(modifications);
  } else {
    this.storageObjectReaderWriter_.saveModifications(
        updateApplicationMetadataOperation.getKey(), modifications,
        applicationMetadataStore);
  }
};


/**
 * Creates command storage objects from commands.
 * @param {!Array.<!office.commands.Command>} commands
 * @param {!office.localstore.DocumentAdapter} documentAdapter
 * @return {!Array.<Object>} The array of command objects.
 * @private
 */
office.localstore.idb.DocumentCreationCapability.prototype.createCommandObjects_ =
    function(commands, documentAdapter) {
  var commandObjects = [];
  for (var i = 0; i < commands.length; i++) {
    commandObjects.push(
        documentAdapter.createCommandObject(commands[i]));
  }
  return commandObjects;
};
