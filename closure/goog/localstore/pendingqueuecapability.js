/**
 * @fileoverview Base class for the pending queue capability.

 */

goog.provide('office.localstore.PendingQueueCapability');

goog.require('office.localstore.DocumentLockOperation');
goog.require('office.localstore.PendingQueue');
goog.require('office.localstore.PendingQueueClearOperation');
goog.require('office.localstore.PendingQueueClearSentBundleOperation');
goog.require('office.localstore.PendingQueueClearSentOperation');
goog.require('office.localstore.PendingQueueDeleteCommandsOperation');
goog.require('office.localstore.PendingQueueMarkSentBundleOperation');
goog.require('office.localstore.PendingQueueWriteCommandsOperation');
goog.require('office.localstore.Record');
goog.require('office.localstore.StorageCapability');
goog.require('office.localstore.UpdateRecordOperation');
goog.require('goog.object');



/**
 * Base class for the user capability which manages reading and writing the
 * office.localstore.PendingQueue record.
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @constructor
 * @struct
 * @implements {office.localstore.StorageCapability}
 */
office.localstore.PendingQueueCapability = function(documentAdapters) {
  /**
   * @type {!Object.<!office.localstore.DocumentAdapter>}
   * @private
   */
  this.documentAdapters_ = documentAdapters;
};


/** @override */
office.localstore.PendingQueueCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.PENDING_QUEUE];
};


/** @override */
office.localstore.PendingQueueCapability.prototype.getKeyForRecord =
    function(record) {
  var pendingQueueRecord =
      /** @type {!office.localstore.PendingQueue} */ (record);
  return pendingQueueRecord.getDocId();
};


/**
 * @param {string} documentType
 * @return {!office.localstore.DocumentAdapter}
 * @protected
 */
office.localstore.PendingQueueCapability.prototype.getDocumentAdapter =
    function(documentType) {
  var adapter = this.documentAdapters_[documentType];
  if (adapter) {
    return adapter;
  }
  throw Error('No document adapter available for type ' + documentType);
};


/**
 * Reads the pending queue record for the given doc id.
 * @param {string} docId The document id.
 * @param {function(office.localstore.PendingQueue)} resultCallback Callback to
 *     deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.PendingQueueCapability.prototype.readPendingQueue =
    goog.abstractMethod;


/**
 * Creates a new pending queue object. Must be written to the database using
 * write() before any record of it will be seen there.
 * @param {string} documentId The id of the document this pending queue is
 *     associated with.
 * @param {office.localstore.Document.Type} type The document's type.
 * @return {!office.localstore.PendingQueue} The new pending queue object.
 */
office.localstore.PendingQueueCapability.prototype.createPendingQueue = function(
    documentId, type) {
  return new office.localstore.PendingQueue(
      documentId, type, true /* isNew */, -1 /* lastEntryIndex */,
      [] /* sentCommandBundles */, [] /* unsentCommands */);
};


/** @override */
office.localstore.PendingQueueCapability.prototype.createOperationsForRecord =
    function(record) {
  var pendingQueue = /** @type {!office.localstore.PendingQueue} */ (record);

  if (pendingQueue.isToBeDeleted()) {
    throw Error('Cannot delete pending queues.');
  }

  var documentAdapter = this.getDocumentAdapter(pendingQueue.getType());

  var pendingQueueOperation = pendingQueue.getOperation();
  var Operation = office.localstore.PendingQueue.Operation;

  // NOTE: The operations which require writing to the primary pending queue
  // store (rather than just the pending queue commands store) all inherit from
  // UpdateRecordOperation, so that storage implementations can write both core
  // metadata and the operation-specific data in a single read-modify-write
  // cycle. At most one operation in the set of operations returned by this
  // method should inherit from UpdateRecordOperation, to avoid updating the
  // same data multiple times in storage. It's also important that if the record
  // has any modifications at all, there must be at least one operation that
  // inherits from UpdateRecordOperation in the set of operations that's
  // generated here.
  var createdOperations = [];
  switch (pendingQueueOperation) {
    case Operation.REPLACE:
      createdOperations =
          this.createReplaceOperations_(pendingQueue, documentAdapter);
      break;
    case Operation.APPEND:
      createdOperations =
          this.createAppendOperations_(pendingQueue, documentAdapter);
      break;
    case Operation.MARK_SENT:
      createdOperations.push(
          new office.localstore.PendingQueueMarkSentBundleOperation(
              pendingQueue));
      break;
    case Operation.CLEAR:
      createdOperations.push(
          new office.localstore.PendingQueueClearOperation(pendingQueue));
      break;
    case Operation.CLEAR_SENT:
      createdOperations.push(
          new office.localstore.PendingQueueClearSentOperation(pendingQueue));
      break;
    case Operation.CLEAR_SENT_BUNDLE:
      createdOperations.push(
          new office.localstore.PendingQueueClearSentBundleOperation(
              pendingQueue));
      break;
    case Operation.NONE:
      createdOperations.push(new office.localstore.UpdateRecordOperation(
          pendingQueue.getDocId() /* key */, pendingQueue));
      break;
    default:
      throw Error(
          'Unknown Pending Queue operation type: ' + pendingQueueOperation);
  }

  var documentLockRequirement = record.getDocumentLockRequirement();
  if (documentLockRequirement) {
    createdOperations.push(new office.localstore.DocumentLockOperation(
        documentLockRequirement.getDocId(),
        documentLockRequirement.getLevel()));
  }

  return createdOperations;
};


/**
 * Creates all of the storage operations necessary to replace the entire old
 * pending queue's contents with the contents of the specified queue.
 * @param {!office.localstore.PendingQueue} pendingQueue
 * @param {!office.localstore.DocumentAdapter} documentAdapter
 * @return {!Array.<!office.localstore.Operation>}
 * @private
 */
office.localstore.PendingQueueCapability.prototype.createReplaceOperations_ =
    function(pendingQueue, documentAdapter) {
  var docId = pendingQueue.getDocId();

  var storageOperations = this.createSentBundleOperations_(
      pendingQueue.getLastEntryIndex(), pendingQueue, documentAdapter);

  var lastIndex =
      pendingQueue.getLastEntryIndex() + storageOperations.length;

  storageOperations.push(
      new office.localstore.PendingQueueMarkSentBundleOperation(pendingQueue));

  var appendOperation =
      this.createWriteCommandsOperation_(pendingQueue.getOperationCommands(),
          documentAdapter, docId, lastIndex + 1);
  if (appendOperation) {
    storageOperations.push(appendOperation);
  }

  if (pendingQueue.getLastEntryIndex() >= 0) {
    var deleteOperation =
        new office.localstore.PendingQueueDeleteCommandsOperation(
            docId, pendingQueue.getLastEntryIndex());
    storageOperations.push(deleteOperation);
  }
  return storageOperations;
};


/**
 * Creates the storage operations necessary to write newly appended commands
 * in the queue to storage.
 * @param {!office.localstore.PendingQueue} pendingQueue
 * @param {!office.localstore.DocumentAdapter} documentAdapter
 * @return {!Array.<!office.localstore.Operation>}
 * @private
 */
office.localstore.PendingQueueCapability.prototype.createAppendOperations_ =
    function(pendingQueue, documentAdapter) {
  var firstAppendedEntryIndex = pendingQueue.getLastEntryIndex() + 1;

  var docId = pendingQueue.getDocId();
  var storageOperations = [];

  if (!goog.object.isEmpty(pendingQueue.getModifications())) {
    storageOperations.push(
        new office.localstore.UpdateRecordOperation(docId, pendingQueue));
  }

  var writeCommandsOperation = this.createWriteCommandsOperation_(
      pendingQueue.getOperationCommands(), documentAdapter, docId,
      firstAppendedEntryIndex);
  if (writeCommandsOperation) {
    storageOperations.push(writeCommandsOperation);
  }

  return storageOperations;
};


/**
 * Creates write operations for all sent bundles contained in the record object.
 * @param {number} lastEntryIndex The highest numbered index which is currently
 *     occupied, or -1 if there are no occupied entries.
 * @param {!office.localstore.PendingQueue} pendingQueue
 * @param {!office.localstore.DocumentAdapter} documentAdapter
 * @return {!Array.<!office.localstore.Operation>}
 * @private
 */
office.localstore.PendingQueueCapability.prototype.createSentBundleOperations_ =
    function(lastEntryIndex, pendingQueue, documentAdapter) {
  var bundles = pendingQueue.getOperationSentCommandBundles();
  var operations = [];
  var writeCommandsOperation;
  for (var i = 0; i < bundles.length; i++) {
    lastEntryIndex++;
    writeCommandsOperation = this.createWriteCommandsOperation_(
        bundles[i].getCommands(), documentAdapter, pendingQueue.getDocId(),
        lastEntryIndex, true /** opt_allowEmptyCommands */);
    if (!writeCommandsOperation) {
      throw Error('Unexpected null operation');
    }
    operations.push(writeCommandsOperation);
  }

  return operations;
};


/**
 * Translates a list of commands to an array of serialized command objects
 * suitable for persistence in storage.
 * @param {Array.<!office.commands.Command>} commands
 * @param {!office.localstore.DocumentAdapter} documentAdapter
 * @param {string} docId
 * @param {number} lastEntryIndex
 * @param {boolean=} opt_allowEmptyCommands Whether to allow an empty array
 *     of commands to be used. If this is false, the operation will still be
 *     created but the commands data will be null.
 * @return {office.localstore.PendingQueueWriteCommandsOperation} The write
 *     commands operation, or null if no commands were generated and
 *     opt_allowEmptyCommands wasn't specified.
 * @private
 */
office.localstore.PendingQueueCapability.prototype.createWriteCommandsOperation_ =
    function(commands, documentAdapter, docId, lastEntryIndex,
        opt_allowEmptyCommands) {
  if (!opt_allowEmptyCommands && (!commands || commands.length == 0)) {
    return null;
  }

  var commandObjects = [];
  if (commands) {
    for (var i = 0; i < commands.length; i++) {
      commandObjects.push(documentAdapter.createCommandObject(commands[i]));
    }
  }
  return new office.localstore.PendingQueueWriteCommandsOperation(
      docId, commandObjects, lastEntryIndex);
};
