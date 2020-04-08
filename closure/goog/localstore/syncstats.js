
/**
 * @fileoverview Contains the definition of the office.localstore.SyncStats class.

 */

goog.provide('office.localstore.SyncStats');

goog.require('office.localstore.ProfileData');
goog.require('office.localstore.Record');
goog.require('goog.object');



/**
 * Construct a new SyncStats object.
 * @param {boolean} isNew Whether this is a new object, not yet persisted in
 *     local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.ProfileData}
 */
office.localstore.SyncStats = function(isNew) {
  goog.base(this, office.localstore.Record.Type.SYNC_STATS,
      office.localstore.SyncStats.DATA_TYPE, isNew);
  this.setProperty(
      office.localstore.SyncStats.Property.LAST_SYNCED_CHANGESTAMP, 0);
  this.setProperty(
      office.localstore.SyncStats.Property.SYNC_VERSION, 0);
  this.setProperty(
      office.localstore.SyncStats.Property.LAST_DAILY_RUN_TIME, 0);
  this.setProperty(
      office.localstore.SyncStats.Property.MAX_SPACE_QUOTA, 0);
  this.setProperty(
      office.localstore.SyncStats.Property.WEBFONTS_SYNC_VERSION, 0);
  this.setProperty(
      office.localstore.SyncStats.Property.LAST_STARTED_SYNC_DOCS, []);
};
goog.inherits(office.localstore.SyncStats, office.localstore.ProfileData);


/**
 * The data type for the sync stats record.
 * @type {string}
 */
office.localstore.SyncStats.DATA_TYPE = 'syncstats';


/**
 * Properties in v5 of the schema.
 * @enum {string}
 */
office.localstore.SyncStats.Property = {
  DOCS_TO_DELETE: 'docsToDelete',
  ENABLED_MIME_TYPES: 'enabledMimeTypes',
  FAILED_TO_SYNC_DOCS: 'failedToSyncDocs',
  LAST_DAILY_RUN_TIME: 'lastDailyRunTime',
  LAST_LOCAL_STORE_PROFILE_TIMESTAMP: 'lastLocalStoreProfileTimestamp',
  LAST_STARTED_SYNC_DOCS: 'lastStartedSyncDocs',
  LAST_SYNC_TIMESTAMP: 'lastSyncTimestamp',
  LAST_SYNCED_CHANGESTAMP: 'lastSyncedChangestamp',
  MAX_SPACE_QUOTA: 'maxSpaceQuota',
  RELEVANT_DOCUMENTS: 'relevantDocuments',
  SYNC_START_TIMESTAMP: 'syncStartTimestamp',
  SYNC_VERSION: 'syncVersion',
  WEBFONTS_SYNC_VERSION: 'webfontsSyncVersion'
};


/**
 * Fields for the data object added to the FAILED_TO_SYNC_DOCS mapped property.
 * @enum {string}
 */
office.localstore.SyncStats.FailedToSyncField = {
  MODEL_SYNC_FAIL_COUNT: 'modelSyncFailCount',
  SERVER_MODIFIED_TIMESTAMP_ON_SYNC_FAIL: 'serverTime',
  TOTAL_SYNC_FAIL_COUNT: 'count'
};


/**
 * Fields for the data object added to the lastStartedSyncDocIds
 */
office.localstore.SyncStats.LastStartedSyncDocField = {
  DOCUMENT_ID: 'documentId',
  TIMESTAMP: 'timestamp'
};


/**
 * The maximum number of last synced documents that should be kept in sync
 * stats.
 * {@private number}
 */
office.localstore.SyncStats.LAST_STARTED_SYNC_DOCS_LENGTH_ = 10;


/**
 * Appends a document and the timestamp when syncing started to the list of last
 * synced documents.
 * @param {string} lastStartedSyncDocId
 * @param {number} timestamp
 */
office.localstore.SyncStats.prototype.addLastStartedSyncDocId =
    function(lastStartedSyncDocId, timestamp) {
  var LastStartedSyncDocField = office.localstore.SyncStats.
      LastStartedSyncDocField;
  var newEntry = {};
  newEntry[LastStartedSyncDocField.DOCUMENT_ID] = lastStartedSyncDocId;
  newEntry[LastStartedSyncDocField.TIMESTAMP] = timestamp;
  var currentEntries = this.getLastStartedSyncDocIds();
  currentEntries.push(newEntry);
  currentEntries.splice(0, currentEntries.length -
      office.localstore.SyncStats.LAST_STARTED_SYNC_DOCS_LENGTH_);
  this.setProperty(
      office.localstore.SyncStats.Property.LAST_STARTED_SYNC_DOCS,
      currentEntries);
};


/**
 * Gets the list of last modified documetns.
 * @return {!Array.<Object>} The list of last modified documents.
 */
office.localstore.SyncStats.prototype.getLastStartedSyncDocIds = function() {
  return this.getNullableArrayProperty(
      office.localstore.SyncStats.Property.LAST_STARTED_SYNC_DOCS) || [];
};


/**
 * @param {!Object} docsToDelete
 */
office.localstore.SyncStats.prototype.setDocsToDelete = function(docsToDelete) {
  this.setProperty(
      office.localstore.SyncStats.Property.DOCS_TO_DELETE, docsToDelete);
};


/**
 * @param {!Array.<string>} docIds
 */
office.localstore.SyncStats.prototype.addDocsToDelete = function(docIds) {
  var docsToDelete = this.getDocsToDelete_();
  for (var i = 0; i < docIds.length; i++) {
    docsToDelete[docIds[i]] = true;
  }
  this.setProperty(
      office.localstore.SyncStats.Property.DOCS_TO_DELETE, docsToDelete);
};


/**
 * @param {string} docId
 */
office.localstore.SyncStats.prototype.removeDocToDelete = function(docId) {
  var docsToDelete = this.getDocsToDelete_();
  if (docsToDelete[docId]) {
    delete docsToDelete[docId];
    this.setProperty(
        office.localstore.SyncStats.Property.DOCS_TO_DELETE,
        docsToDelete);
  }
};


/**
 * @return {!Array.<string>} An array with the ids of documents to be deleted.
 */
office.localstore.SyncStats.prototype.getDocsToDelete = function() {
  return goog.object.getKeys(this.getDocsToDelete_());
};


/**
 * @return {!Object} The object that stores the ids of documents to be deleted.
 * @private
 */
office.localstore.SyncStats.prototype.getDocsToDelete_ = function() {
  return this.getNullableObjectProperty(
      office.localstore.SyncStats.Property.DOCS_TO_DELETE) || {};
};


/**
 * @param {!Array.<string>} relevantDocuments The list of relevant documents
 *    sorted by asc order of relevancy, that is, the most relevant document is
 *    the last one.
 */
office.localstore.SyncStats.prototype.setRelevantDocuments = function(
    relevantDocuments) {
  this.setProperty(office.localstore.SyncStats.Property.RELEVANT_DOCUMENTS,
      relevantDocuments);
};


/**
 * @return {!Array.<string>} An array with the ids of the relevant documents
 *     sorted by asc order, that is, the most relevant document is the last one.
 */
office.localstore.SyncStats.prototype.getRelevantDocuments = function() {
  return this.getNullableArrayProperty(
      office.localstore.SyncStats.Property.RELEVANT_DOCUMENTS) || [];
};


/**
 * Sets the enabled mime types.
 * @param {!Array.<string>} enabledMimeTypes The changestamp.
 */
office.localstore.SyncStats.prototype.setEnabledMimeTypes = function(
    enabledMimeTypes) {
  this.setProperty(office.localstore.SyncStats.Property.ENABLED_MIME_TYPES,
      enabledMimeTypes);
};


/**
 * @return {Array.<string>} The enabled mime types.
 */
office.localstore.SyncStats.prototype.getEnabledMimeTypes = function() {
  return this.getNullableArrayProperty(
      office.localstore.SyncStats.Property.ENABLED_MIME_TYPES);
};


/**
 * Sets the last local store profile timestamp.
 * @param {number} lastLocalStoreProfileTimestamp The timestamp.
 */
office.localstore.SyncStats.prototype.setLastLocalStoreProfileTimestamp =
    function(lastLocalStoreProfileTimestamp) {
  this.setProperty(
      office.localstore.SyncStats.Property.LAST_LOCAL_STORE_PROFILE_TIMESTAMP,
      lastLocalStoreProfileTimestamp);
};


/**
 * @return {?number} The last local store profile timestamp.
 */
office.localstore.SyncStats.prototype.getLastLocalStoreProfileTimestamp =
    function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.SyncStats.Property.LAST_LOCAL_STORE_PROFILE_TIMESTAMP);
};


/**
 * Sets the last sync timestamp.
 * @param {number} lastSyncTimestamp The timestamp.
 */
office.localstore.SyncStats.prototype.setLastSyncTimestamp = function(
    lastSyncTimestamp) {
  this.setProperty(office.localstore.SyncStats.Property.LAST_SYNC_TIMESTAMP,
      lastSyncTimestamp);
};


/**
 * @return {?number} The last sync timestamp.
 */
office.localstore.SyncStats.prototype.getLastSyncTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.SyncStats.Property.LAST_SYNC_TIMESTAMP);
};


/**
 * Sets the last synced changestamp.
 * @param {number} lastSyncedChangestamp The changestamp.
 */
office.localstore.SyncStats.prototype.setLastSyncedChangestamp = function(
    lastSyncedChangestamp) {
  this.setProperty(office.localstore.SyncStats.Property.LAST_SYNCED_CHANGESTAMP,
      lastSyncedChangestamp);
};


/**
 * @return {number} The last synced changestamp.
 */
office.localstore.SyncStats.prototype.getLastSyncedChangestamp = function() {
  return this.getNumberProperty(
      office.localstore.SyncStats.Property.LAST_SYNCED_CHANGESTAMP);
};


/**
 * Sets the sync start timestamp.
 * @param {number} syncStartTimestamp The timestamp.
 */
office.localstore.SyncStats.prototype.setSyncStartTimestamp = function(
    syncStartTimestamp) {
  this.setProperty(office.localstore.SyncStats.Property.SYNC_START_TIMESTAMP,
      syncStartTimestamp);
};


/**
 * @return {?number} The sync start timestamp.
 */
office.localstore.SyncStats.prototype.getSyncStartTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.SyncStats.Property.SYNC_START_TIMESTAMP);
};


/**
 * Sets the sync version.
 * @param {number} syncVersion The sync version.
 */
office.localstore.SyncStats.prototype.setSyncVersion = function(
    syncVersion) {
  this.setProperty(office.localstore.SyncStats.Property.SYNC_VERSION,
      syncVersion);
};


/**
 * @return {number} The sync version.
 */
office.localstore.SyncStats.prototype.getSyncVersion = function() {
  return this.getNumberProperty(
      office.localstore.SyncStats.Property.SYNC_VERSION);
};


/**
 * Sets the webfonts sync version number.
 * @param {number} version Sets the webfonts resync version.
 */
office.localstore.SyncStats.prototype.setWebfontsSyncVersion = function(
    version) {
  this.setProperty(
      office.localstore.SyncStats.Property.WEBFONTS_SYNC_VERSION, version);
};


/**
 * @return {number} The webfonts sync version. When this differs from
 *     storage, all webfonts will be deleted and then resynced.
 */
office.localstore.SyncStats.prototype.getWebfontsSyncVersion = function() {
  return this.getNumberProperty(
      office.localstore.SyncStats.Property.WEBFONTS_SYNC_VERSION);
};


/**
 * Sets the last time the once-a-day run was run.
 * @param {number} lastRunTime The last time the once-a-day run was run.
 */
office.localstore.SyncStats.prototype.setLastDailyRunTime = function(
    lastRunTime) {
  this.setProperty(office.localstore.SyncStats.Property.LAST_DAILY_RUN_TIME,
      lastRunTime);
};


/**
 * @return {number} The last time the once-a-day run was run.
 */
office.localstore.SyncStats.prototype.getLastDailyRunTime = function() {
  return this.getNumberProperty(
      office.localstore.SyncStats.Property.LAST_DAILY_RUN_TIME);
};


/**
 * @param {number} maxSpaceQuota The maximum space to be used by Docs offline.
 */
office.localstore.SyncStats.prototype.setMaxSpaceQuota = function(maxSpaceQuota) {
  this.setProperty(office.localstore.SyncStats.Property.MAX_SPACE_QUOTA,
      maxSpaceQuota);
};


/**
 * @return {number} The maximum space to be used by Docs offline.
 */
office.localstore.SyncStats.prototype.getMaxSpaceQuota = function() {
  return this.getNumberProperty(
      office.localstore.SyncStats.Property.MAX_SPACE_QUOTA);
};


/**
 * Records a sync failure to the given document.
 * @param {string} docId
 * @param {boolean} modelSyncFailed
 * @param {number} serverModifiedTimestamp
 */
office.localstore.SyncStats.prototype.recordSyncFailure = function(docId,
    modelSyncFailed, serverModifiedTimestamp) {
  var FailedToSyncField = office.localstore.SyncStats.FailedToSyncField;
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  var currentSyncFailData = failedToSyncDocs[docId];
  var newSyncFailData = {};
  newSyncFailData[FailedToSyncField.TOTAL_SYNC_FAIL_COUNT] =
      currentSyncFailData ?
          currentSyncFailData[FailedToSyncField.TOTAL_SYNC_FAIL_COUNT] + 1 :
          1;

  newSyncFailData[FailedToSyncField.MODEL_SYNC_FAIL_COUNT] =
      (currentSyncFailData ?
          currentSyncFailData[FailedToSyncField.MODEL_SYNC_FAIL_COUNT] : 0) +
      (modelSyncFailed ? 1 : 0);

  newSyncFailData[FailedToSyncField.SERVER_MODIFIED_TIMESTAMP_ON_SYNC_FAIL] =
      serverModifiedTimestamp;

  failedToSyncDocs[docId] = newSyncFailData;
  this.setProperty(
      office.localstore.SyncStats.Property.FAILED_TO_SYNC_DOCS, failedToSyncDocs);
};


/**
 * Adds a document to the list of documents that failed to sync with the
 * given fail counters.
 * @param {string} docId The document id.
 * @param {number} failCount How many times the sync failed. This includes all
 *     kinds of failures, e.g. model, images, discussion.
 * @param {number} modelSyncFailCount How many times the model sync failed.
 * @param {number} serverModifiedTimestamp The server modified timestamp.
 */
office.localstore.SyncStats.prototype.setSyncFailed = function(
    docId, failCount, modelSyncFailCount, serverModifiedTimestamp) {
  var FailedToSyncField = office.localstore.SyncStats.FailedToSyncField;
  var data = {};
  data[FailedToSyncField.TOTAL_SYNC_FAIL_COUNT] = failCount;
  data[FailedToSyncField.MODEL_SYNC_FAIL_COUNT] = modelSyncFailCount;
  data[FailedToSyncField.SERVER_MODIFIED_TIMESTAMP_ON_SYNC_FAIL] =
      serverModifiedTimestamp;

  var failedToSyncDocs = this.getFailedToSyncDocs_();
  failedToSyncDocs[docId] = data;

  this.setProperty(
      office.localstore.SyncStats.Property.FAILED_TO_SYNC_DOCS, failedToSyncDocs);
};


/**
 * Removes the given document from the list of documents that failed to sync.
 * @param {string} docId The document id.
 */
office.localstore.SyncStats.prototype.removeSyncFailed = function(docId) {
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  if (goog.isDef(failedToSyncDocs[docId])) {
    delete failedToSyncDocs[docId];
    this.setProperty(
        office.localstore.SyncStats.Property.FAILED_TO_SYNC_DOCS,
        failedToSyncDocs);
  }
};


/**
 * Gets the total sync fail counter for the given document.
 * @param {string} docId The document id.
 * @return {number} How many times the document failed to sync.
 */
office.localstore.SyncStats.prototype.getSyncFailedCount = function(docId) {
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  var data = failedToSyncDocs[docId];
  return goog.isDefAndNotNull(data) ?
      data[office.localstore.SyncStats.FailedToSyncField.TOTAL_SYNC_FAIL_COUNT] :
      0;
};


/**
 * Gets the model sync fail counter for the given document.
 * @param {string} docId The document id.
 * @return {number} How many times the document failed to sync.
 */
office.localstore.SyncStats.prototype.getModelSyncFailedCount = function(docId) {
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  var data = failedToSyncDocs[docId];
  return goog.isDefAndNotNull(data) ?
      data[office.localstore.SyncStats.FailedToSyncField.MODEL_SYNC_FAIL_COUNT] :
      0;
};


/**
 * Gets the server modified timestamp from the last sync fail for the given
 * document.
 * @param {string} docId The document id.
 * @return {number} The server modified timestamp.
 */
office.localstore.SyncStats.prototype.getServerModifiedTimestampOnSyncFail =
    function(docId) {
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  var data = failedToSyncDocs[docId];
  return goog.isDefAndNotNull(data) ? data[office.localstore.SyncStats.
      FailedToSyncField.SERVER_MODIFIED_TIMESTAMP_ON_SYNC_FAIL] : 0;
};


/**
 * Gets the ids of documents that failed to sync.
 * @return {!Array.<string>} The map with failed to sync office.
 */
office.localstore.SyncStats.prototype.getFailedToSyncDocIds = function() {
  var failedToSyncDocs = this.getFailedToSyncDocs_();
  return goog.object.getKeys(failedToSyncDocs);
};


/**
 * Gets the failedToSyncDocs property. If it doesn't exist, returns a new
 * object.
 * @return {Object} The failedToSyncDocs object.
 * @private
 */
office.localstore.SyncStats.prototype.getFailedToSyncDocs_ = function() {
  var failedToSyncDocs = this.getNullableObjectProperty(
      office.localstore.SyncStats.Property.FAILED_TO_SYNC_DOCS);

  return failedToSyncDocs == null ? {} : failedToSyncDocs;
};
