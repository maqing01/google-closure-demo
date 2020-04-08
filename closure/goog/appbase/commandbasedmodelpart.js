goog.provide('office.app.CommandBasedModelPart');

goog.require('office.app.ModelPart');



/**
 * @param {!Array.<!office.commands.Command>} commands The commands making up this
 *     model part.
 * @constructor
 * @struct
 * @implements {office.app.ModelPart}
 */
office.app.CommandBasedModelPart = function(commands) {

  /**
   * @type {!Array.<!office.commands.Command>}
   * @private
   */
  this.commands_ = commands;
};


/**
 * @return {!Array.<!office.commands.Command>} The commands making up this model
 *     part.
 */
office.app.CommandBasedModelPart.prototype.getCommands = function() {
  return this.commands_;
};


/** @override */
office.app.CommandBasedModelPart.prototype.append = function(modelPart) {
  if (!(modelPart instanceof office.app.CommandBasedModelPart)) {
    throw new Error('Can only append CommandBasedModelParts.');
  }
  return new office.app.CommandBasedModelPart(
      this.commands_.concat(modelPart.getCommands()));
};
