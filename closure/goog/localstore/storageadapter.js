goog.provide('office.localstore.StorageAdapter');

goog.require('goog.events.EventTarget');



/**
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.StorageAdapter = function() {
  goog.base(this);

  /**
   * @type {!Object.<office.localstore.Record.Type,
   *     !office.localstore.StorageCapability>}
   * @private
   */
  this.recordTypeToCapabilityMap_ = {};
};
goog.inherits(office.localstore.StorageAdapter, goog.events.EventTarget);


/**
 * @param {office.localstore.Record.Type} recordType
 * @return {office.localstore.StorageCapability} The capability, or null if no
 *     capability exists for the specified type.
 */
office.localstore.StorageAdapter.prototype.getCapabilityForRecordType =
    function(recordType) {
  return this.recordTypeToCapabilityMap_[recordType] || null;
};


/**
 * Registers a storage capability with the adapter. If a capability is
 * registered, then LocalStore will use it to generate storage write operations.
 * Capabilities should only be registered once they support operation
 * generation.
 * @param {office.localstore.StorageCapability} capability
 * @protected
 */
office.localstore.StorageAdapter.prototype.registerCapability = function(
    capability) {
  var recordTypes = capability.getSupportedRecordTypes();
  for (var i = 0; i < recordTypes.length; i++) {
    var type = recordTypes[i];
    if (this.recordTypeToCapabilityMap_[type]) {
      throw Error(
          'Record type ' + type + 'already handled by another capability.');
    }
    this.recordTypeToCapabilityMap_[type] = capability;
  }
};


/**
 * @return {office.localstore.NonSnapshottedDocsCapability} The non-snapshotted
 *     documents capability. Returns null by default, should be overriden by
 *     subclass adapters that provide the capability.
 */
office.localstore.StorageAdapter.prototype.getNonSnapshottedDocsCapability =
    function() {
  return null;
};


/**
 * @return {office.localstore.LatencyReportingCapability} The latency reporting
 *     capability. Returns null by default, should be overriden by subclass
 *     adapters that provide the capability.
 */
office.localstore.StorageAdapter.prototype.getLatencyReportingCapability =
    function() {
  return null;
};


/**
 * @return {office.localstore.DocumentEntityCapability} The document entity
 *     capability. Returns null by default, should be overriden by subclass
 *     adapters that provide the capability.
 */
office.localstore.StorageAdapter.prototype.getDocumentEntityCapability =
    function() {
  return null;
};


/**
 * @return {!office.localstore.PendingQueueCapability}
 */
office.localstore.StorageAdapter.prototype.getPendingQueueCapability =
    goog.abstractMethod;


/**
 * @return {office.localstore.DocosCapability}
 */
office.localstore.StorageAdapter.prototype.getDocosCapability = function() {
  return null;
};


/**
 * @return {office.localstore.SyncStatsCapability} The sync stats capability.
 *     Returns null by default, should be overriden by subclass adapters that
 *     provide the capability.
 */
office.localstore.StorageAdapter.prototype.getSyncStatsCapability = function() {
  return null;
};


/**
 * @return {office.localstore.SyncObjectsCapability} The sync objects capability.
 *     Returns null by default, should be overriden by subclass adapters that
 *     provide the capability.
 */
office.localstore.StorageAdapter.prototype.getSyncObjectsCapability = function() {
  return null;
};


/**
 * @return {!office.localstore.DocumentCapability}
 */
office.localstore.StorageAdapter.prototype.getDocumentCapability =
    goog.abstractMethod;


/**
 * @return {office.localstore.WebFontsCapability}
 */
office.localstore.StorageAdapter.prototype.getWebFontsCapability = function() {
  return null;
};


/**
 * @return {office.localstore.DocumentCreationCapability} The document creation
 *     capability. Returns null by default, should be overriden by subclass
 *     adapters that provide the capability.
 */
office.localstore.StorageAdapter.prototype.getDocumentCreationCapability =
    function() {
  return null;
};


/**
 * @return {!office.localstore.UserCapability}
 */
office.localstore.StorageAdapter.prototype.getUserCapability =
    goog.abstractMethod;


/**
 * @return {!office.localstore.DocumentLockCapability}
 */
office.localstore.StorageAdapter.prototype.getDocumentLockCapability =
    goog.abstractMethod;


/**
 * @return {office.localstore.ImpressionCapability}
 */
office.localstore.StorageAdapter.prototype.getImpressionCapability =
    function() {
  return null;
};


/**
 * @return {office.localstore.DatabaseDeletionCapability}
 */
office.localstore.StorageAdapter.prototype.getDatabaseDeletionCapability =
    function() {
  return null;
};


/**
 * Package private. Performs a set of operations on the underlying storage
 * layer.
 * @param {!Array.<!office.localstore.Operation>} operations The operations to
 *     perform.
 * @param {function()} completionCallback Callback to call when complete.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.StorageAdapter.prototype.performOperations =
    goog.abstractMethod;
