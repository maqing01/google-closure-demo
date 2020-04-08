/**
 * @fileoverview Contains the definition of the WrappedClipData class.

 */

goog.provide('office.clipboard.WrappedClipData');

goog.require('goog.string');



/**
 * A class that represents serialized clip data that is wrapped in an object
 * with additional metadata.
 * @param {number} docIdHash The document id hash.
 * @param {string} data The serialized clip data.
 * @constructor
 * @struct
 */
office.clipboard.WrappedClipData = function(docIdHash, data) {
  /** @private {number} */
  this.docIdHash_ = docIdHash;

  /** @private {string} */
  this.data_ = data;
};


/**
 * Checks whether the clip data contained was generated from the given document.
 * NOTE: This method is an approximation and could result in false positives.
 * @param {string} documentId The document to check.
 * @return {boolean} Whether the wrapped clip is from the given document.
 */
office.clipboard.WrappedClipData.prototype.isFromDocument = function(documentId) {
  return goog.string.hashCode(documentId) == this.docIdHash_;
};


/**
 * @return {number} The document id hash.
 */
office.clipboard.WrappedClipData.prototype.getDocumentIdHash = function() {
  return this.docIdHash_;
};


/**
 * @return {string} The data.
 */
office.clipboard.WrappedClipData.prototype.getData = function() {
  return this.data_;
};


/**
 * Creates a wrapped clip data object.
 * @param {!string} documentId The document id.
 * @param {!string} data The clip data.
 * @return {!office.clipboard.WrappedClipData} The deserialized clip.
 */
office.clipboard.WrappedClipData.create = function(documentId, data) {
  return new office.clipboard.WrappedClipData(
      goog.string.hashCode(documentId), data);
};
