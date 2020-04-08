goog.provide('office.localstore.LocalStore');

goog.require('goog.events.EventTarget');
goog.require('goog.log');



/**
 * This constructor is package-private, an instance should be obtained from
 * LocalStorageManager.  Presents the basic object storage and retrieval API,
 * and farms the actual work out to the current storage adapter.
 * @param {!office.localstore.StorageAdapter} storageAdapter The storage adapter
 *     for current schema version.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.LocalStore = function(storageAdapter) {
  goog.base(this);

  /**
   * @type {!office.localstore.StorageAdapter}
   * @private
   */
  this.storageAdapter_ = storageAdapter;
  storageAdapter.setParentEventTarget(this);

  /**
   * Whether the local store is safe to write to. This value should be false
   * when used by an editor without the document lock, or when the database is
   * corrupt.
   * @type {boolean}
   * @private
   */
  this.isWritable_ = false;
};
goog.inherits(office.localstore.LocalStore, goog.events.EventTarget);


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.LocalStore.prototype.logger_ =
    goog.log.getLogger('office.localstore.LocalStore');


/**
 * @return {boolean} Whether the local store is safe to write to.
 */
office.localstore.LocalStore.prototype.isWritable = function() {
  return this.isWritable_;
};


/**
 * Sets whether the local store is safe to write to.
 */
office.localstore.LocalStore.prototype.setWritable = function() {
  if (this.isWritable_) {
    throw Error('Called setWritable on an already writable localstore.');
  }
  this.isWritable_ = true;
};


/**
 * @return {!office.localstore.UserCapability}
 */
office.localstore.LocalStore.prototype.getUserCapability = function() {
  return this.storageAdapter_.getUserCapability();
};


/**
 * @return {office.localstore.NonSnapshottedDocsCapability}
 */
office.localstore.LocalStore.prototype.getNonSnapshottedDocsCapability =
    function() {
  return this.storageAdapter_.getNonSnapshottedDocsCapability();
};


/**
 * @return {office.localstore.DocumentEntityCapability}
 */
office.localstore.LocalStore.prototype.getDocumentEntityCapability = function() {
  return this.storageAdapter_.getDocumentEntityCapability();
};


/**
 * @return {!office.localstore.PendingQueueCapability}
 */
office.localstore.LocalStore.prototype.getPendingQueueCapability = function() {
  return this.storageAdapter_.getPendingQueueCapability();
};


/**
 * @return {office.localstore.DocosCapability}
 */
office.localstore.LocalStore.prototype.getDocosCapability = function() {
  return this.storageAdapter_.getDocosCapability();
};


/**
 * @return {!office.localstore.DocumentCapability}
 */
office.localstore.LocalStore.prototype.getDocumentCapability = function() {
  return this.storageAdapter_.getDocumentCapability();
};


/**
 * @return {office.localstore.WebFontsCapability}
 */
office.localstore.LocalStore.prototype.getWebFontsCapability = function() {
  return this.storageAdapter_.getWebFontsCapability();
};


/**
 * @return {office.localstore.SyncStatsCapability}
 */
office.localstore.LocalStore.prototype.getSyncStatsCapability = function() {
  return this.storageAdapter_.getSyncStatsCapability();
};


/**
 * @return {office.localstore.LatencyReportingCapability}
 */
office.localstore.LocalStore.prototype.getLatencyReportingCapability =
    function() {
  return this.storageAdapter_.getLatencyReportingCapability();
};


/**
 * @return {office.localstore.DocumentCreationCapability}
 */
office.localstore.LocalStore.prototype.getDocumentCreationCapability =
    function() {
  return this.storageAdapter_.getDocumentCreationCapability();
};


/**
 * @return {office.localstore.SyncObjectsCapability}
 */
office.localstore.LocalStore.prototype.getSyncObjectsCapability =
    function() {
  return this.storageAdapter_.getSyncObjectsCapability();
};


/**
 * @return {!office.localstore.DocumentLockCapability}
 */
office.localstore.LocalStore.prototype.getDocumentLockCapability =
    function() {
  return this.storageAdapter_.getDocumentLockCapability();
};


/**
 * @return {office.localstore.DatabaseDeletionCapability}
 */
office.localstore.LocalStore.prototype.getDatabaseDeletionCapability =
    function() {
  return this.storageAdapter_.getDatabaseDeletionCapability();
};


/**
 * Write an array of record objects into storage.
 * @param {!Array.<!office.localstore.Record>} records The records to write.
 * @param {function()} completionCallback A function which will be called
 *     asynchronously once the write is complete.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.LocalStore.prototype.write = function(records,
    completionCallback, opt_errorCallback) {
  if (!this.isWritable_) {
    throw Error('Cannot write to read-only local store.');
  }
  goog.log.fine(this.logger_, 'write()');

  var operations = [];
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    if (record.shouldWriteIfClean() || record.isModified() ||
        record.isToBeDeleted()) {
      var storageCapability =
          this.storageAdapter_.getCapabilityForRecordType(
              record.getRecordType());
      if (storageCapability) {
        // We have a registered capability, so we should be able to turn the
        // record into operations.
        var newOperations =
            storageCapability.createOperationsForRecord(record);
        operations = operations.concat(newOperations);
        record.commit();
      } else {
        throw Error(
            'No Capability for record :' + record.getRecordType());
      }
    }
  }
  if (operations.length == 0) {
    goog.log.fine(this.logger_, 'write() found no operations, abandoned.');
    completionCallback();
  } else {
    goog.log.fine(
        this.logger_, 'write() found operations, calling storage adapter.');
    this.storageAdapter_.performOperations(
        operations, completionCallback, opt_errorCallback);
  }
};


/** @override */
office.localstore.LocalStore.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  delete this.storageAdapter_;
};
