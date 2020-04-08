goog.provide('office.localstore.PendingQueue');
goog.provide('office.localstore.PendingQueue.Operation');
goog.provide('office.localstore.PendingQueue.Property');

/** @suppress {extraRequire} Needed for offline launcher */
goog.require('office.commands.Command');
goog.require('office.localstore.Document');
goog.require('office.localstore.DocumentLockRequirement');
goog.require('office.localstore.Record');
goog.require('office.storage.CommandBundle');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * A pending queue record. Should not be called outside of this package.
 * @param {string} docId
 * @param {office.localstore.Document.Type} type
 * @param {boolean} isNew Whether this is a new queue, with no presence in
 *      local storage.
 * @param {number} lastEntryIndex The index of the last stored command entry.
 * @param {!Array.<!office.storage.CommandBundle>} sentCommandBundles The
 *     list of command bundles that have been marked as sent to the server.
 * @param {!Array.<!office.commands.Command>} unsentCommands The list of unsent
 *     commands.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.PendingQueue = function(
    docId, type, isNew, lastEntryIndex, sentCommandBundles, unsentCommands) {
  goog.base(this, office.localstore.Record.Type.PENDING_QUEUE, isNew);

  /**
   * The index of the last stored command entry.
   * @type {number}
   * @private
   */
  this.lastEntryIndex_ = lastEntryIndex;

  /**
   * The list of command bundles that have been marked as sent to the server.
   * @type {!Array.<!office.storage.CommandBundle>}
   * @private
   */
  this.sentCommandBundles_ = sentCommandBundles.concat();

  /**
   * The list of unsent commands.
   * @type {!Array.<!office.commands.Command>}
   * @private
   */
  this.unsentCommands_ = unsentCommands.concat();

  this.setProperty(office.localstore.PendingQueue.Property.DOC_ID, docId);
  this.setProperty(office.localstore.PendingQueue.Property.DOC_TYPE, type);
  this.setProperty(office.localstore.PendingQueue.Property.REVISION, -1);
  this.setBooleanProperty(office.localstore.PendingQueue.Property.UNDELIVERABLE,
      false);
  this.setBooleanProperty(office.localstore.PendingQueue.Property.UNSAVED_CHANGES,
      false);
};
goog.inherits(office.localstore.PendingQueue, office.localstore.Record);


/**
 * @enum {string}
 */
office.localstore.PendingQueue.Property = {
  ACCESS_LEVEL: '11',
  DOC_ID: '12',
  DOC_TYPE: '13',
  REVISION: '14',
  UNDELIVERABLE: '15',
  UNSAVED_CHANGES: '16'
};


/**
 * @enum {number}
 */
office.localstore.PendingQueue.Operation = {
  APPEND: 1,
  CLEAR: 2,
  CLEAR_SENT: 3,
  CLEAR_SENT_BUNDLE: 4,
  MARK_SENT: 5,
  NONE: 6,
  REPLACE: 7
};


/**
 * The queue operation held for the next write.
 * @type {office.localstore.PendingQueue.Operation}
 * @private
 */
office.localstore.PendingQueue.prototype.operation_ =
    office.localstore.PendingQueue.Operation.NONE;


/**
 * The commands for a pending append or replace operation.
 * @type {Array.<!office.commands.Command>}
 * @private
 */
office.localstore.PendingQueue.prototype.operationCommands_ = null;


/**
 * The sent command bundles for a pending replace operation.
 * @type {Array.<!office.storage.CommandBundle>}
 * @private
 */
office.localstore.PendingQueue.prototype.operationSentCommandBundles_ = null;


/**
 * @type {?string}
 * @private
 */
office.localstore.PendingQueue.prototype.operationSessionId_ = null;


/**
 * @type {?number}
 * @private
 */
office.localstore.PendingQueue.prototype.operationRequestId_ = null;


/**
 * Gets the pending queue's document id.
 * @return {string} The document id.
 */
office.localstore.PendingQueue.prototype.getDocId = function() {
  return this.getStringProperty(office.localstore.PendingQueue.Property.DOC_ID);
};


/**
 * @return {boolean} If the pending queue has been marked as undeliverable.
 */
office.localstore.PendingQueue.prototype.isUndeliverable = function() {
  //  Just use getBooleanProperty once we're confident all
  // pending queues have been migrated to the new storage format (which
  // disallows null).
  return this.getLegacyBooleanProperty(
      office.localstore.PendingQueue.Property.UNDELIVERABLE);
};


/**
 * Sets whether the pending queue is marked as undeliverable.
 * @param {boolean} isUndeliverable Whether to mark the queue as undeliverable.
 */
office.localstore.PendingQueue.prototype.setUndeliverable = function(
    isUndeliverable) {
  this.setBooleanProperty(office.localstore.PendingQueue.Property.UNDELIVERABLE,
      isUndeliverable);
};


/**
 * Sets the pending queue's revision.
 * @param {number} revision The queue's revision.
 */
office.localstore.PendingQueue.prototype.setRevision = function(revision) {
  this.setProperty(office.localstore.PendingQueue.Property.REVISION, revision);
};


/**
 * Gets the pending queue's revision.
 * @return {number} The queue's revision.
 */
office.localstore.PendingQueue.prototype.getRevision = function() {
  return this.getNumberProperty(office.localstore.PendingQueue.Property.REVISION);
};


/**
 * Sets whether the pending queue has unsaved changes.
 * @param {boolean} hasUnsavedChanges Whether the pending queue has unsved
 *     changes.
 */
office.localstore.PendingQueue.prototype.setUnsavedChanges = function(
    hasUnsavedChanges) {
  this.setBooleanProperty(office.localstore.PendingQueue.Property.UNSAVED_CHANGES,
      hasUnsavedChanges);
};


/**
 * Returns whether the pending queue has unsaved changes.
 * @return {boolean} Whether the pending queue has unsaved changes.
 */
office.localstore.PendingQueue.prototype.hasUnsavedChanges = function() {
  return this.getBooleanProperty(
      office.localstore.PendingQueue.Property.UNSAVED_CHANGES);
};


/**
 * @return {string} The document type.
 */
office.localstore.PendingQueue.prototype.getType = function() {
  return this.getStringProperty(office.localstore.PendingQueue.Property.DOC_TYPE);
};


/**
 * @return {office.localstore.Document.AccessLevel} The access level. If not
 *     present in the record, the access level will default to OWN, on the
 *     basis that most users that did not have this access level likely are
 *     editing their own office. If there is ever a projection difference between
 *     COMMENT, WRITE, and OWN, this will likely need to be modified to be set
 *     in a schema migration before those projection differences are rolled out.
 */
office.localstore.PendingQueue.prototype.getAccessLevel = function() {
  var numberProperty = this.getNullableNumberProperty(
      office.localstore.PendingQueue.Property.ACCESS_LEVEL);
  if (goog.isNull(numberProperty)) {
    return office.localstore.Document.AccessLevel.OWN;
  }
  return /** @type {office.localstore.Document.AccessLevel} */ (numberProperty);
};


/**
 * @param {office.localstore.Document.AccessLevel} accessLevel
 */
office.localstore.PendingQueue.prototype.setAccessLevel = function(accessLevel) {
  this.setProperty(
      office.localstore.PendingQueue.Property.ACCESS_LEVEL, accessLevel);
};


/**
 * @return {boolean} Whether the queue is empty.
 */
office.localstore.PendingQueue.prototype.isEmpty = function() {
  goog.asserts.assert(this.sentCommandBundles_);
  goog.asserts.assert(this.unsentCommands_);
  return this.unsentCommands_.length == 0 &&
      this.sentCommandBundles_.length == 0;
};


/**
 * Appends commands to the end of the queue.
 * @param {!Array.<!office.commands.Command>} commands The commands to append.
 */
office.localstore.PendingQueue.prototype.appendCommands = function(commands) {
  this.setOperation_(office.localstore.PendingQueue.Operation.APPEND);
  this.operationCommands_ = commands.length > 0 ?
      commands.concat() : null;
  goog.array.extend(this.unsentCommands_, commands);
};


/**
 * Marks the unsent commands on the queue as sent, with the given session and
 * request IDs.
 * @param {string} sessionId The session ID.
 * @param {number} requestId The request ID.
 */
office.localstore.PendingQueue.prototype.markSent = function(
    sessionId, requestId) {
  this.setOperation_(office.localstore.PendingQueue.Operation.MARK_SENT);
  this.operationSessionId_ = sessionId;
  this.operationRequestId_ = requestId;

  var commandBundle = new office.storage.CommandBundle(
      /** @type {!Array.<!office.commands.Command>} */ (this.unsentCommands_),
      requestId, sessionId);
  this.unsentCommands_ = [];
  this.sentCommandBundles_.push(commandBundle);
};


/**
 * Removes the first sent bundle and returns its commands.
 * @return {!Array.<!office.commands.Command>} The removed commands.
 */
office.localstore.PendingQueue.prototype.clearSentBundle = function() {
  this.setOperation_(office.localstore.PendingQueue.Operation.CLEAR_SENT_BUNDLE);
  return this.sentCommandBundles_.shift().getCommands();
};


/**
 * Clears the sent commands and returns them.
 * @return {!Array.<!office.commands.Command>} The removed commands.
 */
office.localstore.PendingQueue.prototype.clearSent = function() {
  this.setOperation_(office.localstore.PendingQueue.Operation.CLEAR_SENT);
  var commands = [];
  for (var i = 0; i < this.sentCommandBundles_.length; i++) {
    goog.array.extend(commands, this.sentCommandBundles_[i].getCommands());
  }
  this.sentCommandBundles_ = [];
  return commands;
};


/**
 * Clears the queue.
 */
office.localstore.PendingQueue.prototype.clear = function() {
  this.setUndeliverable(false);
  this.setUnsavedChanges(false);
  this.setOperation_(office.localstore.PendingQueue.Operation.CLEAR);
  this.sentCommandBundles_ = [];
  this.unsentCommands_ = [];
};


/**
 * Replaces the queue with new sent and unsent commands.
 * @param {!Array.<!office.storage.CommandBundle>} sentCommandBundles
 *     The sent command bundles.
 * @param {!Array.<!office.commands.Command>} unsentCommands The unsent commands.
 */
office.localstore.PendingQueue.prototype.replace = function(
    sentCommandBundles, unsentCommands) {
  this.setOperation_(office.localstore.PendingQueue.Operation.REPLACE);
  this.operationSentCommandBundles_ = sentCommandBundles.concat();
  this.operationCommands_ = unsentCommands.length > 0 ?
      unsentCommands.concat() : null;

  // Clone again to set in-memory arrays, so that we can append to these without
  // affecting any committed records.
  this.sentCommandBundles_ = sentCommandBundles.concat();
  this.unsentCommands_ = unsentCommands.concat();
};


/**
 * Sets the active operation for the queue.
 * @param {office.localstore.PendingQueue.Operation} operation The operation.
 * @private
 */
office.localstore.PendingQueue.prototype.setOperation_ = function(operation) {
  this.assertNoOperationAndNotCommitted_();
  this.operation_ = operation;
};


/** @override */
office.localstore.PendingQueue.prototype.isModified = function() {
  var pendingOperation =
      this.operation_ != office.localstore.PendingQueue.Operation.NONE;
  return pendingOperation || goog.base(this, 'isModified');
};


/**
 * Package Private.
 * @return {Array.<!office.commands.Command>} The pending queue operation's unsent
 *     command list, if any.
 */
office.localstore.PendingQueue.prototype.getOperationCommands = function() {
  return this.operationCommands_;
};


/**
 * Package Private.
 * @return {Array.<!office.storage.CommandBundle>} The pending queue
 *     operation's sent command bundles, if any.
 */
office.localstore.PendingQueue.prototype.getOperationSentCommandBundles =
    function() {
  return this.operationSentCommandBundles_;
};


/**
 * Package Private.
 * @return {?string} The pending queue operation's session id, if any.
 */
office.localstore.PendingQueue.prototype.getOperationSessionId = function() {
  return this.operationSessionId_;
};


/**
 * Package Private.
 * @return {?number} The pending queue operation's request id, if any.
 */
office.localstore.PendingQueue.prototype.getOperationRequestId = function() {
  return this.operationRequestId_;
};


/**
 * Package Private.
 * Returns the pending queue operation's type.
 * @return {office.localstore.PendingQueue.Operation} Pending queue operation
 *     type.
 */
office.localstore.PendingQueue.prototype.getOperation = function() {
  return this.operation_;
};


/**
 * Package Private.
 * @return {number} The last entry index.
 */
office.localstore.PendingQueue.prototype.getLastEntryIndex = function() {
  return this.lastEntryIndex_;
};


/**
 * @return {!Array.<!office.storage.CommandBundle>} The list of command
 *     bundles that are marked as sent to the server.
 */
office.localstore.PendingQueue.prototype.getSentCommandBundles = function() {
  goog.asserts.assert(this.sentCommandBundles_);
  return this.sentCommandBundles_;
};


/**
 * @return {!Array.<!office.commands.Command>} The list of unsent commands.
 */
office.localstore.PendingQueue.prototype.getUnsentCommands = function() {
  goog.asserts.assert(this.unsentCommands_);
  return this.unsentCommands_;
};


/** @override */
office.localstore.PendingQueue.prototype.commitInternal = function() {
  goog.base(this, 'commitInternal');

  // Increment last entry index by the number of pending entries being
  // committed. The pending commands are written as one entry, and every sent
  // command bundle has one entry. All committed entries will we written
  // with entry indices greater than the current last entry index.
  if (this.operationCommands_ && this.operationCommands_.length) {
    this.lastEntryIndex_++;
  }
  if (this.operationSentCommandBundles_) {
    this.lastEntryIndex_ += this.operationSentCommandBundles_.length;
  }

  this.operation_ = office.localstore.PendingQueue.Operation.NONE;
  this.operationCommands_ = null;
  this.operationSentCommandBundles_ = null;
  this.operationSessionId_ = null;
  this.operationRequestId_ = null;
};


/** @override */
office.localstore.PendingQueue.prototype.getDocumentLockRequirement = function() {
  return new office.localstore.DocumentLockRequirement(this.getDocId(),
      office.localstore.DocumentLockRequirement.Level.OWNER);
};


/**
 * Checks that there is no currently pending queue operation and throws if there
 * is one. Also asserts that this instance has arrays of unsent commands and
 * sent command bundles, and therefore is not a committed clone.
 * @private
 */
office.localstore.PendingQueue.prototype.assertNoOperationAndNotCommitted_ =
    function() {
  if (this.operation_ != office.localstore.PendingQueue.Operation.NONE) {
    throw Error('Multiple pending queue operations between writes.');
  }
  goog.asserts.assert(this.unsentCommands_, 'Uncommitted pending queue ' +
      'record should have non-null array of unsent commands array');
  goog.asserts.assert(this.sentCommandBundles_, 'Uncommitted pending queue ' +
      'record should have non-null array of sent command bundles');
};
