goog.provide('office.localstore.idb.V4StorageAdapter');

goog.require('office.localstore.ApplicationMetadata');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.DocosCapability');
goog.require('office.localstore.idb.DocumentCreationCapability');
goog.require('office.localstore.idb.IndexName');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.V3StorageAdapter');
goog.require('office.localstore.idb.V4DocumentCapability');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.log');



/**
 * Version 4 of the schema, based on IndexedDB.
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
 * @extends {office.localstore.idb.V3StorageAdapter}
 */
office.localstore.idb.V4StorageAdapter = function(indexedDB, documentAdapters,
    lockSessionId, lockDuration, errorReporter) {
  goog.base(this, indexedDB, documentAdapters, lockSessionId, lockDuration,
      errorReporter);

  /**
   * The Docos capability.
   * @type {!office.localstore.DocosCapability}
   * @private
   */
  this.docosCapability_ = this.createDocosCapability();
  this.registerCapability(this.docosCapability_);

  /**
   * The document creation capability. Created lazily.
   * @type {office.localstore.DocumentCreationCapability}
   * @private
   */
  this.documentCreationCapability_ =
      new office.localstore.idb.DocumentCreationCapability(
          this.getDb(), this.getIdbUtil(), documentAdapters,
          this.getStorageObjectReaderWriter());
  this.registerCapability(this.documentCreationCapability_);
};
goog.inherits(office.localstore.idb.V4StorageAdapter,
    office.localstore.idb.V3StorageAdapter);


/**
 * A sorted list of the names of all the object stores expected to exist in an
 * IDB at this schema version.
 * @type {Array.<string>}
 * @private
 */
office.localstore.idb.V4StorageAdapter.OBJECT_STORE_NAMES_;


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.getSchemaVersion = function() {
  return 4;
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.getDocosCapability = function() {
  return this.docosCapability_;
};


/**
 * @return {!office.localstore.DocosCapability}
 * @protected
 */
office.localstore.idb.V4StorageAdapter.prototype.createDocosCapability =
    function() {
  return new office.localstore.idb.DocosCapability(
      this.getDb(), this.getIdbUtil(), this.getStorageObjectReaderWriter());
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.getDocumentCreationCapability =
    function() {
  return this.documentCreationCapability_;
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.getObjectStoreNames =
    function() {
  if (!office.localstore.idb.V4StorageAdapter.OBJECT_STORE_NAMES_) {
    var parentObjectStoreNames = goog.base(this, 'getObjectStoreNames');
    office.localstore.idb.V4StorageAdapter.OBJECT_STORE_NAMES_ =
        parentObjectStoreNames.concat([
          //office.localstore.idb.StoreName.APPLICATION_METADATA,
          //office.localstore.idb.StoreName.COMMENTS
          //office.localstore.idb.StoreName.NEW_DOCUMENT_IDS
        ]);
    goog.array.sort(office.localstore.idb.V4StorageAdapter.OBJECT_STORE_NAMES_);
  }
  return office.localstore.idb.V4StorageAdapter.OBJECT_STORE_NAMES_;
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.createDocumentCapability =
    function(documentAdapters) {
  return new office.localstore.idb.V4DocumentCapability(this.getDb(),
      this.getIdbUtil(), this.getStorageObjectReaderWriter(), documentAdapters);
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.doInitialize = function(
    transaction) {
  goog.base(this, 'doInitialize', transaction);

  this.createV4Stores_(transaction);
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.canUpgrade = function() {
  // An upgrade from V3 to V4 is always possible.
  return true;
};


/** @override */
office.localstore.idb.V4StorageAdapter.prototype.upgrade = function(
    completionCallback, errorCallback) {
  this.getDb().setVersion(this.getSchemaVersion(),
      goog.bind(this.handleSetVersionForUpgradeSuccess_, this, errorCallback),
      office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback(
          '.', errorCallback),
      completionCallback);
};


/**
 * Handler for database upgrades where the given transactions was the one used
 * to perform the upgrade.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback Callback
 *     for handling errors.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @private
 */
office.localstore.idb.V4StorageAdapter.prototype.
    handleSetVersionForUpgradeSuccess_ = function(errorCallback, transaction) {
  goog.log.fine(
      this.logger, 'Received setVersion success callback on upgrade.');

  try {
    this.doUpgrade(transaction);
  } catch (ex) {
    goog.Timer.callOnce(goog.partial(errorCallback,
        new office.localstore.LocalStoreError(
            office.localstore.LocalStoreError.Type.DATABASE_ERROR,
            '.', ex)));
  }
};


/**
 * Perform the upgrade from v3.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @protected
 */
office.localstore.idb.V4StorageAdapter.prototype.doUpgrade =
    function(transaction) {
  this.createV4Stores_(transaction);
};


/**
 * Creates the v4 stores and indices.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @private
 */
office.localstore.idb.V4StorageAdapter.prototype.createV4Stores_ = function(
    transaction) {
  var db = transaction.db;

  //db.createObjectStore(office.localstore.idb.StoreName.APPLICATION_METADATA,
  //    {keyPath: office.localstore.ApplicationMetadata.Property.DOC_TYPE});
  //db.createObjectStore(office.localstore.idb.StoreName.NEW_DOCUMENT_IDS,
  //    {keyPath: office.localstore.idb.DocumentCreationCapability.
  //          DocumentTypeFields.KEY});

  //var commentStore = db.createObjectStore(
  //    office.localstore.idb.StoreName.COMMENTS,
  //    {keyPath: office.localstore.idb.DocosCapability.IDB_KEY});
  //commentStore.createIndex(
  //    office.localstore.idb.IndexName.COMMENTS_STATE,
  //    office.localstore.idb.DocosCapability.COMMENTS_STATE_INDEX_KEY_PATH);
};
