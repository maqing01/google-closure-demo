/**
 * @fileoverview Base class for sync stats capability.

 */

goog.provide('office.localstore.SyncStatsCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');
goog.require('office.localstore.SyncStats');



/**
 * Base class for sync stats capability which manages reading and writing the
 * office.localstore.SyncStats record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.SyncStatsCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.SyncStatsCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.SyncStatsCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.SYNC_STATS];
};


/**
 * Gets the sync stats record.
 * @param {function(office.localstore.SyncStats)} resultCallback Callback for when
 *     the sync stats record is retrieved.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.SyncStatsCapability.prototype.getSyncStats =
    goog.abstractMethod;


/**
 * Creates a new SyncStats object. Must be written to the database using write()
 * before any record of it will be seen there.
 * @return {!office.localstore.SyncStats} The new syncStats object.
 */
office.localstore.SyncStatsCapability.prototype.createSyncStats = function() {
  return new office.localstore.SyncStats(true /* isNew */);
};


/** @override */
office.localstore.SyncStatsCapability.prototype.getKeyForRecord =
    function(record) {
  return null;
};


/** @override */
office.localstore.SyncStatsCapability.prototype.isOperationSupported =
    function(operation) {
  return goog.base(this, 'isOperationSupported', operation) &&
      operation.getType() != office.localstore.Operation.Type.DELETE_RECORD;
};
