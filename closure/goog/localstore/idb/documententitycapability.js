/**
 * @fileoverview Concrete implementation of the document entity capability using
 * an IndexedDB database.


 */

goog.provide('office.localstore.idb.DocumentEntityCapability');

goog.require('office.localstore.DocumentEntity');
goog.require('office.localstore.DocumentEntityCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.array');



/**
 * Concrete implementation of the document entity capability using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentEntityCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DocumentEntityCapability = function(
    db, idbUtil, storageObjectReaderWriter) {
  goog.base(this);

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
goog.inherits(office.localstore.idb.DocumentEntityCapability,
    office.localstore.DocumentEntityCapability);


/**
 * Keys used for storing document entities.
 * @enum {string}
 */
office.localstore.idb.DocumentEntityCapability.DocumentEntityFields = {
  KEY: 'deKey',
  DATA: 'data'
};


/**
 * Builds a document entity's key from its components.
 * @param {string} entityId The entity's id.
 * @param {string} documentId The document's id.
 * @param {string} entityType The entity's type.
 * @return {!Array.<string>} The document entity's key.
 * @private
 */
office.localstore.idb.DocumentEntityCapability.prototype.
    getDocumentEntityKeyFromParams_ = function(
        entityId, documentId, entityType) {
  return [documentId, entityType, entityId];
};


/** @override */
office.localstore.idb.DocumentEntityCapability.prototype.readDocumentEntities =
    function(documentId, entityType, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_ENTITIES],
      'Error reading DocumentEntities.', opt_errorCallback);
  var documentEntityStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  var lowerBound = [documentId, entityType];
  var upperBound = [documentId, entityType, []];
  this.idbUtil_.iterateIdbCursor(transaction,
      office.localstore.idb.StoreName.DOCUMENT_ENTITIES,
      goog.bind(this.createDocumentEntityFromStore_, this),
      resultCallback,
      lowerBound,
      upperBound,
      undefined /* opt_index */,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/** @override */
office.localstore.idb.DocumentEntityCapability.prototype.
    readDocumentEntitiesByIds = function(
        entityIds, documentId, entityType, resultCallback, opt_errorCallback) {
  var ids = [];
  goog.array.removeDuplicates(entityIds, ids);
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_ENTITIES],
      'Error reading DocumentEntities.', opt_errorCallback);
  var documentEntityStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  var entities = [];
  var oneEntityCallback = function(entity) {
    if (entity != null) {
      entity.markAsInitialized();
      entities.push(entity);
    }
  };
  transaction.setCompletionCallback(function() {
    resultCallback(entities);
  });
  for (var i = 0; i < ids.length; i++) {
    var entityId = ids[i];
    var request = documentEntityStore.get(this.getDocumentEntityKeyFromParams_(
        entityId, documentId, entityType));
    request.setSuccessCallback(goog.bind(
        this.handleDocumentEntityReadSuccess_, this, oneEntityCallback));
  }
};


/**
 * Returns a DocumentEntity from the storage representation.
 * @param {!Object} obj The storage object.
 * @return {!office.localstore.DocumentEntity} The document entitiy object.
 * @private
 */
office.localstore.idb.DocumentEntityCapability.prototype.
    createDocumentEntityFromStore_ = function(obj) {
  var DocumentEntityFields =
      office.localstore.idb.DocumentEntityCapability.DocumentEntityFields;
  var DocumentEntityKeyIndices =
      office.localstore.DocumentEntityCapability.DocumentEntityKeyIndices;
  var key = obj[DocumentEntityFields.KEY];
  var result = new office.localstore.DocumentEntity(
      key[DocumentEntityKeyIndices.ENTITY_ID],
      key[DocumentEntityKeyIndices.DOCUMENT_ID],
      key[DocumentEntityKeyIndices.ENTITY_TYPE],
      obj[DocumentEntityFields.DATA],
      false /* isNew */);
  result.markAsInitialized();
  return result;
};


/** @override */
office.localstore.idb.DocumentEntityCapability.prototype.readDocumentEntity =
    function(
        entityId, documentId, entityType, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_ENTITIES],
      'Error reading DocumentEntity.', opt_errorCallback);

  var abandonTransactionAndResultCallback = function(result) {
    transaction.abandon();
    resultCallback(result);
  };

  var documentEntityStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  var request = documentEntityStore.get(this.getDocumentEntityKeyFromParams_(
      entityId, documentId, entityType));
  request.setSuccessCallback(goog.bind(this.handleDocumentEntityReadSuccess_,
      this, abandonTransactionAndResultCallback));
};


/**
 * Handles document entities read success.
 * @param {function(office.localstore.DocumentEntity)} resultCallback The
 *     completion callback for successful reads.
 * @param {!Event} e The success event.
 * @private
 */
office.localstore.idb.DocumentEntityCapability.prototype.
    handleDocumentEntityReadSuccess_ = function(resultCallback, e) {
  var result = e.target.result;
  if (!result) {
    resultCallback(null);
  } else {
    var DocumentEntityFields =
        office.localstore.idb.DocumentEntityCapability.DocumentEntityFields;
    var DocumentEntityKeyIndices =
        office.localstore.DocumentEntityCapability.DocumentEntityKeyIndices;
    var key = result[DocumentEntityFields.KEY];
    resultCallback(new office.localstore.DocumentEntity(
        key[DocumentEntityKeyIndices.ENTITY_ID],
        key[DocumentEntityKeyIndices.DOCUMENT_ID],
        key[DocumentEntityKeyIndices.ENTITY_TYPE],
        result[DocumentEntityFields.DATA],
        false /* isNew */));
  }
};


/** @override */
office.localstore.idb.DocumentEntityCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.DOCUMENT_ENTITIES];
};


/** @override */
office.localstore.idb.DocumentEntityCapability.prototype.performOperation =
    function(operation, transaction) {
  var documentEntityStore =
      transaction.getObjectStore(
          office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateDocumentEntityOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      if (updateDocumentEntityOperation.isNew()) {
        this.writeNewDocumentEntity_(
            updateDocumentEntityOperation, documentEntityStore);
      } else {
        this.updateDocumentEntity_(
            updateDocumentEntityOperation, documentEntityStore);
      }
      break;
    case office.localstore.Operation.Type.DELETE_RECORD:
      var deleteDocumentEntityOperation =
          /** @type {!office.localstore.DeleteRecordOperation} */ (operation);
      this.idbUtil_.deleteFromStore(
          documentEntityStore, deleteDocumentEntityOperation.getKey());
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Writes a new document entity to IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateDocumentEntityOperation
 * @param {!office.localstore.idb.ObjectStore} documentEntityStore
 * @private
 */
office.localstore.idb.DocumentEntityCapability.prototype.writeNewDocumentEntity_ =
    function(updateDocumentEntityOperation, documentEntityStore) {
  var record = {};
  record[
      office.localstore.idb.DocumentEntityCapability.DocumentEntityFields.KEY] =
      updateDocumentEntityOperation.getKey();
  record[
      office.localstore.idb.DocumentEntityCapability.DocumentEntityFields.DATA] =
      updateDocumentEntityOperation.
          getModifications()[office.localstore.DocumentEntity.Property.DATA];
  var request = documentEntityStore.put(record);
};


/**
 * updates a document entity in IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateDocumentEntityOperation
 * @param {!office.localstore.idb.ObjectStore} documentEntityStore
 * @private
 */
office.localstore.idb.DocumentEntityCapability.prototype.updateDocumentEntity_ =
    function(updateDocumentEntityOperation, documentEntityStore) {
  var modifications = {};
  modifications[office.localstore.idb.DocumentEntityCapability.
      DocumentEntityFields.DATA] = updateDocumentEntityOperation.
      getModifications()[office.localstore.DocumentEntity.Property.DATA];
  var documentEntitytKey = updateDocumentEntityOperation.getKey();
  this.storageObjectReaderWriter_.saveModifications(
      documentEntitytKey, modifications, documentEntityStore);
};
