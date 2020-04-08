

/**
 * @fileoverview This object hosts the public APIs used to read and write
 * records to local storage.

 */

goog.provide('office.localstore.ImpressionCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.ImpressionBatch');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');



/**
 * Base class for the impression capability which manages reading and writing
 * the office.localstore.ImpressionBatch record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.ImpressionCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.ImpressionCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.ImpressionCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.IMPRESSION_BATCH];
};


/** @override */
office.localstore.ImpressionCapability.prototype.getKeyForRecord =
    function(record) {
  var batch = /** @type {!office.localstore.ImpressionBatch} */ (record);
  return [batch.getDocumentId(), batch.getImpressionBatchTime()];
};


/** @override */
office.localstore.ImpressionCapability.prototype.isOperationSupported =
    function(operation) {
  return goog.base(this, 'isOperationSupported', operation) && (
      (operation.getType() == office.localstore.Operation.Type.UPDATE_RECORD &&
          (/** @type {!office.localstore.UpdateRecordOperation} */ (operation)).
              isNew()) ||
      (operation.getType() == office.localstore.Operation.Type.DELETE_RECORD));
};


/**
 * Reads all impression batches from local store.
 * @param {function(!Array.<!office.localstore.ImpressionBatch>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.ImpressionCapability.prototype.readImpressionBatches =
    goog.abstractMethod;


/**
 * Creates a new impression batch object.  Must be written to the database using
 * write() before any record of it will be seen there.
 * @param {string} documentId The document ID.
 * @param {number} impressionBatchTime The time, in milliseconds since the
 *     epoch, that this ImpressionBatch was written to the local store.
 * @param {!Array} impressionBatchArray The impression batch represented as an
 *     array.
 * @return {!office.localstore.ImpressionBatch} The new impression batch object.
 */
office.localstore.ImpressionCapability.prototype.createImpressionBatch = function(
    documentId, impressionBatchTime, impressionBatchArray) {
  return new office.localstore.ImpressionBatch(documentId, impressionBatchTime,
      impressionBatchArray, true /* isNew */);
};
