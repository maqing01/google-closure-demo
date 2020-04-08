goog.provide('office.localstore.idb.V6StorageAdapter');

goog.require('office.localstore.FontMetadata');
goog.require('office.localstore.SyncObject');
goog.require('office.localstore.idb.DocumentEntityCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.SyncObjectsCapability');
goog.require('office.localstore.idb.V5StorageAdapter');
goog.require('office.localstore.idb.V6DocumentCapability');
goog.require('office.localstore.idb.WebFontsCapability');
goog.require('goog.array');



/**
 * @param {!office.localstore.idb.DocsDatabase} indexedDB The IndexedDB database.
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @param {string} lockSessionId The session id for lock acquisitions.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. Another process will be
 *     allowed to grab the lock for the document if this duration elapses since
 *     the application last refreshed the lock. The LocalStore will
 *     automatically refresh the lock before this duration elapses as long as
 *     the lock has not been released. A value of 0 indicates no auto-refresh.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.V5StorageAdapter}
 */
office.localstore.idb.V6StorageAdapter = function(indexedDB, documentAdapters,
    lockSessionId, lockDuration, errorReporter) {
  goog.base(this, indexedDB, documentAdapters, lockSessionId, lockDuration,
      errorReporter);

  var db = this.getDb();
  var idbUtil = this.getIdbUtil();

  /**
   * @type {!office.localstore.DocumentEntityCapability}
   * @private
   */
  this.documentEntityCapability_ =
      new office.localstore.idb.DocumentEntityCapability(
          db, idbUtil, this.getStorageObjectReaderWriter());
  this.registerCapability(this.documentEntityCapability_);

  /**
   * @type {!office.localstore.WebFontsCapability}
   * @private
   */
  this.webFontsCapability_ =
      new office.localstore.idb.WebFontsCapability(db, idbUtil);
  this.registerCapability(this.webFontsCapability_);

  /**
   * @type {!office.localstore.SyncObjectsCapability}
   * @private
   */
  this.syncObjectsCapability_ =
      new office.localstore.idb.SyncObjectsCapability(db, idbUtil);
  this.registerCapability(this.syncObjectsCapability_);
};
goog.inherits(office.localstore.idb.V6StorageAdapter,
    office.localstore.idb.V5StorageAdapter);


/**
 * A sorted list of the names of all the object stores expected to exist in an
 * IDB at this schema version.
 * @type {Array.<string>}
 * @private
 */
office.localstore.idb.V6StorageAdapter.OBJECT_STORE_NAMES_;


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.getSchemaVersion = function() {
  // TODO(jcai): storage upgrade
  return 1008 /* localStorageSchemaVersion */;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.getDocumentEntityCapability =
    function() {
  return this.documentEntityCapability_;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.getWebFontsCapability =
    function() {
  return this.webFontsCapability_;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.getSyncObjectsCapability =
    function() {
  return this.syncObjectsCapability_;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.getObjectStoreNames =
    function() {
  if (!office.localstore.idb.V6StorageAdapter.OBJECT_STORE_NAMES_) {
    var parentObjectStoreNames = goog.base(this, 'getObjectStoreNames');
    office.localstore.idb.V6StorageAdapter.OBJECT_STORE_NAMES_ =
        parentObjectStoreNames.concat([
          //office.localstore.idb.StoreName.DOCUMENT_ENTITIES,
          //office.localstore.idb.StoreName.FONT_METADATA,
          //office.localstore.idb.StoreName.SYNC_OBJECTS
        ]);
    goog.array.sort(office.localstore.idb.V6StorageAdapter.OBJECT_STORE_NAMES_);
  }
  return office.localstore.idb.V6StorageAdapter.OBJECT_STORE_NAMES_;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.createDocumentCapability =
    function(documentAdapters) {
  return new office.localstore.idb.V6DocumentCapability(
      this.getDb(), this.getIdbUtil(),
      this.getStorageObjectReaderWriter(), documentAdapters);
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.canUpgrade = function() {
  return false;
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.doInitialize = function(
    transaction) {
  goog.base(this, 'doInitialize', transaction);

  this.createV6Stores_(transaction);
};


/** @override */
office.localstore.idb.V6StorageAdapter.prototype.doUpgrade =
    function(transaction) {
  this.createV6Stores_(transaction);
};


/**
 * Creates the v6 stores and indices.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @private
 */
office.localstore.idb.V6StorageAdapter.prototype.createV6Stores_ = function(
    transaction) {
  var db = transaction.db;
  //db.createObjectStore(office.localstore.idb.StoreName.FONT_METADATA,
  //    {keyPath: office.localstore.FontMetadata.Property.FONT_FAMILY});
  //db.createObjectStore(office.localstore.idb.StoreName.DOCUMENT_ENTITIES,
  //    {keyPath: office.localstore.idb.DocumentEntityCapability.
  //        DocumentEntityFields.KEY});
  //db.createObjectStore(office.localstore.idb.StoreName.SYNC_OBJECTS,
  //    {keyPath: office.localstore.SyncObject.Property.KEYPATH});
};
