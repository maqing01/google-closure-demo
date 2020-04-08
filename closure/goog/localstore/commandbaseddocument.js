goog.provide('office.localstore.CommandBasedDocument');

goog.require('office.localstore.CommandQueue');
goog.require('office.localstore.Document');
goog.require('office.localstore.DocumentLockRequirement');



/**
 * A local storage representation of a document based on
 * {@code office.commands.Command}.
 *
 * @param {string} id Document id.
 * @param {office.localstore.Document.Type} documentType The document's type.
 * @param {boolean} isNew Whether this is a new document, with no presence in
 *     local storage.
 * @param {!office.localstore.CommandBasedDocumentAdapter} documentAdapter The
 *     document adapter, which is used to actually read and write from/to
 *     whatever local storage technology is in use on this browser.
 * @constructor
 * @struct
 * @extends {office.localstore.Document}
 */
office.localstore.CommandBasedDocument =
    function(id, documentType, isNew, documentAdapter) {
  goog.base(this, id, documentType, isNew);

  //  Investigate removing the circular dependency between
  // CommandBasedDocument and CommandBasedDocumentAdapter.
  /**
   * The document adapter, which is used to actually read and write from/to the
   * browser's local storage.  When the document is cloned for writing, the
   * original document and the clone will share this instance, a new one is not
   * constructed.
   * @type {!office.localstore.CommandBasedDocumentAdapter}
   * @private
   */
  this.documentAdapter_ = documentAdapter;

  /**
   * Stores commands, ready for writing next time this object is written to the
   * local storage object.
   * @type {!office.localstore.CommandQueue}
   * @private
   */
  this.commandQueue_ = new office.localstore.CommandQueue();
};
goog.inherits(office.localstore.CommandBasedDocument, office.localstore.Document);


/**
 * Whether commands are currently being written into the staging table.
 * @type {boolean}
 * @private
 */
office.localstore.CommandBasedDocument.prototype.isStagingCommands_ = false;


/**
 * Whether commands written to staging for this document are ready to be
 * committed to the actual commands table.
 * @type {boolean}
 * @private
 */
office.localstore.CommandBasedDocument.prototype.shouldCommitStagedCommands_ =
    false;


/**
 * @return {!office.localstore.CommandQueue} The command queue, used to queue
 *     commands for writing next time this document object is written to the
 *     local storage object.
 */
office.localstore.CommandBasedDocument.prototype.getCommandQueue = function() {
  return this.commandQueue_;
};


/** @override */
office.localstore.CommandBasedDocument.prototype.isModified = function() {
  return goog.base(this, 'isModified') || !this.commandQueue_.isEmpty();
};


/** @override */
office.localstore.CommandBasedDocument.prototype.commitInternal =
    function() {
  goog.base(this, 'commitInternal');
  // If we are ready to commit the staged commands, mark the transfer object as
  // unstaged so that subsequent writes are no longer staged.
  if (this.shouldCommitStagedCommands_) {
    this.isStagingCommands_ = false;
  }
  // Clear the should-commit state since we do not want the document to trigger
  // commits more than once.
  this.shouldCommitStagedCommands_ = false;
};


/**
 * Reads all commands for a given part of this document from storage.
 * @param {!office.localstore.DocumentPartId} partId The document part to read
 *     from.
 * @param {function(number)} startCallback A function to call prior to loading
 *     any commands. Takes the head model revision.
 * @param {function(!office.app.ModelPart, number)} batchCallback A callback to
 *     call once for each batch of commands taken from storage. The repeated
 *     calls are made strictly in the order necessary to successfully
 *     reconstruct the model.
 * @param {function()=} opt_successCallback A callback to call once all the
 *     results have been reported via repeated calls to batchCallback.
 */
office.localstore.CommandBasedDocument.prototype.readCommands =
    function(partId, startCallback, batchCallback, opt_successCallback) {
  this.documentAdapter_.readCommands(this, partId, startCallback, batchCallback,
      opt_successCallback);
};


/** @override */
office.localstore.CommandBasedDocument.prototype.getDocumentLockRequirement =
    function() {
  return this.commandQueue_.isEmpty() && !this.shouldCommitStagedCommands_ ?
      goog.base(this, 'getDocumentLockRequirement') :
      new office.localstore.DocumentLockRequirement(this.getId(),
          office.localstore.DocumentLockRequirement.Level.OWNER);
};


/**
 * Makes this document staged, meaning that all subsequent writes will go
 * to staging tables until commitStagedCommands() is called.
 */
office.localstore.CommandBasedDocument.prototype.stageCommands = function() {
  this.isStagingCommands_ = true;
};


/**
 * Sets up the document to commit staged commands to the live table in
 * local storage.
 */
office.localstore.CommandBasedDocument.prototype.commitStagedCommands =
    function() {
  if (this.isStagingCommands_) {
    this.shouldCommitStagedCommands_ = true;
  }
};


/**
 * @return {boolean} Whether the document data is ready to be committed from the
 *     staging table to the live table.
 */
office.localstore.CommandBasedDocument.prototype.shouldCommitStagedCommands =
    function() {
  return this.shouldCommitStagedCommands_;
};


/**
 * @return {boolean} Whether the document is staged, i.e. all its commands are
 *     currently being written to the staging table.
 */
office.localstore.CommandBasedDocument.prototype.isStagingCommands = function() {
  return this.isStagingCommands_;
};


/** @override */
office.localstore.CommandBasedDocument.prototype.disposeInternal = function() {
  delete this.documentAdapter_;
  this.commandQueue_.dispose();
  delete this.commandQueue_;
  goog.base(this, 'disposeInternal');
};
