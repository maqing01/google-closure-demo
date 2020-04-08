goog.provide('office.localstore.idb.V5StorageAdapter');

goog.require('office.localstore.ProfileData');
goog.require('office.localstore.idb.LatencyReportingCapability');
goog.require('office.localstore.idb.NonSnapshottedDocsCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.SyncStatsCapability');
goog.require('office.localstore.idb.V4StorageAdapter');
goog.require('office.localstore.idb.V5DocosCapability');
goog.require('office.localstore.idb.V5DocumentCapability');
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
 * @extends {office.localstore.idb.V4StorageAdapter}
 */
office.localstore.idb.V5StorageAdapter = function(indexedDB, documentAdapters,
    lockSessionId, lockDuration, errorReporter) {
  goog.base(this, indexedDB, documentAdapters, lockSessionId, lockDuration,
      errorReporter);

  //  Remove the dependency on the storage adapter from the
  // capability once the records for profile data are split properly.
  /**
   * @type {!office.localstore.idb.LatencyReportingCapability}
   * @private
   */
  this.latencyReportingCapability_ =
      new office.localstore.idb.LatencyReportingCapability(this.getDb());

  /**
   * @type {!office.localstore.idb.NonSnapshottedDocsCapability}
   * @private
   */
  this.nonSnapshottedDocsCapability_ =
      new office.localstore.idb.NonSnapshottedDocsCapability(
          this.getDb(), this.getStorageObjectReaderWriter());

  /**
   * @type {!office.localstore.idb.SyncStatsCapability}
   * @private
   */
  this.syncStatsCapability_ =
      new office.localstore.idb.SyncStatsCapability(this.getDb(),
      this.getStorageObjectReaderWriter());
  this.registerCapability(this.syncStatsCapability_);
};
goog.inherits(office.localstore.idb.V5StorageAdapter,
    office.localstore.idb.V4StorageAdapter);


/**
 * A sorted list of the names of all the object stores expected to exist in an
 * IDB at this schema version.
 * @type {Array.<string>}
 * @private
 */
office.localstore.idb.V5StorageAdapter.OBJECT_STORE_NAMES_;


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.getSchemaVersion = function() {
  return 5;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.getNonSnapshottedDocsCapability =
    function() {
  return this.nonSnapshottedDocsCapability_;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.getLatencyReportingCapability =
    function() {
  return this.latencyReportingCapability_;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.createDocosCapability =
    function() {
  return new office.localstore.idb.V5DocosCapability(this.getDb(),
      this.getIdbUtil(), this.getStorageObjectReaderWriter());
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.getSyncStatsCapability =
    function() {
  return this.syncStatsCapability_;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.getObjectStoreNames =
    function() {
  if (!office.localstore.idb.V5StorageAdapter.OBJECT_STORE_NAMES_) {
    var parentObjectStoreNames = goog.base(this, 'getObjectStoreNames');
    office.localstore.idb.V5StorageAdapter.OBJECT_STORE_NAMES_ =
        parentObjectStoreNames.concat([
          //office.localstore.idb.StoreName.PROFILE_DATA
        ]);
    goog.array.sort(office.localstore.idb.V5StorageAdapter.OBJECT_STORE_NAMES_);
  }
  return office.localstore.idb.V5StorageAdapter.OBJECT_STORE_NAMES_;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.createDocumentCapability =
    function(documentAdapters) {
  return new office.localstore.idb.V5DocumentCapability(this.getDb(),
      this.getIdbUtil(), this.getStorageObjectReaderWriter(), documentAdapters);
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.canUpgrade = function() {
  // An upgrade from V4 to V5 is always possible.
  return true;
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.doInitialize = function(
    transaction) {
  goog.base(this, 'doInitialize', transaction);

  this.createV5Stores_(transaction);
};


/** @override */
office.localstore.idb.V5StorageAdapter.prototype.doUpgrade =
    function(transaction) {
  this.createV5Stores_(transaction);
};


/**
 * Creates the v5 stores and indices.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @private
 */
office.localstore.idb.V5StorageAdapter.prototype.createV5Stores_ = function(
    transaction) {
  var db = transaction.db;
  //db.createObjectStore(office.localstore.idb.StoreName.PROFILE_DATA,
  //    {keyPath: office.localstore.ProfileData.Property.DATA_TYPE});
};
