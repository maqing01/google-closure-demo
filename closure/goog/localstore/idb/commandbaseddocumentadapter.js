goog.provide('office.localstore.idb.CommandBasedDocumentAdapter');

goog.require('office.app.CommandBasedModelPart');
goog.require('office.localstore.CommandBasedDocumentAdapter');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.DocumentAdapter');
goog.require('office.localstore.idb.DocumentCommandsStorageObject');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.asserts');
goog.require('goog.log');



/**
 * {@code office.commands.Command} stored in an IndexedDB database.
 * @param {office.localstore.Document.Type} documentType The document type this
 *     adapter adapts to.
 * @param {number} minSchemaVersion The minimum schema version this adapter
 *     works with.
 * @param {number} maxSchemaVersion The maximum schema version this adapter
 *     works with.
 * @param {!office.commands.CommandSerializer} serializer The command serializer.
 * @param {!office.localstore.idb.DocsDatabase} database The IDB docs database.
 * @constructor
 * @struct
 * @extends {office.localstore.CommandBasedDocumentAdapter}
 * @implements {office.localstore.idb.DocumentAdapter}
 */
office.localstore.idb.CommandBasedDocumentAdapter = function(documentType,
    minSchemaVersion, maxSchemaVersion, serializer, database) {
  goog.base(this, documentType, serializer);

  /**
   * @type {number}
   * @private
   */
  this.minSchemaVersion_ = minSchemaVersion;

  /**
   * @type {number}
   * @private
   */
  this.maxSchemaVersion_ = maxSchemaVersion;

  /**
   * Utility for interacting with IndexedDB.
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = new office.localstore.idb.DatabaseUtil();

  /**
   * The database.
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.database_ = database;
};
goog.inherits(office.localstore.idb.CommandBasedDocumentAdapter,
    office.localstore.CommandBasedDocumentAdapter);


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.logger_ =
    goog.log.getLogger(
        'office.localstore.idb.CommandBasedDocumentAdapter');


/** @override */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.getMinSchemaVersion =
    function() {
  return this.minSchemaVersion_;
};


/** @override */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.getMaxSchemaVersion =
    function() {
  return this.maxSchemaVersion_;
};


/** @override */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.performOperation =
    function(operation, transaction) {
  goog.log.info(this.logger_, 'performOperation()');
  switch (operation.getType()) {
    case office.localstore.Operation.Type.APPEND_COMMANDS:
      this.performAppendCommandsOperation_(
          /** @type {!office.localstore.AppendCommandsOperation} */ (operation),
          transaction);
      break;
    case office.localstore.Operation.Type.UNSTAGE_COMMANDS:
      this.performUnstageCommandsOperation_(
          /** @type {!office.localstore.UnstageCommandsOperation} */ (operation),
          transaction);
      break;
    default:
      throw Error('Unsupported operation type ' + operation.getType());
  }
};


/**
 * @param {!office.localstore.AppendCommandsOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    performAppendCommandsOperation_ = function(operation, transaction) {
  if (operation.getShouldReplace()) {
    goog.log.info(this.logger_, 'Deleting existing mutation log');

    // Delete all data for the doc before writing the new version.
    var writeCallback =
        goog.bind(this.writeCommandBatches_, this, operation, transaction);
    if (operation.getIsStaged()) {
      var commandStagingStore = transaction.getObjectStore(
          office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING);

      this.deleteCommands_(
          operation.getDocId(), commandStagingStore, writeCallback);
    } else {
      var commandStore = transaction.getObjectStore(
          office.localstore.idb.StoreName.DOCUMENT_COMMANDS);

      this.deleteCommands_(operation.getDocId(), commandStore, writeCallback);
    }
  } else {
    this.writeCommandBatches_(operation, transaction);
  }
};


/**
 * @param {!office.localstore.UnstageCommandsOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    performUnstageCommandsOperation_ = function(operation, transaction) {
  // Remove the old information in the DocumentCommands store for this doc,
  // and after that information is removed, unstage all the staged commands
  // back into that store. We have to do this via a callback to the delete
  // because of the way that Chrome's IDB implementation sequences requests
  // coming from a cursor's continue call.
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS);
  this.deleteCommands_(operation.getDocId(), commandStore, goog.bind(
      this.unstageCommands_, this, transaction, operation.getDocId()));
};


/**
 * Deletes all commands for a document from a store.
 * @param {string} docId
 * @param {!office.localstore.idb.ObjectStore} commandStore
 * @param {function()} completionCallback The callback for when commands were
 *     deleted.
 * @param {number=} opt_extraKeyElement The timestamp for the document instance
 *     to be deleted, in case we're deleting from staging.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.deleteCommands_ =
    function(docId, commandStore, completionCallback, opt_extraKeyElement) {
  var lowerKeyBound =
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeLowerBound(
          docId, opt_extraKeyElement);
  var upperKeyBound =
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeUpperBound(
          docId, opt_extraKeyElement);
  this.idbUtil_.deleteFromStore(
      commandStore, lowerKeyBound, upperKeyBound, completionCallback);
};


/**
 * Writes each batch of commands in the document's command queue.
 * @param {!office.localstore.AppendCommandsOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.writeCommandBatches_ =
    function(operation, transaction) {
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS);

  var writeCommandStore = operation.getIsStaged() ?
      transaction.getObjectStore(
          office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING) :
      commandStore;

  var mutationBatches = operation.getCommandBatches();
  for (var i = 0; i < mutationBatches.length; ++i) {
    this.writeCommandBatch_(
        writeCommandStore, operation.getDocId(), mutationBatches[i]);
  }
};


/**
 * Write an individual batch of commands to storage.
 * @param {!office.localstore.idb.ObjectStore} commandStore The document commands
 *    object store.

 * @param {string} docId
 * @param {!office.localstore.LocalStorageCommandBatch} batch The command batch to
 *     write.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.writeCommandBatch_ =
    function(commandStore, docId, batch) {
  var commands = batch.getCommands();
  var commandObjects = [];
  for (var i = 0; i < commands.length; ++i) {
    commandObjects.push(this.getSerializer().serialize(commands[i]));
  }

  var storageObject = office.localstore.idb.DocumentCommandsStorageObject.create(
      docId, batch.getPartId(), batch.getRevision(),
      batch.getChunkIndex(), batch.getTimestamp(), commandObjects);
  commandStore.put(storageObject.getStorableObject());
};


/**
 * Moves commands from the staging stores to the real object stores.
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {string} docId
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.unstageCommands_ =
    function(transaction, docId) {
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS);
  var commandStagingStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS_STAGING);
  var stagingRequest = this.idbUtil_.getCursorRequest(commandStagingStore,
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeLowerBound(
          docId),
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeUpperBound(
          docId));
  stagingRequest.setSuccessCallback(
      goog.bind(this.moveDocumentCommands_, this, commandStore));
};


/**
 * Handles the success callback for the query over the document commands
 * staging store, copies the results into the real document commands store.
 * @param {!office.localstore.idb.ObjectStore} commandStore The document commands
 *    object store.
 * @param {!Event} e The IDBRequest cursor event.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    moveDocumentCommands_ = function(commandStore, e) {
  var request = e.target;
  office.localstore.idb.DatabaseUtil.verifyRequestDone(request);
  var cursor = request.result;
  if (cursor) {
    commandStore.put(cursor.value);
    cursor['delete']();
    cursor['continue']();
  }
};


/** @override */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.readCommands =
    function(doc, partId, startCallback, batchCallback, opt_successCallback) {
  var transaction = this.database_.openTransaction(
      [office.localstore.idb.StoreName.DOCUMENT_COMMANDS],
      'readCommands' /* errorMessage */);
  if (opt_successCallback) {
    transaction.setCompletionCallback(opt_successCallback);
  }

  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.DOCUMENT_COMMANDS);
  this.getRevision_(doc.getId(), commandStore,
      goog.bind(this.readAllCommands_, this, doc, partId, commandStore,
          startCallback, batchCallback), undefined /* opt_startRevision */,
      partId);
};


/**
 * Reads the end revision of the document from storage. If opt_startRevision is
 * set, the start revision in storage is returned instead.
 * @param {string} docId
 * @param {!office.localstore.idb.ObjectStore} commandStore The document commands
 *    object store.
 * @param {function(number)} resultCallback A callback to call with the end
 *     revision of the document model.
 * @param {boolean=} opt_startRevision Whether the get the start revision.
 * @param {office.localstore.DocumentPartId=} opt_partId If given, determine
 *     revision only for this part. Note that for document types which have
 *     multiple parts, not supplying this optional parameter might give
 *     inconsistent results.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.getRevision_ =
    function(docId, commandStore, resultCallback, opt_startRevision,
        opt_partId) {
  // First get the correct revision by obtaining a cursor in reverse order.
  var revisionRequest = this.getCursorRequestForDoc_(docId, commandStore,
      !opt_startRevision /* opt_reverse */, opt_partId);
  revisionRequest.setSuccessCallback(goog.bind(
      this.handleGetRevisionSuccess_, this, resultCallback));
};


/**
 * Handles the success callback from the the request to obtain the latest
 * command revision number.
 * @param {function(number)} resultCallback A callback to call with the end
 *     revision of the document model.
 * @param {Event} e The cursor success event.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    handleGetRevisionSuccess_ = function(resultCallback, e) {
  var request = e.target;
  var cursor = request.result;
  var stopMarker = 'office-stopped';

  // This request has been marked as stopped, no further processing should be
  // done on it.
  if (request[stopMarker]) {
    return;
  }

  if (cursor) {
    var storageObject = new office.localstore.idb.DocumentCommandsStorageObject(
        cursor.value);

    // There is a severe memory leak in Chrome which is triggered by not
    // iterating this cursor all the way to the end.  This works around it.
    // webkit.org/b/98078
    request[stopMarker] = true;
    cursor['continue'](office.localstore.idb.DatabaseUtil.isForward(cursor) ?
        office.localstore.idb.DocumentCommandsStorageObject.HIGH_KEY :
        office.localstore.idb.DocumentCommandsStorageObject.LOW_KEY);

    resultCallback(storageObject.getRevision());
  } else {
    // The document has no commands to load. This happens when a new offline
    // document is being created. Call the result callback with revision 0.
    resultCallback(0);
  }
};


/**
 * Handles the success callback from the the request to read the stored revision
 * range for the document.
 * @param {!office.localstore.CommandBasedDocument} doc The document.
 * @param {!office.localstore.DocumentPartId} partId The document part to read
 *     from.
 * @param {!office.localstore.idb.ObjectStore} commandStore The document commands
 *    object store.
 * @param {function(number)} startCallback A callback to call at the start of a
 *     model load. Takes the revision of the model.
 * @param {function(!office.app.ModelPart, number)} batchCallback A callback to
 *     call once for each batch of commands taken from storage. The repeated
 *     calls are made strictly in the order necessary to successfully
 *     reconstruct the model.
 * @param {number} latestRevision The latest revision of the document.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.readAllCommands_ =
    function(doc, partId, commandStore, startCallback, batchCallback,
        latestRevision) {
  startCallback(latestRevision);

  this.setModelChunkReadStartTime();

  // Now that we have the correct revision, read back all the commands in
  // the correct, ascending order.
  var request = this.getCursorRequestForDoc_(doc.getId(), commandStore,
      undefined /* opt_reverse */, partId);

  // TODO(psolderitsch: Consider appropriating IdbUtil#iterateIdbCursor or
  // similar.
  request.setSuccessCallback(goog.bind(
      this.handleReadCommandsSuccess_, this, batchCallback));
};


/**
 * Handles the success callback from the readCommands request.
 * @param {function(!office.app.ModelPart, number)} batchCallback A callback to
 *     call once for each batch of commands taken from storage. The repeated
 *     calls are made strictly in the order necessary to successfully
 *     reconstruct the model. The function also takes in the revision of the
 *     final batch loaded from storage, which will be used to decide when the
 *     application can go editable.
 * @param {Event} e The cursor success event.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    handleReadCommandsSuccess_ = function(batchCallback, e) {
  var cursor = e.target.result;
  if (cursor) {
    var storageObject = new office.localstore.idb.DocumentCommandsStorageObject(
        cursor.value);
    var commandObjects = goog.asserts.assertArray(
        storageObject.getCommands());
    this.incrementModelReadTime();
    //  Fortify this code against failures to deserialize commands.
    var commands = this.parseCommands(commandObjects,
        true /* opt_deserializationTiming */);
    var revision = storageObject.getRevision();
    batchCallback(new office.app.CommandBasedModelPart(commands), revision);
    cursor['continue']();
    // Resetting model chunk read start time for the next chunk.
    this.setModelChunkReadStartTime();
  }
};


//  Consider moving this to DocumentCommandStorageObject.
/**
 * Creates and returns an IDB cursor request for the specified doc ID, against
 * the specified IDB object store, appropriate for iterating over all of the
 * stored command batches of a specific document.
 * @param {string} docId The doc id.
 * @param {!office.localstore.idb.ObjectStore} commandStore An object store
 *     holding document command batch objects.
 * @param {boolean=} opt_reverse Whether the cursor is iterated over backwards,
 *     starting with the last key, instead of the usual first-to-last. Useful
 *     for determining the final stored revision of the document.
 * @param {office.localstore.DocumentPartId=} opt_partId If given, read only from
 *     this document part.
 * @return {!office.localstore.idb.Request} The cursor request.
 * @private
 */
office.localstore.idb.CommandBasedDocumentAdapter.prototype.
    getCursorRequestForDoc_ = function(docId, commandStore, opt_reverse,
        opt_partId) {
  return this.idbUtil_.getCursorRequest(commandStore,
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeLowerBound(
          docId, opt_partId),
      office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeUpperBound(
          docId, opt_partId),
      undefined /* opt_index */, opt_reverse);
};
