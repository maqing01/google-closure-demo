

/**
 * @fileoverview Represents an opted-in offline user, as stored in local
 * storage.

 */

goog.provide('office.localstore.ImpressionBatch');
goog.provide('office.localstore.ImpressionBatch.Property');

goog.require('office.localstore.Record');



/**
 * An impression batch that can be persisted to local storage.
 * @param {string} documentId The document ID.
 * @param {number} impressionBatchTime The time, in milliseconds since the
 *     epoch, that this ImpressionBatch was written to the local store.
 * @param {!Array} impressionBatchArray A single serialized impression batch,
 *    as returned by
 *    {@link office.diagnostics.impressions.proto.ImpressionBatch#toArray}.
 * @param {boolean} isNew Whether this is a new impression batch, with no
 *     presence in local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.ImpressionBatch = function(documentId, impressionBatchTime,
    impressionBatchArray, isNew) {
  goog.base(this, office.localstore.Record.Type.IMPRESSION_BATCH, isNew);
  this.setProperty(
      office.localstore.ImpressionBatch.Property.DOCUMENT_ID, documentId);
  this.setProperty(
      office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_TIME,
      impressionBatchTime);
  this.setProperty(
      office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_ARRAY,
      impressionBatchArray);

};
goog.inherits(office.localstore.ImpressionBatch, office.localstore.Record);


/**
 * Property names.
 * @enum {string}
 */
office.localstore.ImpressionBatch.Property = {
  DOCUMENT_ID: '11',
  IMPRESSION_BATCH_ARRAY: '12',
  IMPRESSION_BATCH_TIME: '13'
};


/**
 * Gets the document id.
 * @return {string} The document id.
 */
office.localstore.ImpressionBatch.prototype.getDocumentId = function() {
  return this.getStringProperty(
      office.localstore.ImpressionBatch.Property.DOCUMENT_ID);
};


/**
 * Gets the time, in milliseconds since the epoch, that this ImpressionBatch
 * was written to the local store.
 * @return {number} The impression batch time.
 */
office.localstore.ImpressionBatch.prototype.getImpressionBatchTime = function() {
  return this.getNumberProperty(
      office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_TIME);
};


/**
 * Gets the impression batch represented as an array.
 * @return {!Array} The single serialized impression batch,
 *    as returned by
 *    {@link office.diagnostics.impressions.proto.ImpressionBatch#toArray}.
 */
office.localstore.ImpressionBatch.prototype.getImpressionBatchArray = function() {
  return this.getArrayProperty(
      office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_ARRAY);
};
