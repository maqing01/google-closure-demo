goog.provide('office.localstore.idb.V3StorageAdapter');

goog.require('office.localstore.Document');
goog.require('office.localstore.User');
goog.require('office.localstore.idb.DocumentCapability');
goog.require('office.localstore.idb.DocumentCommandsStorageObject');
goog.require('office.localstore.idb.ImpressionCapability');
goog.require('office.localstore.idb.PendingQueueStorageObject');
goog.require('office.localstore.idb.StorageAdapter');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.array');
goog.require('goog.log');



/**
 * Version 3 schema adapter based on IndexedDB. Each entry is in the following
 * format (* represent key and + represent index):
 * Users: {*id: string, managingDomain: string, emailAddress: string,
 *     locale: string, optInSecret: string}
 * Documents: {*id: string, title: string, documentType: string, jobset: string,
 *     isFastTrack: boolean, acl: {userId: string -> accessLevel: number} map,
 *     lastColdStartedTimestamp: int, lastWarmStartedTimestamp: int,
 *     lastSyncedTimestamp: int, lastModifiedServerTimestamp: int}
 * FileEntities: {*id: string, +docIdEntityTypeIndex:
 *     [string (docId), string (entityType)], contentType: string}
 *
 * @param {!office.localstore.idb.DocsDatabase} indexedDB The indexed database.
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @param {string} lockSessionId The session id to hold locks for the current
 *     session.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. Another process will be
 *     allowed to grab the lock for the document if this duration elapses since
 *     the application last refreshed the lock. The LocalStore will
 *     automatically refresh the lock before this duration elapses as long as
 *     the lock has not been released. A value of 0 indicates no auto-refresh.
 * @param {!office.debug.ErrorReporterApi} errorReporter An error reporter.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.StorageAdapter}
 */
office.localstore.idb.V3StorageAdapter = function(indexedDB, documentAdapters,
    lockSessionId, lockDuration, errorReporter) {
  goog.base(this, indexedDB, documentAdapters, lockSessionId, lockDuration,
      errorReporter);

  /**
   * The Impression capability.
   * @type {!office.localstore.ImpressionCapability}
   * @private
   */
  this.impressionCapability_ =
      new office.localstore.idb.ImpressionCapability(
          this.getDb(), this.getIdbUtil());
  this.registerCapability(this.impressionCapability_);
};
goog.inherits(office.localstore.idb.V3StorageAdapter,
    office.localstore.idb.StorageAdapter);


/**
 * The key of the document locks object store.
 * @type {string}
 * @private
 */
office.localstore.idb.V3StorageAdapter.DOCUMENT_LOCKS_KEY_NAME_ = 'lpath';


/**
 * A sorted list of the names of all the object stores expected to exist in an
 * IDB at this schema version.
 * @type {!Array.<string>}
 * @private
 */
office.localstore.idb.V3StorageAdapter.OBJECT_STORE_NAMES_ = [
  //office.localstore.idb.StoreName.USERS,
  office.localstore.idb.StoreName.DOCUMENTS,
  office.localstore.idb.StoreName.DOCUMENT_COMMANDS,
  office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING,
  office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA,
  office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING,
  office.localstore.idb.StoreName.DOCUMENT_LOCKS,
  //office.localstore.idb.StoreName.IMPRESSIONS,
  office.localstore.idb.StoreName.PENDING_QUEUES,
  office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS
  //office.localstore.idb.StoreName.FILE_ENTITIES
];
goog.array.sort(office.localstore.idb.V3StorageAdapter.OBJECT_STORE_NAMES_);


/**
 * The key path for the file entities object store index which indexes over
 * document id and entity type.
 * @type {string}
 */
office.localstore.idb.V3StorageAdapter.FILE_ENTITIES_DOC_ENTITY_INDEX_KEY_PATH =
    'docIdEntityTypeIndex';


/**
 * The index name for the file entities object store index which indexes over
 * document id and entity type.
 * @type {string}
 * @private
 */
office.localstore.idb.V3StorageAdapter.FILE_ENTITIES_DOC_ENTITY_INDEX_ =
    'DocIdEntityTypeIndex';


/**
 * The key path for the file entities object store index based on id.
 * @type {string}
 * @private
 */
office.localstore.idb.V3StorageAdapter.FILE_ENTITIES_ID_KEY_PATH_ = 'id';


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.getImpressionCapability =
    function() {
  return this.impressionCapability_;
};


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.logger =
    goog.log.getLogger('office.localstore.idb.V3StorageAdapter');


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.getSchemaVersion = function() {
  return 3;
};


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.canUpgrade = function() {
  return false;
};


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.getObjectStoreNames =
    function() {
  return office.localstore.idb.V3StorageAdapter.OBJECT_STORE_NAMES_;
};


/** @override */
office.localstore.idb.V3StorageAdapter.prototype.doInitialize = function(
    transaction) {
  var db = transaction.db;
  //db.createObjectStore(office.localstore.idb.StoreName.USERS,
  //    {keyPath: office.localstore.User.Property.ID});
  db.createObjectStore(office.localstore.idb.StoreName.DOCUMENTS,
      {keyPath: office.localstore.Document.Property.ID});
  db.createObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS,
      {keyPath: office.localstore.idb.DocumentCommandsStorageObject.
            DOCUMENT_COMMANDS_KEY_NAME});
  db.createObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING,
      {keyPath: office.localstore.idb.DocumentCommandsStorageObject.
            DOCUMENT_COMMANDS_KEY_NAME});
  db.createObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA,
      {keyPath: office.localstore.idb.DocumentCapability.
            DOCUMENT_COMMANDS_METADATA_KEY_NAME});
  db.createObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_METADATA_STAGING,
      {keyPath: office.localstore.idb.DocumentCapability.
            DOCUMENT_COMMANDS_METADATA_KEY_NAME});
  db.createObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_LOCKS,
      {keyPath: office.localstore.idb.V3StorageAdapter.DOCUMENT_LOCKS_KEY_NAME_});
  //db.createObjectStore(
  //    office.localstore.idb.StoreName.IMPRESSIONS,
  //    {keyPath: office.localstore.idb.ImpressionCapability.IMPRESSIONS_KEY_NAME}
  //);
  db.createObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUES,
      {keyPath: office.localstore.idb.PendingQueueStorageObject.
            MetadataKey.DOC_ID});
  db.createObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS,
      {keyPath: office.localstore.idb.PendingQueueStorageObject.CommandKey.KEY});

  //var fileEntityStore = db.createObjectStore(
  //    office.localstore.idb.StoreName.FILE_ENTITIES,
  //    {keyPath: office.localstore.idb.V3StorageAdapter.
  //          FILE_ENTITIES_ID_KEY_PATH_});
  //fileEntityStore.createIndex(
  //    office.localstore.idb.V3StorageAdapter.FILE_ENTITIES_DOC_ENTITY_INDEX_,
  //    office.localstore.idb.V3StorageAdapter.
  //        FILE_ENTITIES_DOC_ENTITY_INDEX_KEY_PATH);
};
