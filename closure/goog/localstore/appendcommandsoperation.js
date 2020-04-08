goog.provide('office.localstore.AppendCommandsOperation');

goog.require('office.localstore.DocumentOperation');
goog.require('office.localstore.Operation');



/**
 * @param {string} docId
 * @param {string} docType
 * @param {!Array.<!office.localstore.LocalStorageCommandBatch>} commandBatches
 * @param {boolean} isStaged Whether the commands are staged commands.
 * @param {boolean} shouldReplace Whether to replace any of preexisting commands
 *      with these.
 * @constructor
 * @struct
 * @extends {office.localstore.DocumentOperation}
 */
office.localstore.AppendCommandsOperation = function(
    docId, docType, commandBatches, isStaged, shouldReplace) {
  goog.base(
      this, office.localstore.Operation.Type.APPEND_COMMANDS, docId, docType);

  /**
   * @type {!Array.<!office.localstore.LocalStorageCommandBatch>}
   * @private
   */
  this.commandBatches_ = commandBatches;

  /**
   * @type {boolean}
   * @private
   */
  this.isStaged_ = isStaged;

  /**
   * @type {boolean}
   * @private
   */
  this.shouldReplace_ = shouldReplace;
};
goog.inherits(office.localstore.AppendCommandsOperation,
    office.localstore.DocumentOperation);


/**
 * @return {!Array.<!office.localstore.LocalStorageCommandBatch>}
 */
office.localstore.AppendCommandsOperation.prototype.getCommandBatches =
    function() {
  return this.commandBatches_;
};


/**
 * @return {boolean} Whether the commands should be appended to staged commands
 *     or the actual commands.
 */
office.localstore.AppendCommandsOperation.prototype.getIsStaged = function() {
  return this.isStaged_;
};


/**
 * @return {boolean} Whether these commands should replace the preexisting
 *     commands.
 */
office.localstore.AppendCommandsOperation.prototype.getShouldReplace =
    function() {
  return this.shouldReplace_;
};
