goog.provide('office.controller.EditActionBinding');

goog.require('office.controller.ActionBinding');

/**
 * @param {!office.edits.EditProvider} editProvider The provider of the edit to
 * bind.
 * @constructor
 * @struct
 * @extends {office.controller.ActionBinding}
 */
office.controller.EditActionBinding = function(editProvider) {
  goog.base(this);

  /**
   * The provider of the edit to bind.
   * @type {!office.edits.EditProvider}
   * @private
   */
  this.editProvider_ = editProvider;
};
goog.inherits(office.controller.EditActionBinding, office.controller.ActionBinding);


/**
 * @return {!office.edits.EditProvider} The edit provider.
 */
office.controller.EditActionBinding.prototype.getEditProvider = function() {
  return this.editProvider_;
};


/**
 * @override
 * @return {!office.controller.EditActionBinding} This, for chaining the method
 *     call.
 */
office.controller.EditActionBinding.prototype.noFocus;


/**
 * @override
 * @return {!office.controller.EditActionBinding} This, for chaining the method
 *     call.
 */
office.controller.EditActionBinding.prototype.requireStates;


/**
 * @override
 * @return {!office.controller.EditActionBinding} This, for chaining the method
 *     call.
 */
office.controller.EditActionBinding.prototype.toAction = function(
    actionId, opt_args) {
  var args = opt_args || {};
  return this.toActionTransformArgs(actionId,
      goog.partial(office.controller.ActionBinding.passConstantArgs, args));
};


/**
 * @override
 * @return {!office.controller.EditActionBinding} This, for chaining the method
 *     call.
 */
office.controller.EditActionBinding.prototype.toActionTransformArgs;


/**
 * @override
 * @return {!office.controller.EditActionBinding} This, for chaining the method
 *     call.
 */
office.controller.EditActionBinding.prototype.toActionPassArgs = function(
    actionId) {
  return this.toActionTransformArgs(actionId, goog.partial(
      office.controller.EditActionBinding.passThroughEditData_, actionId));
};


/**
 * @param {string} actionId The action ID.
 * @param {*} data The action data.
 * @return {!Object} The action data.
 * @throws Error if the action data is not an object.
 * @private
 */
office.controller.EditActionBinding.passThroughEditData_ = function(
    actionId, data) {
  if (!goog.isObject(data)) {
    throw Error('Action data for ' + actionId + ' is not an object.');
  }
  return data;
};
