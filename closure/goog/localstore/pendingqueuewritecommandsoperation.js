/**
 * @fileoverview The pending queue write commands operation.

 */

goog.provide('office.localstore.PendingQueueWriteCommandsOperation');

goog.require('office.localstore.Operation');



/**
 * Operation that captures all of the data needed to write commands to the
 * pending queue.
 * @param {string} docId
 * @param {!Array.<!Object>} commands The commands to write to the pending
 *     queue, as serialized by the appropriate DocumentAdapter.
 * @param {number} commandIndex
 * @constructor
 * @struct
 * @extends {office.localstore.Operation}
 */
office.localstore.PendingQueueWriteCommandsOperation = function(
    docId, commands, commandIndex) {
  goog.base(this, office.localstore.Operation.Type.PENDING_QUEUE_WRITE_COMMANDS);

  /**
   * @type {string}
   * @private
   */
  this.docId_ = docId;

  /**
   * @type {!Array.<!Object>}
   * @private
   */
  this.commands_ = commands;

  /**
   * @type {number}
   * @private
   */
  this.commandIndex_ = commandIndex;
};
goog.inherits(office.localstore.PendingQueueWriteCommandsOperation,
    office.localstore.Operation);


/**
 * @return {string}
 */
office.localstore.PendingQueueWriteCommandsOperation.prototype.getDocId =
    function() {
  return this.docId_;
};


/**
 * @return {!Array.<!Object>}
 */
office.localstore.PendingQueueWriteCommandsOperation.prototype.getCommands =
    function() {
  return this.commands_;
};


/**
 * @return {number}
 */
office.localstore.PendingQueueWriteCommandsOperation.prototype.getCommandIndex =
    function() {
  return this.commandIndex_;
};
