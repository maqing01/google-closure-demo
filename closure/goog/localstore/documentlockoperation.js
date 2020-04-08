/**
 * @fileoverview Contains the definition of the DocumentLockOperation class.

 */

goog.provide('office.localstore.DocumentLockOperation');

goog.require('office.localstore.Operation');



/**
 * Operation for document lock requirements. This operation is used to ensure
 * that the session satisfies all necessary lock requirements.
 * @param {string} docId
 * @param {office.localstore.DocumentLockRequirement.Level} level
 * @constructor
 * @struct
 * @extends {office.localstore.Operation}
 */
office.localstore.DocumentLockOperation = function(docId, level) {
  goog.base(this, office.localstore.Operation.Type.DOCUMENT_LOCK);

  /** @private {string} */
  this.docId_ = docId;

  /** @private {office.localstore.DocumentLockRequirement.Level} */
  this.level_ = level;
};
goog.inherits(office.localstore.DocumentLockOperation, office.localstore.Operation);


/** @return {string} The document ID. */
office.localstore.DocumentLockOperation.prototype.getDocId = function() {
  return this.docId_;
};


/** @return {office.localstore.DocumentLockRequirement.Level} */
office.localstore.DocumentLockOperation.prototype.getLevel = function() {
  return this.level_;
};
