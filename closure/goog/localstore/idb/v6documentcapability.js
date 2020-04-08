goog.provide('office.localstore.idb.V6DocumentCapability');

goog.require('office.localstore.Document');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.V5DocumentCapability');


/**
 * Concrete implementation of document capability for version 6 of the schema,
 * based on IndexedDB.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.V5DocumentCapability}
 */
office.localstore.idb.V6DocumentCapability = function(
    db, idbUtil, storageObjectReaderWriter, documentAdapters) {
  goog.base(this, db, idbUtil, storageObjectReaderWriter, documentAdapters);
};
goog.inherits(office.localstore.idb.V6DocumentCapability,
    office.localstore.idb.V5DocumentCapability);


/** @override */
office.localstore.idb.V6DocumentCapability.prototype.createDocumentFromStore =
    function(userId, obj) {
  var doc = goog.base(this, 'createDocumentFromStore', userId, obj);
  if (!doc) {
    return null;
  }

  var startupHints = obj[office.localstore.Document.Property.STARTUP_HINTS];
  if (startupHints) {
    for (var hint in startupHints) {
      doc.setStartupHint(hint, startupHints[hint]);
    }
  }
  var initialCommands =
      obj[office.localstore.Document.Property_v6.INITIAL_COMMANDS];
  if (initialCommands) {
    doc.setSerializedInitialCommands(initialCommands);
  }
  doc.setHasPartialModelDataOnly(!!obj[
      office.localstore.Document.Property_v6.HAS_PARTIAL_MODEL_DATA_ONLY]);
  doc.setIsPartiallySynced(!!obj[
      office.localstore.Document.Property_v6.IS_PARTIALLY_SYNCED]);

  var folderAtCreationTime =
      obj[office.localstore.Document.Property_v6.FOLDER_AT_CREATION_TIME];
  if (goog.isDefAndNotNull(folderAtCreationTime)) {
    doc.setFolderAtCreationTime(folderAtCreationTime);
  }

  doc.setModelNeedsResync(
      !!obj[office.localstore.Document.Property_v6.MODEL_NEEDS_RESYNC]);

  return doc;
};


/** @override */
office.localstore.idb.V6DocumentCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  var storeNames =
      goog.base(this, 'getObjectStoreNamesForOperation', operation);
  if (operation.getType() == office.localstore.Operation.Type.DELETE_RECORD) {
    storeNames.push(office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  }
  return storeNames;
};


/** @override */
office.localstore.idb.V6DocumentCapability.prototype.deleteDocumentInternal =
    function(operation, transaction) {
  goog.base(this, 'deleteDocumentInternal', operation, transaction);

  var docId = operation.getKey();

  // Delete all document entities.
  var entitiesStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_ENTITIES);
  this.getIdbUtil().deleteFromStore(entitiesStore, [docId], [docId, []]);
};
