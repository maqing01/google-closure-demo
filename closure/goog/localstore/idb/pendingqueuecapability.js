goog.provide('office.localstore.idb.PendingQueueCapability');

goog.require('office.localstore.Operation');
goog.require('office.localstore.PendingQueue');
goog.require('office.localstore.PendingQueueCapability');
goog.require('office.localstore.UpdateRecordOperation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.PendingQueueStorageObject');
goog.require('office.localstore.idb.StoreName');
goog.require('office.localstore.idb.unsavedChangesBit');
goog.require('office.storage.CommandBundle');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Concrete implementation of the pending queue capability using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @param {!office.debug.ErrorReporterApi} errorReporter The docs error reporter.
 * @constructor
 * @struct
 * @implements {office.localstore.idb.IdbStorageCapability}
 * @extends {office.localstore.PendingQueueCapability}
 */
office.localstore.idb.PendingQueueCapability = function(
    db, idbUtil, documentAdapters, errorReporter) {
  goog.base(this, documentAdapters);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;

  /**
   * Error reporter.
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;
};
goog.inherits(office.localstore.idb.PendingQueueCapability,
    office.localstore.PendingQueueCapability);


/** @override */
office.localstore.idb.PendingQueueCapability.prototype.readPendingQueue =
    function(docId, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction([
    office.localstore.idb.StoreName.PENDING_QUEUES,
    office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS
  ], '.', opt_errorCallback);

  var abandonTransactionAndResultCallback = function(result) {
    transaction.abandon();
    resultCallback(result);
  };

  var pendingQueuesStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUES);
  var request = pendingQueuesStore.get(docId);
  var capability = this;
  request.setSuccessCallback(function(e) {
    var metadata = e.target.result;
    if (metadata) {
      capability.readPendingQueueCommands_(
          docId, transaction, metadata, abandonTransactionAndResultCallback);
    } else {
      abandonTransactionAndResultCallback(null);
    }
  });
};


/**
 * Continues the process of reading a pending queue by fetching its entries in
 * the commands object store.
 * @param {string} docId The document id.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @param {!Object} metadata The pending queue metadata persistence object.
 * @param {function(office.localstore.PendingQueue)} resultCallback The
 *     readPendingQueue result delivery callback.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.readPendingQueueCommands_ =
    function(docId, transaction, metadata, resultCallback) {
  var docType = metadata[
      office.localstore.idb.PendingQueueStorageObject.MetadataKey.DOC_TYPE];
  var documentAdapter = this.getDocumentAdapter(docType);
  if (!documentAdapter) {
    throw Error('No document adapter available for type ' + docType);
  }

  var store = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  var request = this.idbUtil_.getCursorRequest(store, [docId], [docId, []]);

  var capability = this;
  var commandObjects = [];
  request.setSuccessCallback(function(e) {
    var cursor = e.target.result;
    if (cursor) {
      commandObjects.push(cursor.value);
      cursor['continue']();
    } else {
      resultCallback(capability.createPendingQueue_(
          metadata, commandObjects, documentAdapter));
    }
  });
};


/**
 * Creates a pending queue record object given persistence objects from the
 * pending queue and pending queue commands object stores.
 * @param {!Object} metadata The pending queue metadata persistence object.
 * @param {!Array.<!Object>} commandObjects The queue's command storage objects.
 * @param {!office.localstore.DocumentAdapter} documentAdapter The document
 *     adapter.
 * @return {!office.localstore.PendingQueue} The pending queue record object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.createPendingQueue_ =
    function(metadata, commandObjects, documentAdapter) {
  var MetadataKey = office.localstore.idb.PendingQueueStorageObject.MetadataKey;
  var CommandKey = office.localstore.idb.PendingQueueStorageObject.CommandKey;
  var CommandKeyIndex =
      office.localstore.idb.PendingQueueStorageObject.CommandKeyIndex;
  var CommandBundleKey =
      office.localstore.idb.PendingQueueStorageObject.CommandBundleKey;

  // Sort command objects into sent bundles and the unsent queue.
  var bundleMetadata = metadata[MetadataKey.COMMAND_BUNDLES];
  var bundleIndex = 0;
  var commands = [];
  var sentCommandBundles = [];
  var commandIndex = -1;
  for (var i = 0; i < commandObjects.length; i++) {
    var commandObject = commandObjects[i];
    var commandObjectArray = commandObject[CommandKey.COMMANDS];
    var idbCommandBasedDocumentAdapter =
        /**@type {!office.localstore.idb.CommandBasedDocumentAdapter} */
        (documentAdapter);
    goog.array.extend(
        commands, idbCommandBasedDocumentAdapter.parseCommands(
            commandObjectArray, true /* opt_deserializationTiming */));
    commandIndex = commandObject[CommandKey.KEY][
        CommandKeyIndex.COMMANDS_INDEX];
    if (bundleIndex < bundleMetadata.length) {
      var bundle = bundleMetadata[bundleIndex];
      if (bundle[CommandBundleKey.LAST_ENTRY_INDEX] == commandIndex) {
        // This is the last command object in this bundle.
        sentCommandBundles.push(new office.storage.CommandBundle(commands,
            bundle[CommandBundleKey.REQUEST_ID],
            bundle[CommandBundleKey.SESSION_ID]));
        commands = [];
        bundleIndex++;
      }
    }
  }

  var pendingQueue = new office.localstore.PendingQueue(
      goog.asserts.assertString(metadata[MetadataKey.DOC_ID]),
      /** @type {office.localstore.Document.Type} */ (
          goog.asserts.assertString(metadata[MetadataKey.DOC_TYPE])),
      false /* isNew */, commandIndex, sentCommandBundles,
      commands /* unsentCommands */);
  pendingQueue.setRevision(metadata[MetadataKey.REVISION]);

  // NOTE: The underliverable and unsaved changes bit were added after the
  // initial idb rollout and are thus not guranteed to exist.
  pendingQueue.setUndeliverable(!!metadata[MetadataKey.UNDELIVERABLE]);
  pendingQueue.setUnsavedChanges(!!metadata[MetadataKey.UNSAVED_CHANGES]);
  pendingQueue.markAsInitialized();
  return pendingQueue;
};


/** @override */
office.localstore.idb.PendingQueueCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [
    office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS,
    office.localstore.idb.StoreName.PENDING_QUEUES
  ];
};


/** @override */
office.localstore.idb.PendingQueueCapability.prototype.performOperation =
    function(operation, transaction) {
  if (this.needsMetadataUpdate_(operation)) {
    var recordOperation =
        /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
    // Read existing pending queue metadata.
    var store = transaction.getObjectStore(
        office.localstore.idb.StoreName.PENDING_QUEUES);
    var request = store.get(/** @type {string} */ (recordOperation.getKey()));
    request.setSuccessCallback(goog.bind(this.handleReadMetadataSuccess_, this,
        operation, transaction));
  } else {
    this.performOperation_(operation, transaction);
  }
};


/**
 * @param {!office.localstore.Operation} operation
 * @return {boolean} Whether the operation needs pending queue metadata to be
 *     read from storage before it can be performed.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.needsMetadataUpdate_ =
    function(operation) {
  if (operation instanceof office.localstore.UpdateRecordOperation) {
    var recordOperation =
        /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
    return !recordOperation.isNew();
  }
  return false;
};


/**
 * @param {!office.localstore.Operation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Event} e The success event.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.
    handleReadMetadataSuccess_ = function(operation, transaction, e) {
  var metadata = e.target.result;
  if (!metadata) {
    throw Error('Tried to update a non-existent pending queue.');
  }
  this.performOperation_(operation, transaction, metadata);
};


/**
 * @param {!office.localstore.Operation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.performOperation_ =
    function(operation, transaction, opt_metadata) {
  if (opt_metadata) {
    this.applyPropertyModifications_(
        /** @type {!office.localstore.UpdateRecordOperation} */ (operation),
        opt_metadata);
  }
  switch (operation.getType()) {
    case office.localstore.Operation.Type.PENDING_QUEUE_CLEAR:
      this.clear_(/** @type {!office.localstore.PendingQueueClearOperation} */ (
          operation), transaction, opt_metadata);
      break;
    case office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT:
      this.clearSentItems_(
          /** @type {!office.localstore.PendingQueueClearSentOperation} */ (
              operation), transaction, opt_metadata);
      break;
    case office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT_BUNDLE:
      this.clearSentBundle_(
          /** @type {!office.localstore.PendingQueueClearSentBundleOperation} */ (
              operation), transaction, opt_metadata);
      break;
    case office.localstore.Operation.Type.PENDING_QUEUE_MARK_SENT_BUNDLE:
      this.markSentBundle_(
          /** @type {!office.localstore.PendingQueueMarkSentBundleOperation} */ (
              operation), transaction, opt_metadata);
      break;
    case office.localstore.Operation.Type.UPDATE_RECORD:
      this.updateRecord_(/** @type {!office.localstore.UpdateRecordOperation} */ (
          operation), transaction, opt_metadata);
      break;
    case office.localstore.Operation.Type.PENDING_QUEUE_WRITE_COMMANDS:
      this.writeCommands_(
          /** @type {!office.localstore.PendingQueueWriteCommandsOperation} */ (
              operation), transaction);
      break;
    case office.localstore.Operation.Type.PENDING_QUEUE_DELETE_COMMANDS:
      this.deleteCommands_(
          /** @type {!office.localstore.PendingQueueDeleteCommandsOperation} */ (
              operation), transaction);
      break;
    default:
      throw Error('Unsupported operation type: ' + operation.getType());
  }
};


/**
 * Clears all commands, sent and unsent, from the given pending queue.
 * @param {!office.localstore.PendingQueueClearOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.clear_ =
    function(operation, transaction, opt_metadata) {
  goog.asserts.assert(opt_metadata || operation.isNew());
  var metadata = opt_metadata || this.createMetadata_(operation);
  var docId = operation.getDocId();

  // Delete all commands from storage.
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  this.idbUtil_.deleteFromStore(commandStore, [docId], [docId, []]);

  // Clear sent bundle metadata.
  var MetadataKey = office.localstore.idb.PendingQueueStorageObject.MetadataKey;
  metadata[MetadataKey.COMMAND_BUNDLES] = [];
  this.writeMetadata_(metadata, transaction);
};


/**
 * Clears all sent commands from the given pending queue.
 * @param {!office.localstore.PendingQueueClearSentOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.clearSentItems_ =
    function(operation, transaction, opt_metadata) {
  goog.asserts.assert(opt_metadata || operation.isNew());
  var metadata = opt_metadata || this.createMetadata_(operation);

  var bundlesKey =
      office.localstore.idb.PendingQueueStorageObject.MetadataKey.COMMAND_BUNDLES;
  var bundles = metadata[bundlesKey];
  if (bundles.length > 0) {
    // Get the index of the last sent command from the bundle metadata.
    var lastIndex = bundles[bundles.length - 1][office.localstore.idb.
        PendingQueueStorageObject.CommandBundleKey.LAST_ENTRY_INDEX];

    // Delete up to and including that command.
    var commandStore = transaction.getObjectStore(
        office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
    var docId = operation.getDocId();
    this.idbUtil_.deleteFromStore(commandStore, [docId], [docId, lastIndex]);

    // Clear bundle metadata.
    metadata[bundlesKey] = [];
  }

  this.writeMetadata_(metadata, transaction);
};


/**
 * Clears the first bundle of sent commands from the given pending queue.
 * @param {!office.localstore.PendingQueueClearSentBundleOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.clearSentBundle_ =
    function(operation, transaction, opt_metadata) {
  goog.asserts.assert(opt_metadata || operation.isNew());
  var metadata = opt_metadata || this.createMetadata_(operation);

  var bundlesKey =
      office.localstore.idb.PendingQueueStorageObject.MetadataKey.COMMAND_BUNDLES;
  var firstBundle = metadata[bundlesKey].shift();
  goog.asserts.assert(firstBundle);

  // Get the index of the first sent command bundle from the bundle metadata.
  var lastIndex = firstBundle[
      office.localstore.idb.PendingQueueStorageObject.CommandBundleKey.
          LAST_ENTRY_INDEX];

  // Delete up to and including that command.
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  var docId = operation.getDocId();
  this.idbUtil_.deleteFromStore(commandStore, [docId], [docId, lastIndex]);

  this.writeMetadata_(metadata, transaction);
};


/**
 * Marks one or more bundles as sent in the queue.
 * @param {!office.localstore.PendingQueueMarkSentBundleOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.markSentBundle_ =
    function(operation, transaction, opt_metadata) {
  goog.asserts.assert(opt_metadata || operation.isNew());
  var metadata = opt_metadata || this.createMetadata_(operation);
  var bundles = operation.getBundleMetadata();
  var MetadataKey = office.localstore.idb.PendingQueueStorageObject.MetadataKey;

  if (operation.shouldReplaceOldBundles()) {
    // We should replace the old bundles with the new ones instead of appending.
    metadata[MetadataKey.COMMAND_BUNDLES] = [];
  }
  for (var i = 0; i < bundles.length; i++) {
    var bundle = bundles[i];
    var CommandBundleKey =
        office.localstore.idb.PendingQueueStorageObject.CommandBundleKey;
    var bundleMetadataObj = {};
    bundleMetadataObj[CommandBundleKey.LAST_ENTRY_INDEX] =
        bundle.lastEntryIndex;
    bundleMetadataObj[CommandBundleKey.SESSION_ID] = bundle.sessionId;
    bundleMetadataObj[CommandBundleKey.REQUEST_ID] = bundle.requestId;
    metadata[MetadataKey.COMMAND_BUNDLES].push(bundleMetadataObj);
  }

  this.writeMetadata_(metadata, transaction);
};


/**
 * Marks one or more bundles as sent in the queue.
 * @param {!office.localstore.UpdateRecordOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {!Object=} opt_metadata The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.updateRecord_ =
    function(operation, transaction, opt_metadata) {
  goog.asserts.assert(opt_metadata || operation.isNew());
  var metadata = opt_metadata || this.createMetadata_(operation);
  this.writeMetadata_(metadata, transaction);
};


/**
 * Writes pending queue commands to local storage.
 * @param {!office.localstore.PendingQueueWriteCommandsOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.writeCommands_ =
    function(operation, transaction) {
  var commandObjects = operation.getCommands();

  var CommandKey = office.localstore.idb.PendingQueueStorageObject.CommandKey;
  var commandsObj = {};
  commandsObj[CommandKey.KEY] = [
    operation.getDocId(), operation.getCommandIndex()
  ];
  commandsObj[CommandKey.COMMANDS] = commandObjects;

  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  commandStore.put(commandsObj);
};


/**
 * Deletes commands from local storage.
 * @param {!office.localstore.PendingQueueDeleteCommandsOperation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.deleteCommands_ =
    function(operation, transaction) {
  var commandStore = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUE_COMMANDS);
  var docId = operation.getDocId();
  this.idbUtil_.deleteFromStore(commandStore,
      [docId] /* lowerBound */,
      [docId, operation.getLastCommandIndex()] /* opt_upperBound */);
};


/**
 * Persists the given pending queue metadata.
 * @param {!Object} metadata The pending queue metadata.
 * @param {!office.localstore.idb.Transaction} transaction The IDB transaction.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.writeMetadata_ =
    function(metadata, transaction) {
  var store = transaction.getObjectStore(
      office.localstore.idb.StoreName.PENDING_QUEUES);
  store.put(metadata);
};


/**
 * Copies modifications to the pending queue record object into the persistence
 * object.  Does not include operations or sent bundle metadata.
 * @param {!office.localstore.UpdateRecordOperation} operation
 * @param {!Object} metadata The pending queue metadata persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.
    applyPropertyModifications_ = function(operation, metadata) {
  var modifications = operation.getModifications();
  var revision = modifications[office.localstore.PendingQueue.Property.REVISION];
  var MetadataKey = office.localstore.idb.PendingQueueStorageObject.MetadataKey;
  if (goog.isDefAndNotNull(revision)) {
    metadata[MetadataKey.REVISION] = revision;
  }

  var accessLevel = modifications[
      office.localstore.PendingQueue.Property.ACCESS_LEVEL];
  if (goog.isDefAndNotNull(accessLevel)) {
    metadata[MetadataKey.ACCESS_LEVEL] = accessLevel;
  }

  // Boolean record properties are stored as strings.
  var isUndeliverableString =
      modifications[office.localstore.PendingQueue.Property.UNDELIVERABLE];
  if (goog.isDef(isUndeliverableString)) {
    metadata[MetadataKey.UNDELIVERABLE] = !!isUndeliverableString;
  }

  var hasUnsavedChanges =
      modifications[office.localstore.PendingQueue.Property.UNSAVED_CHANGES];
  if (goog.isDef(hasUnsavedChanges)) {
    metadata[MetadataKey.UNSAVED_CHANGES] = !!hasUnsavedChanges;
  }

  // As a backup we write this bit globally to local storage if it was
  // modified to true. The bit can then be used to detect dataloss in
  // case the idb is corrupted. Since this bit is stored globally for all
  // pending queues we can't clear it if a single pending queue is cleared.
  // Instead we clear it in the bulk syncer after all pending queues were
  // synced and are empty.
  if (hasUnsavedChanges) {
    office.localstore.idb.unsavedChangesBit.set(this.errorReporter_);
  }
};


/**
 * Creates a new pending queue metadata persistence object from a pending queue
 * record update operation.  The metadata object will have an empty command
 * bundles array regardless of what is in the record object.
 * @param {!office.localstore.UpdateRecordOperation} operation The update record
 *     operation.
 * @return {!Object} The pending queue persistence object.
 * @private
 */
office.localstore.idb.PendingQueueCapability.prototype.createMetadata_ =
    function(operation) {
  goog.asserts.assert(operation.isNew());

  var modifications = operation.getModifications();

  var MetadataKey = office.localstore.idb.PendingQueueStorageObject.MetadataKey;
  var metadataObj = {};
  var accessLevel =
      modifications[office.localstore.PendingQueue.Property.ACCESS_LEVEL];
  if (goog.isDef(accessLevel)) {
    metadataObj[MetadataKey.ACCESS_LEVEL] =
        goog.asserts.assertNumber(accessLevel);
  }
  metadataObj[MetadataKey.DOC_ID] = goog.asserts.assertString(
      modifications[office.localstore.PendingQueue.Property.DOC_ID]);
  metadataObj[MetadataKey.REVISION] = goog.asserts.assertNumber(
      modifications[office.localstore.PendingQueue.Property.REVISION]);
  metadataObj[MetadataKey.COMMAND_BUNDLES] = [];
  metadataObj[MetadataKey.DOC_TYPE] = goog.asserts.assertString(
      modifications[office.localstore.PendingQueue.Property.DOC_TYPE]);
  // Boolean properties in Records are serialized as strings ('true' and '').
  metadataObj[MetadataKey.UNDELIVERABLE] =
      !!modifications[office.localstore.PendingQueue.Property.UNDELIVERABLE];
  metadataObj[MetadataKey.UNSAVED_CHANGES] =
      !!modifications[office.localstore.PendingQueue.Property.UNSAVED_CHANGES];
  return metadataObj;
};
