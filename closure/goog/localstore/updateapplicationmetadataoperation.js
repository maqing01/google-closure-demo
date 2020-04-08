/**
 * @fileoverview An operation for updating application metadata records.

 */

goog.provide('office.localstore.UpdateApplicationMetadataOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.UpdateRecordOperation');



/**
 * An operation for updating application metadata records.
 * @param {office.localstore.StorageCapability.KeyType} key
 * @param {!office.localstore.Record} record
 * @param {Array.<!office.commands.Command>} initialCommands The initial commands,
 *     null when there are no new initial commands.
 * @constructor
 * @struct
 * @extends {office.localstore.UpdateRecordOperation}
 */
office.localstore.UpdateApplicationMetadataOperation = function(
    key, record, initialCommands) {
  goog.base(this, key, record, undefined /* opt_nullableProperties */,
      office.localstore.Operation.Type.UPDATE_APPLICATION_METADATA);

  /**
   * The initial commands.
   * @type {Array.<!office.commands.Command>}
   * @private
   */
  this.initialCommands_ = initialCommands;
};
goog.inherits(office.localstore.UpdateApplicationMetadataOperation,
    office.localstore.UpdateRecordOperation);


/**
 * @return {boolean} Whether there are new initial commands.
 */
office.localstore.UpdateApplicationMetadataOperation.prototype.
    hasNewInitialCommands = function() {
  return this.initialCommands_ != null;
};


/**
 * @return {!Array.<!office.commands.Command>} The initial commands.
 */
office.localstore.UpdateApplicationMetadataOperation.prototype.
    getInitialCommands = function() {
  if (this.initialCommands_) {
    return this.initialCommands_;
  }
  throw Error('No new initial commands are available.');
};
