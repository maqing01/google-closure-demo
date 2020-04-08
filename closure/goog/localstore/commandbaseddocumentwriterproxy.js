goog.provide('office.localstore.CommandBasedDocumentWriterProxy');

goog.require('office.localstore.CommandQueue');
goog.require('office.localstore.DocumentWriterProxy');
goog.require('goog.async.Deferred');
goog.require('goog.log');



/**
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @param {string} documentId The document id.
 * @param {!office.localstore.StartupHintsProcessor=} opt_startupHintsProcessor
 *     A startup hints processor.
 * @param {!Array.<!goog.async.Deferred>=} opt_localStorePrerequisites
 *     Prerequisites that must be complete before we switch to local storage.
 *     These prerequisites are used in addition to anachronismResolved.
 * @param {!office.offline.ClientSnapshotScheduler=} opt_clientSnapshotScheduler
 *     A snapshotter to use to create client-side snapshots during idle time
 *     when users aren't typing, to minimize subsequent cold start load times.
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentWriterProxy}
 */
office.localstore.CommandBasedDocumentWriterProxy = function(errorReporter,
    documentId, opt_startupHintsProcessor, opt_localStorePrerequisites,
    opt_clientSnapshotScheduler) {
  /**
   * Deferred which fires when any pending queue anachronistic to the model
   * present on initial load has been delivered and acknowledged.
   * @private {!goog.async.Deferred}
   */
  this.anachronismResolved_ = new goog.async.Deferred();

  /**
   * The initial commands (the commands from revision 1). This will be set on
   * the document record in case that the document is not created on the server.
   * @private {Array.<!Object>}
   */
  this.initialCommands_ = null;

  var localStorePrerequisites = (opt_localStorePrerequisites || []).concat();
  localStorePrerequisites.push(this.anachronismResolved_);

  goog.base(this, documentId, opt_startupHintsProcessor,
      localStorePrerequisites);

  /**
   * Error reporter.
   * @private {!office.debug.ErrorReporterApi}
   */
  this.errorReporter_ = errorReporter;

  /**
   * Command queue.  This will be used until either registerLocalStorage is
   * called (when it is replaced by the queue of the real document object) or
   * discardAndIgnoreAllUpdates (when it is set to null).
   * @private {office.localstore.CommandQueue}
   */
  this.commandQueue_ = new office.localstore.CommandQueue();

  /**
   * The client snapshot scheduler to use to enqueue client-side model
   * snapshots, or null if no snapshotter has been provided.
   * @private {office.offline.ClientSnapshotScheduler}
   */
  this.clientSnapshotScheduler_ = opt_clientSnapshotScheduler || null;
};
goog.inherits(office.localstore.CommandBasedDocumentWriterProxy,
    office.localstore.DocumentWriterProxy);


/** @override */
office.localstore.CommandBasedDocumentWriterProxy.prototype.logger =
    goog.log.getLogger(
        'office.localstore.CommandBasedDocumentWriterProxy');


/**
 * Whether we should commit the new commands to live tables when the document
 * becomes available.
 * @type {boolean}
 * @private
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    shouldCommitStagedCommands_ = false;


/**
 * Adds some commands to this object.
 * @param {number} version The version number after this batch of changes is
 *     applied.
 * @param {number} chunkIndex Where this is a chunked batch of changes, the
 *     index number of a particular chunk.  For unchunked batches, this is just
 *     zero.
 * @param {?string} userName The name of the user responsible for the last write
 *     in this batch of commands.  For a chunked set, this may be indicative
 *     of the last command in the entire chunked batch.
 * @param {?number} timestamp The timestamp of the last command in the batch.
 *     For a chunked batch, this may be indicative of the last command in the
 *     entire chunked batch.
 * @param {!Array.<!office.commands.Command>} commands The commands to be
 *     stored.
 * @param {boolean=} opt_replace If this is true, all data for the current doc
 *     id will be deleted before this write is performed.
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.addCommands = function(
    version, chunkIndex, userName, timestamp, commands, opt_replace) {
  if (this.wasDiscarded()) {
    this.errorReporter_.assert(!this.commandQueue_, Error('If the proxy has ' +
        'been discarded, the command queue must be null'));
    return;
  }
  this.commandQueue_.addCommands(version, chunkIndex, userName, timestamp,
      commands, opt_replace);
  this.setLastModifiedServerTimestamp(timestamp);
  if (!opt_replace) {
    if (this.clientSnapshotScheduler_) {
      this.clientSnapshotScheduler_.enqueueSnapshot(
          version, userName, timestamp);
    }

    var localStore = this.getLocalStore();
    if (localStore) {
      var nonSnapshottedDocsCapability =
          localStore.getNonSnapshottedDocsCapability();
      if (nonSnapshottedDocsCapability) {
        nonSnapshottedDocsCapability.pushNonSnapshottedDocumentId(
            this.getDocumentId(), goog.nullFunction);
      }
    }
  }
};


/**
 * Adds a batch of commands to this object.
 * @param {!office.localstore.LocalStorageCommandBatch} commandBatch The batch of
 *     commands to be stored.
 * @param {boolean=} opt_replace If this is true, all data for the current doc
 *     id will be deleted before this write is performed.
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.addBatch = function(
    commandBatch, opt_replace) {
  goog.log.info(this.logger, 'addBatch()');
  if (this.wasDiscarded()) {
    this.errorReporter_.assert(!this.commandQueue_, Error('If the proxy has ' +
        'been discarded, the command queue must be null'));
    return;
  }
  this.commandQueue_.addBatch(commandBatch, opt_replace);
};


/**
 * Sets the initial commands that will be set on the document record in case
 * that the document is not created on the server.
 * @param {!Array.<!Object>} initialCommands
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    setSerializedInitialCommands = function(initialCommands) {
  this.initialCommands_ = initialCommands;
};


/**
 * Tells the proxy that any pending queue anachronous to the model present at
 * app startup has been delivered and acknowledged.  Only once this has occurred
 * will this proxy flush its accumulated changes down to local storage.  Without
 * this restriction, the model could be written before the anachronous queue was
 * cleared, leaving the local storage model and queue asynchronous for a period.
 * A refresh during this period would leave the local storage document
 * anachronous, and not editable offline.
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    setAnachronismResolved = function() {
  if (!this.anachronismResolved_.hasFired()) {
    this.anachronismResolved_.callback(true);
  }
};


/**
 * Flushes without flushing the commands. This method can be called only before
 * all the prerequisites are satisfied. If all prerequisites are already
 * satisfied, we can no longer flush just the commands.
 * @return {!goog.async.Deferred} A deferred which will fire once any writes
 *     triggered by this call are completed.  Will fire immediately if no
 *     writes are required.

 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    flushEarlyWithoutCommands = function() {
  if (this.hasSwitchedToLocalStorage()) {
    throw Error('Cannot flush the document record without the commands.');
  }
  this.maybeUpdateDocumentWithInitialCommands_();

  // This doesn't flush the commands because we haven't yet switched to local
  // storage.
  return this.flush();
};


/** @override */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    switchToLocalStorageInternal = function() {
  goog.log.info(this.logger, 'switchToLocalStorageInternal()');

  this.maybeUpdateDocumentWithInitialCommands_();
  var doc = /** @type {!office.localstore.CommandBasedDocument} */ (
      this.getLocalStoreDocument());
  // Move the commands from the temporary command queue into the real one,
  // and discard the temporary one.
  this.commandQueue_.moveCommandsTo(doc.getCommandQueue());
  goog.dispose(this.commandQueue_);
  this.commandQueue_ = doc.getCommandQueue();
  if (this.shouldCommitStagedCommands_) {
    doc.commitStagedCommands();
    doc.setHasPartialModelDataOnly(false);
    this.shouldCommitStagedCommands_ = false;
  }

  if (this.clientSnapshotScheduler_) {
    this.clientSnapshotScheduler_.registerLocalStorage(
        /** @type {!office.localstore.LocalStore} */ (this.getLocalStore()), doc);
  }
};


/**
 * Sets the initial commands on the document in case that there is a document
 * and there are initial commands. Also, clears the initial commands from the
 * proxy.
 * @private
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    maybeUpdateDocumentWithInitialCommands_ = function() {
  var doc = /** @type {office.localstore.CommandBasedDocument} */ (
      this.getLocalStoreDocument());
  if (doc && !doc.getIsCreated() && this.initialCommands_) {
    doc.setSerializedInitialCommands(this.initialCommands_);
    this.initialCommands_ = null;
  }
};


/** @override */
office.localstore.CommandBasedDocumentWriterProxy.prototype.
    discardAndIgnoreAllUpdates = function() {
  goog.base(this, 'discardAndIgnoreAllUpdates');
  goog.log.info(this.logger, 'discardAndIgnoreAllUpdates()');
  goog.dispose(this.commandQueue_);
  this.initialCommands_ = null;
  this.commandQueue_ = null;
};


/**
 * Commits staged commands to live tables. This is a no-op if the underlying
 * document adapter has not been configured to use staging.
 */
office.localstore.CommandBasedDocumentWriterProxy.prototype.commitStagedCommands =
    function() {
  if (this.wasDiscarded()) {
    return;
  }
  var doc = /** @type {office.localstore.CommandBasedDocument} */ (
      this.getLocalStoreDocument());
  if (doc != null) {
    doc.commitStagedCommands();
    doc.setHasPartialModelDataOnly(false);
  } else {
    this.shouldCommitStagedCommands_ = true;
  }
};


/** @override */
office.localstore.CommandBasedDocumentWriterProxy.prototype.disposeInternal =
    function() {
  // Only the command queue present before local storage registration is
  // 'owned' by this class.
  if (!this.getLocalStoreDocument()) {
    goog.dispose(this.commandQueue_);
  }
  goog.base(this, 'disposeInternal');
};
