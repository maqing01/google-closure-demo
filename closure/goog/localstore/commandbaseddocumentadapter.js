goog.provide('office.localstore.CommandBasedDocumentAdapter');

goog.require('office.commands');
goog.require('office.diagnostics.InitialLoadTimingImpl');
goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('office.localstore.AppendCommandsOperation');
goog.require('office.localstore.CommandBasedDocument');
goog.require('office.localstore.CommandQueue');
goog.require('office.localstore.DocumentAdapter');
goog.require('office.localstore.UnstageCommandsOperation');
goog.require('goog.asserts');



/**
 * {@code office.commands.Command}.
 * @param {office.localstore.Document.Type} documentType The document type this
 *     adapter adapts to.
 * @param {!office.commands.CommandSerializer} serializer The command serializer.
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentAdapter}
 */
office.localstore.CommandBasedDocumentAdapter = function(
    documentType, serializer) {
  goog.base(this, documentType);

  /** @private {!office.commands.CommandSerializer} */
  this.serializer_ = serializer;

  /**
   * The timing manager.
   * @type {!office.diagnostics.InitialLoadTiming}
   * @private
   */
  this.timing_ = office.diagnostics.InitialLoadTimingImpl.getInstance();
};
goog.inherits(office.localstore.CommandBasedDocumentAdapter,
    office.localstore.DocumentAdapter);


/**
 * The time at which a read of a chunk of model commands was started.
 * @type {?number}
 * @private
 */
office.localstore.CommandBasedDocumentAdapter.prototype.modelChunkReadStartTime_ =
    null;


/**
 * @return {!office.commands.CommandSerializer} The serializer.
 * @protected
 */
office.localstore.CommandBasedDocumentAdapter.prototype.getSerializer =
    function() {
  return this.serializer_;
};


/**
 * Sets the model chunk read start time to the current time.
 * @protected
 */
office.localstore.CommandBasedDocumentAdapter.prototype.
    setModelChunkReadStartTime = function() {
  this.modelChunkReadStartTime_ = goog.now();
};


/**
 * Increments MODEL_READ with the delta from the current time and
 * {@code modelChunkReadStartTime_}.
 * @protected
 */
office.localstore.CommandBasedDocumentAdapter.prototype.incrementModelReadTime =
    function() {
  goog.asserts.assert(this.modelChunkReadStartTime_ != null);
  var modelChunkReadTime = goog.now() - this.modelChunkReadStartTime_;
  this.timing_.incrementTime(
      office.diagnostics.InitialLoadTimingKeys.MODEL_READ, modelChunkReadTime);
};


/** @override */
office.localstore.CommandBasedDocumentAdapter.prototype.createDocument =
    function(id) {
  return new office.localstore.CommandBasedDocument(id, this.getDocumentType(),
      true /* isNew */, this);
};


/** @override */
office.localstore.CommandBasedDocumentAdapter.prototype.readDocument =
    function(doc) {
  var newDoc = new office.localstore.CommandBasedDocument(doc.getId(),
      this.getDocumentType(), false /* isNew */, this);
  newDoc.usePropertiesOf(doc);
  newDoc.markAsInitialized();
  return newDoc;
};


/**
 * Read all commands for a given document part from storage.
 * @param {!office.localstore.CommandBasedDocument} doc The document.
 * @param {!office.localstore.DocumentPartId} partId The document part to read
 *     from.
 * @param {function(number)} startCallback A callback to call at the start of a
 *     model load. Takes the revision of the model.
 * @param {function(!office.app.ModelPart, number)} batchCallback A callback to
 *     call once for each batch of commands taken from storage. The repeated
 *     calls are made strictly in the order necessary to successfully
 *     reconstruct the model.
 * @param {function()=} opt_successCallback A callback to call once all the
 *     results have been reported via repeated calls to batchCallback.
 */
office.localstore.CommandBasedDocumentAdapter.prototype.readCommands =
    goog.abstractMethod;


/** @override */
office.localstore.CommandBasedDocumentAdapter.prototype.createCommandObject =
    function(command) {
  return this.serializer_.serialize(command);
};


/**
 * Parses a command persistence object to produce a command object.
 * @param {!Array.<!Object>} commandObjects The persistence objects for this
 *     command.
 * @param {boolean=} opt_deserializationTiming Whether the commands
 *     deserialization should be timed.
 * @return {!Array.<!office.commands.Command>} commands.
 */
office.localstore.CommandBasedDocumentAdapter.prototype.parseCommands =
    function(commandObjects, opt_deserializationTiming) {
  var startTime = goog.now();
  var commands = office.commands.deserializeCommands(this.getSerializer(),
      commandObjects);
  if (opt_deserializationTiming) {
    var modelDeserializationTime = goog.now() - startTime;
    this.timing_.incrementTime(
        office.diagnostics.InitialLoadTimingKeys.MODEL_DESERIALIZATION,
        modelDeserializationTime);
  }
  return commands;
};


/** @override */
office.localstore.CommandBasedDocumentAdapter.prototype.createOperations =
    function(document) {
  if (document.isToBeDeleted()) {
    return [];
  }

  document = /** @type {!office.localstore.CommandBasedDocument} */ (document);
  var commandQueue = new office.localstore.CommandQueue();
  document.getCommandQueue().moveCommandsTo(commandQueue);

  if (document.shouldCommitStagedCommands()) {
    if (!commandQueue.isEmpty()) {
      throw Error('Cannot commit staged commands with pending commands');
    }
    return [
      new office.localstore.UnstageCommandsOperation(
          document.getId(), document.getType())
    ];
  } else if (!commandQueue.isEmpty()) {
    var shouldReplace = commandQueue.shouldReplacePrevious();
    return [
      new office.localstore.AppendCommandsOperation(document.getId(),
          document.getType(),
          commandQueue.getUnwrittenCommands(),
          document.isStagingCommands(),
          shouldReplace)
    ];
  } else {
    return [];
  }
};
