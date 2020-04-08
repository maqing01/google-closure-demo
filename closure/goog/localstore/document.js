goog.provide('office.localstore.Document');
goog.provide('office.localstore.Document.AccessLevel');
goog.provide('office.localstore.Document.Property');
goog.provide('office.localstore.Document.Property_v2');
goog.provide('office.localstore.Document.Type');
goog.provide('office.localstore.EditorBinaryConfig');

goog.require('office.localstore.DocumentLockRequirement');
goog.require('office.localstore.Record');
goog.require('office.offline.url.CommentMode');



/**
 * @param {string} id The document's id.
 * @param {string} type The document's type.
 * @param {boolean} isNew Whether this is a new document, with no presence in
 *      local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.Document = function(id, type, isNew) {
  goog.base(this, office.localstore.Record.Type.DOCUMENT, isNew);
  this.setProperty(office.localstore.Document.Property.ID, id);
  this.setProperty(office.localstore.Document.Property.DOCUMENT_TYPE, type);
};
goog.inherits(office.localstore.Document, office.localstore.Record);


/**
 * Properties in v1 of the schema.
 * @enum {string}
 */
office.localstore.Document.Property = {
  ID: 'a11',
  TITLE: '12',
  DOCUMENT_TYPE: '13',
  LAST_SYNCED_TIMESTAMP: '14',
  JOBSET: '15',
  ACL: '16',
  IS_FAST_TRACK: '17',
  STARTUP_HINTS: '18'
};


/**
 * Properties in v2 of the schema.
 * @enum {string}
 */
office.localstore.Document.Property_v2 = {
  LAST_MODIFIED_SERVER_TIMESTAMP: '21',
  LAST_COLD_STARTED_TIMESTAMP: '22',
  LAST_WARM_STARTED_TIMESTAMP: '23'
};


/**
 * Properties in v4 of the schema.
 * @enum {string}
 */
office.localstore.Document.Property_v4 = {
  DOCOS_KEY_DATA: '31',
  IS_NOT_CREATED: '32',
  LAST_MODIFIED_CLIENT_TIMESTAMP: '33'
};


/**
 * Properties in v6 of the schema.
 * @enum {string}
 */
office.localstore.Document.Property_v6 = {
  HAS_PARTIAL_MODEL_DATA_ONLY: '41',
  INITIAL_COMMANDS: '42',
  IS_PARTIALLY_SYNCED: '43',
  FOLDER_AT_CREATION_TIME: '44',
  MODEL_NEEDS_RESYNC: '45'
};


/**
 * Document types.
 *  Move this outside office.localstore.
 * @enum {string}
 */
office.localstore.Document.Type = {
  //TEST: 'test',
  VODKA: 'vodka',
  //TRIX: 'trix',
  //DRAWING: 'drawing',
  MATRIX: 'matrix',
  TACO: 'taco'
  //SYNCSTATS: 'syncstats'
};


/**
 * Access levels a user might have to a document.  These are used to decide
 * whether a document appears in a particular user's doclist, and eventually
 * will govern whether the document is available for editing while offline, or
 * only viewing.
 * NOTE: Should be kept in sync with com.google.apps.office.model.AccessLevelHint.
 * @enum {number}
 */
office.localstore.Document.AccessLevel = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  OWN: 3,
  COMMENT: 4
};


/**
 * Access level in ascending order of privilege.
 * @type {!Array.<office.localstore.Document.AccessLevel>}
 */
office.localstore.Document.AccessLevelOrder = [
  office.localstore.Document.AccessLevel.NONE,
  office.localstore.Document.AccessLevel.READ,
  office.localstore.Document.AccessLevel.COMMENT,
  office.localstore.Document.AccessLevel.WRITE,
  office.localstore.Document.AccessLevel.OWN
];


/** @override */
office.localstore.Document.prototype.shouldWriteIfClean = function() {
  // Documents must be written down to storage even when clean, as writing
  // them will update the last synced date.
  return true;
};


/**
 * Gets the document's id.
 * @return {string} The document id.
 */
office.localstore.Document.prototype.getId = function() {
  return this.getStringProperty(office.localstore.Document.Property.ID);
};


/**
 * Sets the document's title.
 * @param {?string} title The title.
 */
office.localstore.Document.prototype.setTitle = function(title) {
  this.setProperty(office.localstore.Document.Property.TITLE, title);
};


/**
 * @return {?string} The title.
 */
office.localstore.Document.prototype.getTitle = function() {
  return this.getNullableStringProperty(
      office.localstore.Document.Property.TITLE);
};


/**
 * @return {string} The document type.
 */
office.localstore.Document.prototype.getType = function() {
  return this.getStringProperty(
      office.localstore.Document.Property.DOCUMENT_TYPE);
};


/**
 * Sets the document's jobset.
 * @param {?string} jobset The jobset.
 */
office.localstore.Document.prototype.setJobset = function(jobset) {
  this.setProperty(office.localstore.Document.Property.JOBSET, jobset);
};


/**
 * @return {?string} The document's jobset.
 */
office.localstore.Document.prototype.getJobset = function() {
  return this.getNullableStringProperty(
      office.localstore.Document.Property.JOBSET);
};


/**
 * Package-private.  Sets the document's last synced timestamp.
 * @param {?number} lastSyncedTimestamp The timestamp.
 */
office.localstore.Document.prototype.setLastSyncedTimestamp = function(
    lastSyncedTimestamp) {
  this.setProperty(office.localstore.Document.Property.LAST_SYNCED_TIMESTAMP,
      lastSyncedTimestamp);
};


/**
 * Sets the document's last synced timestamp to now.
 */
office.localstore.Document.prototype.setLastSyncedTimestampToNow = function() {
  this.setLastSyncedTimestamp(goog.now());
};


/**
 * Sets the document's last synced timestamp to now, but only if this document
 * has actually been modified.
 */
office.localstore.Document.prototype.setLastSyncedTimestampToNowIfModified =
    function() {
  if (this.isModified()) {
    this.setLastSyncedTimestampToNow();
  }
};


/**
 * @return {?number} The document's last synced timestamp.
 */
office.localstore.Document.prototype.getLastSyncedTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.Document.Property.LAST_SYNCED_TIMESTAMP);
};


/**
 * Set a user's access level.
 * @param {string} userId The user's id.
 * @param {office.localstore.Document.AccessLevel} accessLevel The access level.
 */
office.localstore.Document.prototype.setAccessLevel = function(userId,
    accessLevel) {
  this.setMappedProperty(office.localstore.Document.Property.ACL, userId,
      accessLevel);
};


/**
 * Get a user's access level.
 * @param {string} userId The user's id.
 * @return {office.localstore.Document.AccessLevel} The access level.
 */
office.localstore.Document.prototype.getAccessLevel = function(userId) {
  var accessLevel = this.getMappedPropertyValue(
      office.localstore.Document.Property.ACL, userId);
  if (accessLevel != null) {
    return /** @type {office.localstore.Document.AccessLevel} */ (accessLevel);
  } else {
    // Workaround for b/14893580 to default trix withiout ACL to READ.
    return this.getType() == office.localstore.Document.Type.TRIX ?
        office.localstore.Document.AccessLevel.READ :
        office.localstore.Document.AccessLevel.NONE;
  }
};


/**
 * Get the access level for the only user with ACL for this document record.
 * @return {office.localstore.Document.AccessLevel} The access level for the only
 *     user, or access level NONE if there is no user or more than one user. The
 *     current desktop and mobile implementations require at most one user, so
 *     it is an error if we find more than one user.
 */
office.localstore.Document.prototype.getAccessLevelForOnlyUser = function() {
  var accessLevels =
      this.getNullableProperty(office.localstore.Document.Property.ACL);
  var accessLevel = office.localstore.Document.AccessLevel.NONE;
  var users = 0;
  if (accessLevels) {
    for (var userId in accessLevels) {
      accessLevel = accessLevels[userId];
      users++;
    }
  }
  // Only return an access level different from NONE if there is exactly one
  // user with ACL for this document record.
  if (users == 1) {
    return accessLevel;
  }
  // Workaround for b/14893580 to default trix withiout ACL to READ.
  return users == 0 && this.getType() == office.localstore.Document.Type.TRIX ?
      office.localstore.Document.AccessLevel.READ :
      office.localstore.Document.AccessLevel.NONE;

};


/**
 * @param {boolean} isFastTrack Whether this document is on the feature
 *     fast track.
 */
office.localstore.Document.prototype.setIsFastTrack = function(isFastTrack) {
  this.setBooleanProperty(office.localstore.Document.Property.IS_FAST_TRACK,
      isFastTrack);
};


/**
 * @return {boolean} The document's fast-track bit.
 */
office.localstore.Document.prototype.getIsFastTrack = function() {
  //  switch to getBooleanProperty once we're confident all
  // Document records have been migrated to the new storage format (which
  // disallows null).
  return this.getLegacyBooleanProperty(
      office.localstore.Document.Property.IS_FAST_TRACK);
};


/**
 * Sets the document's last modified timestamp.
 * @param {number} lastModifiedTimestamp Timestamp in milliseconds since the
 *     epoch, in server time.
 */
office.localstore.Document.prototype.setLastModifiedServerTimestamp = function(
    lastModifiedTimestamp) {
  this.setProperty(
      office.localstore.Document.Property_v2.LAST_MODIFIED_SERVER_TIMESTAMP,
      lastModifiedTimestamp);
};


/**
 * @return {?number} The document's last modified timestamp in milliseconds
 *     since the epoch in server time, or null if the timestamp is unknown. The
 *     timestamp is unknown if this was a record written before we started
 *     collecting timestamps.
 */
office.localstore.Document.prototype.getLastModifiedServerTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.Document.Property_v2.LAST_MODIFIED_SERVER_TIMESTAMP);
};


/**
 * Sets the timestmap at which the document was last cold-started.
 * @param {number} lastColdStartedTimestamp Timestamp in milliseconds since the
 *     epoch, client-side time.
 */
office.localstore.Document.prototype.setLastColdStartedTimestamp = function(
    lastColdStartedTimestamp) {
  this.setProperty(
      office.localstore.Document.Property_v2.LAST_COLD_STARTED_TIMESTAMP,
      lastColdStartedTimestamp);
};


/**
 * @return {?number} The timestamp at which the document was last cold-started
 *     in milliseconds since the epoch in client-side time, or null if the
 *     timestamp is unknown. The timestamp is unknown if this was a record
 *     written before we started collecting timestamps.
 */
office.localstore.Document.prototype.getLastColdStartedTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.Document.Property_v2.LAST_COLD_STARTED_TIMESTAMP);
};


/**
 * Sets the timestmap at which the document was last warm-started.
 * @param {number} lastWarmStartedTimestamp Timestamp in milliseconds since the
 *     epoch, client-side time.
 */
office.localstore.Document.prototype.setLastWarmStartedTimestamp = function(
    lastWarmStartedTimestamp) {
  this.setProperty(
      office.localstore.Document.Property_v2.LAST_WARM_STARTED_TIMESTAMP,
      lastWarmStartedTimestamp);
};


/**
 * @return {?number} The timestamp at which the document was last warm-started
 *     in milliseconds since the epoch in client-side time, or null if the
 *     timestamp is unknown. The timestamp is unknown if this was a record
 *     written before we started collecting timestamps.
 */
office.localstore.Document.prototype.getLastWarmStartedTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.Document.Property_v2.LAST_WARM_STARTED_TIMESTAMP);
};


/**
 * Sets serialized docos KeyData object. It contains document- and user-specific
 * data required by docos code to run.
 * @param {!Array} docosKeyData KeyData to set.
 */
office.localstore.Document.prototype.setDocosKeyData = function(docosKeyData) {
  this.setProperty(
      office.localstore.Document.Property_v4.DOCOS_KEY_DATA, docosKeyData);
};


/**
 * @return {Array} The serialized object, containing document- and user-specific
 *     data required by docos code to run. Can be null when not set.
 */
office.localstore.Document.prototype.getDocosKeyData = function() {
  return this.getNullableArrayProperty(
      office.localstore.Document.Property_v4.DOCOS_KEY_DATA);
};


/**
 * @return {?office.offline.url.CommentMode} The document's comment mode,
 *     may be null if comments are not enabled.
 */
office.localstore.Document.prototype.getCommentMode = function() {
  var keyData = this.getDocosKeyData();
  if (!keyData) {
    return null;
  } else if (!goog.isArray(keyData)) {
    throw Error('Non-array keyData');
  } else if (keyData.length == 0) {
    return office.offline.url.CommentMode.LEGACY;
  } else {
    return office.offline.url.CommentMode.DOCOS;
  }
};


/**
 * Sets whether the document is created on the server.
 * @param {boolean} isCreated Whether the document has been created on the
 *     server.
 */
office.localstore.Document.prototype.setIsCreated = function(isCreated) {
  this.setBooleanProperty(office.localstore.Document.Property_v4.IS_NOT_CREATED,
      !isCreated);
};


/**
 * Gets whether the document is created on the server. If this is not written in
 * storage or null, it is assumed that the document is created on the server.
 * @return {boolean} Whether the document has been created on the server.
 */
office.localstore.Document.prototype.getIsCreated = function() {
  return !this.getNullableBooleanProperty(
      office.localstore.Document.Property_v4.IS_NOT_CREATED);
};


/**
 * Sets whether the document contains only partial model information. If true,
 * it means that the document cannot be used when loading from localstore and
 * will not be displayed to the user in e.g the doc list.
 * @param {boolean} isPartialModelOnly Whether the document contains only
 *     partial model information.
 */
office.localstore.Document.prototype.setHasPartialModelDataOnly = function(
    isPartialModelOnly) {
  this.setBooleanProperty(
      office.localstore.Document.Property_v6.HAS_PARTIAL_MODEL_DATA_ONLY,
      isPartialModelOnly);
};


/**
 * Gets whether the document contains only partial model information. If true,
 * it means that the document cannot be used when loading from localstore and
 * will not be displayed to the user in e.g the doc list.
 * @return {boolean} Whether the document contains only partial model
 *     information.
 */
office.localstore.Document.prototype.getHasPartialModelDataOnly = function() {
  return !!this.getNullableBooleanProperty(
      office.localstore.Document.Property_v6.HAS_PARTIAL_MODEL_DATA_ONLY);
};


/**
 * Sets whether the document is partially synced. If true, it means that
 * the model and entities were synced, but some of the docos might not be
 * up to date.
 * @param {boolean} isPartiallySynced
 */
office.localstore.Document.prototype.setIsPartiallySynced = function(
    isPartiallySynced) {
  this.setBooleanProperty(
      office.localstore.Document.Property_v6.IS_PARTIALLY_SYNCED,
      isPartiallySynced);
};


/**
 * Gets whether the document is only partially synced, i.e., the model and
 * entities are up to date, but docos might not be up to date.
 * @return {boolean} Whether the document is only partially synced.
 */
office.localstore.Document.prototype.getIsPartiallySynced = function() {
  return !!this.getNullableBooleanProperty(
      office.localstore.Document.Property_v6.IS_PARTIALLY_SYNCED);
};


/**
 * Sets the last modified client timestamp.
 * @param {?number} lastModifiedClientTimestamp Timestamp in milliseconds or
 *     null to indicate there are no client modifications.
 */
office.localstore.Document.prototype.setLastModifiedClientTimestamp = function(
    lastModifiedClientTimestamp) {
  this.setProperty(
      office.localstore.Document.Property_v4.LAST_MODIFIED_CLIENT_TIMESTAMP,
      lastModifiedClientTimestamp);
};


/**
 * Gets the last modified client timestamp or null if unknown.
 * @return {?number} The last modified client timestamp or null if unknown or no
 *     client modifications.
 */
office.localstore.Document.prototype.getLastModifiedClientTimestamp = function() {
  return this.getTimestampPropertyOrNull(
      office.localstore.Document.Property_v4.LAST_MODIFIED_CLIENT_TIMESTAMP);
};


/** @override */
office.localstore.Document.prototype.getDocumentLockRequirement = function() {
  return this.isToBeDeleted() ?
      new office.localstore.DocumentLockRequirement(this.getId(),
          office.localstore.DocumentLockRequirement.Level.AVAILABLE) :
      goog.base(this, 'getDocumentLockRequirement');
};


/**
 * @return {!office.localstore.EditorBinaryConfig} The properties of the editor
 *     this document should be opened with.
 */
office.localstore.Document.prototype.getEditorBinaryConfig = function() {
  var type = this.getType();
  var jobset = this.getJobset();
  var isFastTrack;

  // Work around a V8 optimization bug that can trigger here for some
  // reason. The try-catch will prevent any optimizations from kicking in in
  // here. See http://b/9319401 and http://crbug.com/260345. This should be
  // reverted once V8 3.18.5.13 has rolled out to m28 or there are no more m28
  // users.
  try {
    isFastTrack = this.getIsFastTrack();
  } catch (e) {
    throw e;
  }

  return {type: type, jobset: jobset, isFastTrack: isFastTrack};
};


/**
 * Represents the properties of an editor binary a document is opened with.
 * @typedef {{type: string,
 *            jobset: ?string,
 *            isFastTrack: boolean}}
 */
office.localstore.EditorBinaryConfig;


/**
 * Sets a startup hint.
 * @param {!string} key The startup hint key.
 * @param {!string} value The startup hint value.
 */
office.localstore.Document.prototype.setStartupHint = function(key, value) {
  this.setMappedProperty(office.localstore.Document.Property.STARTUP_HINTS, key,
      value);
};


/**
 * Returns a list of startup hints.
 * @return {Object.<string,string>} List of startup hints or null if empty.
 */
office.localstore.Document.prototype.getStartupHints =
    function() {
  return this.getNullableObjectProperty(
      office.localstore.Document.Property.STARTUP_HINTS);
};


/**
 * Sets the initial commands.
 * @param {!Array.<!Object>} initialCommands The initial commands (serialized).
 */
office.localstore.Document.prototype.setSerializedInitialCommands = function(
    initialCommands) {
  this.setProperty(office.localstore.Document.Property_v6.INITIAL_COMMANDS,
      initialCommands);
};


/**
 * Gets an array of the serialied initial commands.
 * @return {Array.<!Object>} The initial commands or null if not set.
 */
office.localstore.Document.prototype.getSerializedInitialCommands = function() {
  return this.getNullableArrayProperty(
      office.localstore.Document.Property_v6.INITIAL_COMMANDS);
};


/**
 * Sets the the Id of the folder in which the document should be created.
 * @param {?string} folderAtCreationTime The folder Id at creation time.
 */
office.localstore.Document.prototype.setFolderAtCreationTime =
    function(folderAtCreationTime) {
  this.setProperty(office.localstore.Document.Property_v6.FOLDER_AT_CREATION_TIME,
      folderAtCreationTime);
};


/**
 * @return {?string} The the Id of the folder in which the document should be
 *     created.
 */
office.localstore.Document.prototype.getFolderAtCreationTime = function() {
  return this.getNullableStringProperty(
      office.localstore.Document.Property_v6.FOLDER_AT_CREATION_TIME);
};


/**
 * Sets whether the document model needs resync. The model needs resync in cases
 * where the ACL gets changed, and the user's pending queue no longer matches
 * the projection they would use for warm start. Due to the model projection on
 * the server, the user may be given a model in a projection that does not match
 * the local model.
 * @param {boolean} needsResync
 */
office.localstore.Document.prototype.setModelNeedsResync = function(needsResync) {
  this.setBooleanProperty(
      office.localstore.Document.Property_v6.MODEL_NEEDS_RESYNC, needsResync);
};


/**
 * @return {boolean} Whether the document is marked as needing resync. Returns
 *     false if not present in the storage record.
 */
office.localstore.Document.prototype.getModelNeedsResync = function() {
  return !!this.getNullableBooleanProperty(
      office.localstore.Document.Property_v6.MODEL_NEEDS_RESYNC);
};
