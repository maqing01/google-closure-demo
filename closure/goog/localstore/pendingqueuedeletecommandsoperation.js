/**
 * @fileoverview The pending queue delete commands operation.

 */

goog.provide('office.localstore.PendingQueueDeleteCommandsOperation');

goog.require('office.localstore.Operation');



/**
 * Operation that captures all of the data needed to delete commands from the
 * pending queue.
 * @param {string} docId
 * @param {number} lastCommandIndex The index of the last appended commands
 *     bundle entry to be included in the deletion.
 * @constructor
 * @struct
 * @extends {office.localstore.Operation}
 */
office.localstore.PendingQueueDeleteCommandsOperation = function(
    docId, lastCommandIndex) {
  goog.base(this, office.localstore.Operation.Type.PENDING_QUEUE_DELETE_COMMANDS);

  /**
   * @type {string}
   * @private
   */
  this.docId_ = docId;

  /**
   * The index of the last appended commands bundle entry to be included in the
   * deletion.
   * @type {number}
   * @private
   */
  this.lastCommandIndex_ = lastCommandIndex;
};
goog.inherits(office.localstore.PendingQueueDeleteCommandsOperation,
    office.localstore.Operation);


/**
 * @return {string}
 */
office.localstore.PendingQueueDeleteCommandsOperation.prototype.getDocId =
    function() {
  return this.docId_;
};


/**
 * @return {number} The index of the last appended commands bundle entry to be
 *     included in the deletion.
 */
office.localstore.PendingQueueDeleteCommandsOperation.prototype.
    getLastCommandIndex = function() {
  return this.lastCommandIndex_;
};

