goog.provide('office.controller.ActionBinder');

goog.require('apps.action.Property');
goog.require('apps.action.SubscriptionManager');
goog.require('apps.action.Topic');
goog.require('office.controller.ApplicationConfig');
goog.require('office.controller.FocusState');
goog.require('goog.Disposable');
goog.require('goog.array');



/**
 * A class to bind actions to edits and handler functions. Binds the
 * action's @see apps.action.Property.ENABLED property using the action manager.
 * @param {!office.edits.EditApplier} editApplier An editor-specific function to
 *     apply an edit.
 * @param {!office.controller.StateToEditProviderRegistry}
 *     stateToEditProviderRegistry The state to edit provider registry.
 * @param {!office.controller.FocusManager} focusManager The focus manager.
 * @param {!office.controller.ActionManager} actionManager The action manager.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.controller.ActionBinder = function(
    editApplier, stateToEditProviderRegistry, focusManager, actionManager) {

  /**
   * The edit applier function.
   * @type {!office.edits.EditApplier}
   * @private
   */
  this.editApplier_ = editApplier;

  /**
   * The state to edit provider registry.
   * @type {!office.controller.StateToEditProviderRegistry}
   * @private
   */
  this.stateToEditProviderRegistry_ = stateToEditProviderRegistry;

  /**
   * The focus manager.
   * @type {!office.controller.FocusManager}
   * @private
   */
  this.focusManager_ = focusManager;

  /**
   * The action manager.
   * @type {!office.controller.ActionManager}
   * @private
   */
  this.actionManager_ = actionManager;

  /**
   * The subscription manager.
   * @type {!apps.action.SubscriptionManager}
   * @private
   */
  this.subscriptionManager_ = new apps.action.SubscriptionManager(this);
  this.registerDisposable(this.subscriptionManager_);

  /**
   * A map from parent action id to child action ids. Used to update the enabled
   * state of a parent action in response to a change in the child actions.
   * @type {!Object.<!Array.<string>>}
   * @private
   */
  this.childActionIds_ = {};

  /**
   * The index of the next state to generate. Will be incremented every time a
   * new state is generated for the state to edit provider registry.
   * @type {number}
   * @private
   */
  this.nextStateIndex_ = 0;
};
goog.inherits(office.controller.ActionBinder, goog.Disposable);


/**
 * @return {!office.controller.ActionManager} The action manager.
 * @protected
 */
office.controller.ActionBinder.prototype.getActionManager = function() {
  return this.actionManager_;
};


/**
 * @return {!apps.action.SubscriptionManager} The subscription manager.
 * @protected
 */
office.controller.ActionBinder.prototype.getSubscriptionManager = function() {
  return this.subscriptionManager_;
};


/**
 * Binds the actions in the given binding to the function in the binding.
 * @param {!office.controller.FunctionActionBinding} functionActionBinding The
 *     function action binding.
 * @return {!office.controller.ActionBinder} This, for chaining.
 */
office.controller.ActionBinder.prototype.bindFunction = function(
    functionActionBinding) {
  var states = functionActionBinding.getStates();
  var config = new office.controller.ApplicationConfig(states);

  var actionIds = functionActionBinding.getActionIds();
  var focus = functionActionBinding.getFocus();

  for (var i = 0; i < actionIds.length; i++) {
    var actionId = actionIds[i];
    var action = this.actionManager_.getActionOrThrow(actionId);
    this.actionManager_.bindActionEnabledState(action, config);
    var boundHandler = goog.bind(this.handleAction, this, focus,
        functionActionBinding.getTransformFn(actionId),
        functionActionBinding.getHandlerFn());
    this.subscriptionManager_.subscribe(action, apps.action.Topic.ACTION,
        boundHandler);
  }
  return this;
};


/**
 * Binds the actions in the given binding to the edit in the binding.
 * @param {!office.controller.EditActionBinding} editActionBinding The edit action
 *     binding.
 * @return {!office.controller.ActionBinder} This, for chaining.
 */
office.controller.ActionBinder.prototype.bindEdit = function(editActionBinding) {
  var states = editActionBinding.getStates();
  var actionIds = editActionBinding.getActionIds();
  var focus = editActionBinding.getFocus();
  var provider = editActionBinding.getEditProvider();

  var editState = this.createStateForEditProvider(provider);
  var config = new office.controller.ApplicationConfig(
      goog.array.concat(states, editState));

  for (var i = 0; i < actionIds.length; i++) {
    var actionId = actionIds[i];
    var action = this.actionManager_.getActionOrThrow(actionId);
    this.actionManager_.bindActionEnabledState(action, config);
    var boundHandler = goog.bind(
        this.handleAction, this, focus,
        editActionBinding.getTransformFn(actionId),
        goog.bind(this.editApplier_.apply, this.editApplier_, provider));
    this.subscriptionManager_.subscribe(action, apps.action.Topic.ACTION,
        boundHandler);
  }
  return this;
};


/**
 * Creates a state and binds its state to the specified edit provider. Useful
 * when an action applies an edit, but cannot be bound directly to the edit
 * provider (e.g. to allow for side-effects).
 * @param {!office.edits.EditProvider} editProvider The edit provider to create a
 *     state for.
 * @return {string}
 */
office.controller.ActionBinder.prototype.createStateForEditProvider = function(
    editProvider) {
  var editState = this.getNextEditState_();
  this.stateToEditProviderRegistry_.
      registerEditProvider(editState, editProvider);
  return editState;
};


/**
 * Binds the enabled state of the specified parent action to the specified child
 * actions. The parent action will be enabled when one or more child actions are
 * enabled.
 * @param {string} parentActionId The parent action id.
 * @param {!Array.<string>} childActionIds The child action ids.
 */
office.controller.ActionBinder.prototype.makeParentAction = function(
    parentActionId, childActionIds) {
  if (this.childActionIds_[parentActionId]) {
    throw Error('Child actions already bound for: ' + parentActionId);
  }
  if (this.actionManager_.isActionPropertyBound(
      parentActionId, apps.action.Property.ENABLED)) {
    throw Error('Parent action has already been bound: ' + parentActionId);
  }
  this.childActionIds_[parentActionId] = childActionIds.concat();
  for (var i = 0; i < childActionIds.length; i++) {
    this.subscriptionManager_.subscribe(
        this.actionManager_.getActionOrThrow(childActionIds[i]),
        apps.action.Topic.ENABLED,
        goog.bind(this.updateParentAction_, this, parentActionId));
  }
  this.updateParentAction_(parentActionId);
};


/**
 * Generates the next unique state to be used by the state to edit provider
 * registry.
 * @return {string} The next state.
 * @private
 */
office.controller.ActionBinder.prototype.getNextEditState_ = function() {
  this.nextStateIndex_++;
  return 'edit-state-' + this.nextStateIndex_;
};


/**
 * Calls the given handler function with the transformed action data and sets
 * the focus on the editor if necessary.
 * @param {boolean} focus Whether to focus on the editor.
 * @param {function(*): !Object} transformFn The function to transform action
 *     data into handler arguments.
 * @param {!Function} handlerFn The handler function for actions in this
 *     binding.
 * @param {*=} opt_data Optional data associated with the action.
 * @protected
 */
office.controller.ActionBinder.prototype.handleAction = function(
    focus, transformFn, handlerFn, opt_data) {
  var args = transformFn(opt_data);
  handlerFn(args);
  if (focus) {
    this.focusManager_.setState(office.controller.FocusState.EDITOR);
  }
};


/**
 * Updates the enabled state of the specified parent action in response to a
 * change in child action enabled state.
 * @param {string} parentActionId The parent action id.
 * @private
 */
office.controller.ActionBinder.prototype.updateParentAction_ = function(
    parentActionId) {
  var childActionIds = this.childActionIds_[parentActionId];
  if (!childActionIds) {
    throw Error('No child actions bound for parent action: ' + parentActionId);
  }
  var enabled = false;
  for (var i = 0; i < childActionIds.length; i++) {
    if (this.actionManager_.getActionOrThrow(childActionIds[i]).isEnabled()) {
      enabled = true;
    }
  }
  this.actionManager_.getActionOrThrow(parentActionId).setEnabled(enabled);
};
