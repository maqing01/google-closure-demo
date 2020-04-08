/**
 * @fileoverview The unstage commands operation.

 */

goog.provide('office.localstore.UnstageCommandsOperation');

goog.require('office.localstore.DocumentOperation');
goog.require('office.localstore.Operation');



/**
 * Operation that captures all of the data needed to unstage document commands
 * @param {string} docId
 * @param {string} docType
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentOperation}
 */
office.localstore.UnstageCommandsOperation = function(docId, docType) {
  goog.base(this, office.localstore.Operation.Type.UNSTAGE_COMMANDS, docId,
      docType);
};
goog.inherits(office.localstore.UnstageCommandsOperation,
    office.localstore.DocumentOperation);
