goog.provide('office.controller.ActionBinding');

goog.require('goog.functions');
goog.require('goog.object');



/**
 * @constructor
 * @struct
 */
office.controller.ActionBinding = function() {

  /**
   * The set of required states for the action to be enabled.
   * @type {!Object.<boolean>}
   * @private
   */
  this.states_ = {};

  /**
   * Whether the action should focus the editor.
   * @type {boolean}
   * @private
   */
  this.focus_ = true;

  /**
   * A map of action id to transform function.
   * @type {!Object.<string, function(*): !Object>}
   * @private
   */
  this.argFnMap_ = {};
};


/**
 * Specifies that the action should not focus the editor.
 * @return {!office.controller.ActionBinding} This, for chaining the method call.
 */
office.controller.ActionBinding.prototype.noFocus = function() {
  this.focus_ = false;
  return this;
};


/**
 * Adds the given states to the list of required states for the actions in this
 * binding to be enabled.
 * @param {!Array.<string>} states The states to be added to the list of
 *     required states.
 * @return {!office.controller.ActionBinding} This, for chaining the method call.
 */
office.controller.ActionBinding.prototype.requireStates = function(states) {
  for (var i = 0; i < states.length; i++) {
    this.states_[states[i]] = true;
  }
  return this;
};


/**
 * @return {boolean} Whether to focus the editor.
 */
office.controller.ActionBinding.prototype.getFocus = function() {
  return this.focus_;
};


/**
 * @return {!Array.<string>} The required states.
 */
office.controller.ActionBinding.prototype.getStates = function() {
  return goog.object.getKeys(this.states_);
};


/**
 * Binds the action id and optionally passes the given arguments when the action
 * is fired.
 * @param {string} actionId The action id.
 * @param {*=} opt_args The optional arguments when the action is fired.
 * @return {!office.controller.ActionBinding} This, for chaining.
 */
office.controller.ActionBinding.prototype.toAction = goog.abstractMethod;


/**
 * Binds the action id and registers a transform function for the given action
 * id.
 * @param {string} actionId The action ID.
 * @param {function(*): !Object} transformFn The transform function of the given
 *     action id.
 * @return {!office.controller.ActionBinding} This, for chaining.
 */
office.controller.ActionBinding.prototype.toActionTransformArgs = function(
    actionId, transformFn) {
  this.argFnMap_[actionId] = transformFn;
  return this;
};


/**
 * Binds the action id and registers a pass through args transform function for
 * the given action id.
 * @param {string} actionId The action ID.
 * @return {!office.controller.ActionBinding} This, for chaining.
 */
office.controller.ActionBinding.prototype.toActionPassArgs = function(actionId) {
  this.argFnMap_[actionId] = goog.functions.identity;
  return this;
};


/**
 * @return {!Array.<string>} The action ids.
 */
office.controller.ActionBinding.prototype.getActionIds = function() {
  return goog.object.getKeys(this.argFnMap_);
};


/**
 * Returns the transform function for the given action ID. Throws an error if
 * there is no transform function for the given action id.
 * @param {string} actionId The action ID.
 * @return {function(*): !Object} The transform function for the given action
 *     ID.
 */
office.controller.ActionBinding.prototype.getTransformFn = function(actionId) {
  if (!this.argFnMap_[actionId]) {
    throw Error('There is no transform function for the action id: ' +
        actionId);
  }
  return this.argFnMap_[actionId];
};


/**
 * Returns the given args and ignores the action data.
 * @param {!Object} args The args to return.
 * @param {*} actionData The action data.
 * @return {!Object} The given args.
 * @protected
 */
office.controller.ActionBinding.passConstantArgs = function(args, actionData) {
  return args;
};
