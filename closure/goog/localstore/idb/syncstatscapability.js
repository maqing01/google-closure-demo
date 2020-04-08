/**
 * @fileoverview Concrete implementation of the sync stats capability using
 * an IndexedDB database.


 */

goog.provide('office.localstore.idb.SyncStatsCapability');

goog.require('office.localstore.Operation');
goog.require('office.localstore.ProfileData');
goog.require('office.localstore.SyncStats');
goog.require('office.localstore.SyncStatsCapability');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');



/**
 * Concrete implementation of the sync stats capability using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.SyncStatsCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.SyncStatsCapability = function(
    db, storageObjectReaderWriter) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * The object for reading and writing to IndexedDB storage.
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;
};
goog.inherits(office.localstore.idb.SyncStatsCapability,
    office.localstore.SyncStatsCapability);


/** @override */
office.localstore.idb.SyncStatsCapability.prototype.getSyncStats = function(
    resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.PROFILE_DATA],
      'Error reading syncStats.', opt_errorCallback);
  var request = transaction.
      getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA).
      get(office.localstore.SyncStats.DATA_TYPE);

  var capability = this;
  request.setSuccessCallback(function(e) {
    transaction.abandon();
    var storageObject = e.target.result;
    if (!storageObject) {
      resultCallback(null);
      return;
    }

    resultCallback(capability.createSyncStatsFromStorageObject_(storageObject));
  });
};


/**
 * Creates syncStats from a storage object.
 * @param {!Object} storageObject The storage object.
 * @return {!office.localstore.SyncStats} The syncStats object corresponding to
 *     the storage object.
 * @private
 */
office.localstore.idb.SyncStatsCapability.prototype.
    createSyncStatsFromStorageObject_ = function(storageObject) {
  if (storageObject[office.localstore.ProfileData.Property.DATA_TYPE] !=
      office.localstore.SyncStats.DATA_TYPE) {
    throw Error('Invalid data type.');
  }

  var syncStats = new office.localstore.SyncStats(false /* isNew */);

  //  Audit usages of isDefAndNotNull and potentially use
  // something more specific (i.e., isNumber, isString, etc).
  var docsToDelete = storageObject[
      office.localstore.SyncStats.Property.DOCS_TO_DELETE];
  if (goog.isDefAndNotNull(docsToDelete)) {
    syncStats.setDocsToDelete(docsToDelete);
  }
  var enabledMimeTypes = storageObject[
      office.localstore.SyncStats.Property.ENABLED_MIME_TYPES];
  if (goog.isDefAndNotNull(enabledMimeTypes)) {
    syncStats.setEnabledMimeTypes(enabledMimeTypes);
  }
  var lastLocalStoreProfileTimestamp = storageObject[
      office.localstore.SyncStats.Property.LAST_LOCAL_STORE_PROFILE_TIMESTAMP];
  if (goog.isDefAndNotNull(lastLocalStoreProfileTimestamp)) {
    syncStats.setLastLocalStoreProfileTimestamp(lastLocalStoreProfileTimestamp);
  }
  var lastSyncTimestamp = storageObject[
      office.localstore.SyncStats.Property.LAST_SYNC_TIMESTAMP];
  if (goog.isDefAndNotNull(lastSyncTimestamp)) {
    syncStats.setLastSyncTimestamp(lastSyncTimestamp);
  }
  var lastSyncedChangestamp = storageObject[
      office.localstore.SyncStats.Property.LAST_SYNCED_CHANGESTAMP];
  if (goog.isDefAndNotNull(lastSyncedChangestamp)) {
    syncStats.setLastSyncedChangestamp(lastSyncedChangestamp);
  }
  var syncStartTimestamp = storageObject[
      office.localstore.SyncStats.Property.SYNC_START_TIMESTAMP];
  if (goog.isDefAndNotNull(syncStartTimestamp)) {
    syncStats.setSyncStartTimestamp(syncStartTimestamp);
  }
  var syncVersion = storageObject[
      office.localstore.SyncStats.Property.SYNC_VERSION];
  if (goog.isDefAndNotNull(syncVersion)) {
    syncStats.setSyncVersion(syncVersion);
  }
  var failedToSyncDocs = storageObject[
      office.localstore.SyncStats.Property.FAILED_TO_SYNC_DOCS];
  if (goog.isDefAndNotNull(failedToSyncDocs)) {
    for (var docId in failedToSyncDocs) {
      var data = failedToSyncDocs[docId];
      syncStats.setSyncFailed(docId,
          data[office.localstore.SyncStats.FailedToSyncField.
              TOTAL_SYNC_FAIL_COUNT],
          data[office.localstore.SyncStats.FailedToSyncField.
              MODEL_SYNC_FAIL_COUNT] || 0,
          data[office.localstore.SyncStats.FailedToSyncField.
              SERVER_MODIFIED_TIMESTAMP_ON_SYNC_FAIL]);
    }
  }
  var lastDailyRunTime = storageObject[
      office.localstore.SyncStats.Property.LAST_DAILY_RUN_TIME];
  if (goog.isDefAndNotNull(lastDailyRunTime)) {
    syncStats.setLastDailyRunTime(lastDailyRunTime);
  }
  var maxSpaceQuota = storageObject[
      office.localstore.SyncStats.Property.MAX_SPACE_QUOTA];
  if (goog.isDefAndNotNull(maxSpaceQuota)) {
    syncStats.setMaxSpaceQuota(maxSpaceQuota);
  }
  var webfontsSyncVersion = storageObject[
      office.localstore.SyncStats.Property.WEBFONTS_SYNC_VERSION];
  if (goog.isDefAndNotNull(webfontsSyncVersion)) {
    syncStats.setWebfontsSyncVersion(webfontsSyncVersion);
  }

  var lastStartedSyncDocs = storageObject[
      office.localstore.SyncStats.Property.LAST_STARTED_SYNC_DOCS];
  if (goog.isDefAndNotNull(lastStartedSyncDocs)) {
    for (var i = 0; i < lastStartedSyncDocs.length; i++) {
      var documentId = lastStartedSyncDocs[i][
          office.localstore.SyncStats.LastStartedSyncDocField.DOCUMENT_ID];
      var timestamp = lastStartedSyncDocs[i][
          office.localstore.SyncStats.LastStartedSyncDocField.TIMESTAMP];
      syncStats.addLastStartedSyncDocId(documentId, timestamp);
    }
  }

  var relevantDocuments = storageObject[
      office.localstore.SyncStats.Property.RELEVANT_DOCUMENTS];
  if (goog.isDefAndNotNull(relevantDocuments)) {
    syncStats.setRelevantDocuments(relevantDocuments);
  }
  syncStats.markAsInitialized();

  return syncStats;
};


/** @override */
office.localstore.idb.SyncStatsCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.PROFILE_DATA];
};


/** @override */
office.localstore.idb.SyncStatsCapability.prototype.performOperation =
    function(operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateRecordOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      this.writeSyncStats_(updateRecordOperation,
          transaction.getObjectStore(
              office.localstore.idb.StoreName.PROFILE_DATA));
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Writes or updates syncStats in IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateRecordOperation
 * @param {!office.localstore.idb.ObjectStore} profileDataStore
 * @private
 */
office.localstore.idb.SyncStatsCapability.prototype.writeSyncStats_ = function(
    updateRecordOperation, profileDataStore) {
  if (updateRecordOperation.isNew()) {
    profileDataStore.put(updateRecordOperation.getModifications());
  } else {
    this.storageObjectReaderWriter_.saveModifications(
        office.localstore.SyncStats.DATA_TYPE,
        updateRecordOperation.getModifications(), profileDataStore);
  }
};
