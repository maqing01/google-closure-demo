goog.provide('office.app.DefaultWarmStartDocumentLoader');

goog.require('office.app.CommandBasedModelPart');
goog.require('office.app.WarmStartDocumentLoader');
goog.require('office.commands');



/**
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @param {!office.commands.CommandSerializer} commandSerializer The command
 *     serializer.
 * @param {office.localstore.CommandBasedDocumentWriterProxy} documentWriterProxy
 *     The proxy to use to write loaded commands to local storage. Null when the
 *     user is not opted into offline and not cold starting.
 * @param {boolean} isDocumentCreated Whether the document is created on the
 *     server.
 * @constructor
 * @struct
 * @extends {office.app.WarmStartDocumentLoader}
 */
office.app.DefaultWarmStartDocumentLoader = function(
    errorReporter, commandSerializer, documentWriterProxy, isDocumentCreated) {
  goog.base(this);

  /**
   * The command registry.
   * @private {!office.commands.CommandSerializer}
   */
  this.commandSerializer_ = commandSerializer;

  /**
   * The proxy to use to write loaded commands to local storage.
   * @private {office.localstore.CommandBasedDocumentWriterProxy}
   */
  this.documentWriterProxy_ = documentWriterProxy;

  ///**
  // * @private {boolean}
  // */
  // Export the functions here for use in landing pages.
  //goog.exportProperty(this, 'startLoad',
  //    errorReporter.protectFunction(this.startLoad, this));
  //goog.exportProperty(this, 'loadModelChunk',
  //    errorReporter.protectFunction(this.loadModelChunk, this));
  //goog.exportProperty(this, 'endLoad',
  //    errorReporter.protectFunction(this.endLoad, this));
};
goog.inherits(office.app.DefaultWarmStartDocumentLoader,
    office.app.WarmStartDocumentLoader);


/**
 * The head revision of the document being loaded.
 * @type {?number}
 * @private
 */
office.app.DefaultWarmStartDocumentLoader.prototype.revision_ = null;


/**
 * The timestamp of the head revision of the document being loaded.
 * @type {?number}
 * @private
 */
office.app.DefaultWarmStartDocumentLoader.prototype.timestamp_ = null;


/**
 * The zero based index of the last chunk loaded, starts at -1.
 * @type {number}
 * @private
 */
office.app.DefaultWarmStartDocumentLoader.prototype.lastChunkIndex_ = -1;


/** @override */
office.app.DefaultWarmStartDocumentLoader.prototype.startLoad = function(
    revision, timestamp) {
  this.revision_ = revision;
  this.timestamp_ = timestamp;
  this.dispatchModelLoadStartEvent(revision);
  if (this.documentWriterProxy_) {
    this.documentWriterProxy_.setModelNeedsResync(false);
  }
};


/** @override */
office.app.DefaultWarmStartDocumentLoader.prototype.loadModelChunk = function(
    messageObj) {
  if (goog.isNull(this.revision_)) {
    throw Error('Failed to initialize WarmStartDocumentLoader before ' +
        'processing first chunk.');
  }

  var startTime = goog.now();
  var serializedCommands = /** @type {!Array.<!Object>} */ (messageObj);
  var storageCommands = office.commands.deserializeCommands(
      this.commandSerializer_, serializedCommands);

  this.lastChunkIndex_++;

  if (this.documentWriterProxy_) {
    //startTime = goog.now();
    if (!storageCommands || !storageCommands.length) {
      throw Error('Found empty chunk during warm start.');
    }
    var storageMessage = new office.storage.StorageMessage(storageCommands,
        null /* selection */, this.timestamp_, null /* userName */,
        this.revision_, this.revision_, null /* sid */,
        null /* effectiveSid */);
    var batch = new office.localstore.LocalStorageCommandBatch(
        storageMessage, office.localstore.DocumentPartId.DEFAULT_PART_ID,
        this.lastChunkIndex_);
    this.documentWriterProxy_.addBatch(batch,
        this.lastChunkIndex_ == 0 /* opt_replace */);
    if (!goog.isNull(this.timestamp_)) {
      this.documentWriterProxy_.setLastModifiedServerTimestamp(this.timestamp_);
    }
    if (this.revision_ == 1 && !this.isDocumentCreated_) {
      this.documentWriterProxy_.setSerializedInitialCommands(
          serializedCommands);
    }
    //var modelPersistTime = goog.now() - startTime;
    //this.timing_.incrementTime(
    //    docs.diagnostics.InitialLoadTimingKeys.MODEL_PERSIST, modelPersistTime);
  }

  this.dispatchModelPartAvailableEvent(
      new office.app.CommandBasedModelPart(storageCommands), this.revision_);
};


/** @override */
office.app.DefaultWarmStartDocumentLoader.prototype.endLoad = function() {
  if (this.documentWriterProxy_) {
    this.documentWriterProxy_.flush();
  }
  this.dispatchModelLoadCompleteEvent();
};
