goog.provide('office.localstore.DocumentOperation');

goog.require('office.localstore.Operation');



/**
 * Abstract superclass for all non-record-property-based document operations.
 * @param {office.localstore.Operation.Type} operationType
 * @param {string} docId
 * @param {string} docType
 * @constructor
 * @struct
 * @extends {office.localstore.Operation}
 */
office.localstore.DocumentOperation = function(operationType, docId, docType) {
  goog.base(this, operationType);

  /**
   * @type {string}
   * @private
   */
  this.docId_ = docId;

  /**
   * @type {string}
   * @private
   */
  this.docType_ = docType;
};
goog.inherits(office.localstore.DocumentOperation, office.localstore.Operation);


/**
 * @return {string} The doc id.
 */
office.localstore.DocumentOperation.prototype.getDocId = function() {
  return this.docId_;
};


/**
 * @return {string} The doc type.
 */
office.localstore.DocumentOperation.prototype.getDocType = function() {
  return this.docType_;
};
