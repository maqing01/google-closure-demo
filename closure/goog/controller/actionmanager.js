goog.provide('office.controller.ActionManager');

goog.require('apps.action.Property');
goog.require('office.controller.MutableApplicationState');
goog.require('office.controller.ServiceId');
goog.require('office.controller.StateTriggerEventType');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');
goog.require('goog.object');



/**
 * @param {!office.controller.ActionRegistryImpl} actionRegistry The action
 *     registry.
 * @param {!Array.<!office.controller.StateTrigger>} triggers The state triggers.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 * @const
 */
office.controller.ActionManager = function(actionRegistry, triggers) {
  goog.base(this);

  /**
   * @type {!office.controller.ActionRegistryImpl}
   * @private
   */
  this.actionRegistry_ = actionRegistry;

  /**
   * @type {!Array.<!office.controller.StateTrigger>}
   * @private
   */
  this.triggers_ = triggers;

  /**
   * The map of registered action ids to action properties to their respective
   * configs.
   * @type {!Object.<!Object.<!office.controller.ApplicationConfig>>}
   * @private
   */
  this.actionToPropertyToConfigMap_ = {};

  /**
   * @type {!Object.<!Object.<!Array.<!apps.action.Action>>>}
   * @private
   */
  this.stateToPropertyToActionsMap_ = {};

  /**
   * @type {!office.controller.MutableApplicationState}
   * @private
   */
  this.applicationState_ = new office.controller.MutableApplicationState();

  /**
   * @type {!goog.events.EventHandler.<!office.controller.ActionManager>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  // Update the application state with the states provided by each trigger.
  for (var i = 0; i < this.triggers_.length; i++) {
    this.updateStatesForTrigger_(this.triggers_[i]);
  }
};
goog.inherits(office.controller.ActionManager, goog.Disposable);


/**
 * @return {!office.controller.ActionRegistryImpl} The action registry.
 */
office.controller.ActionManager.prototype.getActionRegistry = function() {
  return this.actionRegistry_;
};


/**
 * Binds the given action's property with the specified config and sets the
 * property value to true if the config is enabled. Throws an error if the
 * action is null or the config depends on a state which has not been provided
 * by any trigger.
 * @param {!apps.action.Action} action The action to be bound.
 * @param {!office.controller.ApplicationConfig} config The config that specifies
 *     when the action should be enabled.
 * @param {string} property The property to bind to the config.
 * @private
 */
office.controller.ActionManager.prototype.bindActionProperty_ = function(
    action, config, property) {
  var actionId = action.getId();
  if (this.isActionPropertyBound(actionId, property)) {
    throw Error(
        'Attempted to bind an action property pair that is already bound: ' +
            actionId + '-' + property);
  }

  if (!this.actionRegistry_.getAction(actionId)) {
    throw Error(
        'Attempted to bind a non-registered action with id ' + actionId);
  }

  goog.object.setIfUndefined(this.actionToPropertyToConfigMap_, actionId, {});
  this.actionToPropertyToConfigMap_[actionId][property] = config;

  var states = config.getStates();
  for (var i = 0; i < states.length; i++) {
    var state = states[i];
    if (!this.applicationState_.hasState(state)) {
      throw Error('State ' + state + ' required by action property pair ' +
          actionId + '-' + property + ' but not provided by any trigger.');
    }
    goog.object.setIfUndefined(this.stateToPropertyToActionsMap_, state, {});
    goog.object.setIfUndefined(
        this.stateToPropertyToActionsMap_[state], property, []);
    this.stateToPropertyToActionsMap_[state][property].push(action);
  }
  this.updateAction_(
      action, property, config.isEnabled(this.applicationState_));
};


/**
 * Binds the given action's @see apps.action.Property.ENABLED property with the
 * specified config and enables it if the config is enabled. Throws an error if
 * the action is null or the config depends on a state which has not been
 * provided by any trigger,
 * @param {!apps.action.Action} action The action to be bound.
 * @param {!office.controller.ApplicationConfig} config The config that specifies
 *     when the action should be enabled.
 * @return {!office.controller.ActionManager} This, for chaining.
 */
office.controller.ActionManager.prototype.bindActionEnabledState = function(
    action, config) {
  this.bindActionProperty_(action, config, apps.action.Property.ENABLED);
  return this;
};


/**
 * Binds the given action's @see apps.action.Property.VISIBLE property with the
 * specified config and sets it if the config is enabled. Throws an error if
 * the action is null or the config depends on a state which has not been
 * provided by any trigger,
 * @param {!apps.action.Action} action The action to be bound.
 * @param {!office.controller.ApplicationConfig} config The config that specifies
 *     when the action should be enabled.
 * @return {!office.controller.ActionManager} This, for chaining.
 */
office.controller.ActionManager.prototype.bindActionVisibleState = function(
    action, config) {
  this.bindActionProperty_(action, config, apps.action.Property.VISIBLE);
  return this;
};


/**
 * @param {!apps.action.Action} action The action to get a config for.
 * @param {string} property The action property to get a config for.
 * @return {!office.controller.ApplicationConfig} The application config bound for
 *     the specified property of the specified action.
 * @throws {Error} If the specified action has not been bound.
 */
office.controller.ActionManager.prototype.getApplicationConfigForProperty =
    function(action, property) {
  var actionId = action.getId();
  if (!this.isActionPropertyBound(actionId, property)) {
    throw Error('Tried to get config for unbound action property pair: ' +
        actionId + '-' + property);
  }
  return this.actionToPropertyToConfigMap_[actionId][property];
};


/**
 * @param {string} actionId The id of the action to check.
 * @param {string} property The action property to check.
 * @return {boolean} Whether the action has been bound to a config.
 */
office.controller.ActionManager.prototype.isActionPropertyBound = function(
    actionId, property) {
  return !!this.actionToPropertyToConfigMap_[actionId] &&
      !!this.actionToPropertyToConfigMap_[actionId][property];
};


/**
 * Updates the application state with the states provided by the given trigger,
 * and ensures that no state is provided by multiple triggers. Throws an error
 * if a state is provided by multiple triggers.
 * @param {!office.controller.StateTrigger} trigger The state trigger.
 * @private
 */
office.controller.ActionManager.prototype.updateStatesForTrigger_ = function(
    trigger) {
  this.eventHandler_.listen(
      trigger, office.controller.StateTriggerEventType.STATE_CHANGE,
      this.handleStateChange_);

  var stateToValueMap = trigger.getStates();
  for (var state in stateToValueMap) {
    if (this.applicationState_.hasState(state)) {
      throw Error(
          'State ' + state + ' should not be provided by multiple triggers.');
    }
    this.applicationState_.setState(state, stateToValueMap[state]);
  }
};


/**
 * @param {!office.controller.StateTrigger} trigger The state trigger.
 * @return {!office.controller.ActionManager} This, for chaining.
 */
office.controller.ActionManager.prototype.addTrigger = function(trigger) {
  this.triggers_.push(trigger);
  this.updateStatesForTrigger_(trigger);
  return this;
};


/**
 * Gets the action with the given identifier (null if none).
 * @param {string} actionId Action identifier.
 * @return {apps.action.Action} The action (null if none).
 */
office.controller.ActionManager.prototype.getAction = function(actionId) {
  return this.actionRegistry_.getAction(actionId);
};


/**
 * @param {string} actionId Action identifier.
 * @return {!apps.action.Action} The action.
 * @throws {Error} If the id is not registered.
 */
office.controller.ActionManager.prototype.getActionOrThrow = function(actionId) {
  return this.actionRegistry_.getActionOrThrow(actionId);
};


/**
 * Handles a StateChangeEvent dispatched by a state trigger by updating the
 * enabled state of any action that depends on a state that has changed.
 * @param {!office.controller.StateChangeEvent} e The state change event.
 * @private
 */
office.controller.ActionManager.prototype.handleStateChange_ = function(e) {
  var actionsToUpdate = {};
  for (var state in e.statesMap) {
    this.applicationState_.setState(state, e.statesMap[state]);

    // Property to actions map affected by the state change.
    var propertyToActionsMap = this.stateToPropertyToActionsMap_[state];

    // For each property, add the affected action ids to the actionsToUpdate
    // map for that property. Using a map ensures that we don't set the same
    // property on any action more than once.
    for (var property in propertyToActionsMap) {
      goog.object.setIfUndefined(actionsToUpdate, property, {});
      var actions = propertyToActionsMap[property];
      for (var i = 0; i < actions.length; i++) {
        actionsToUpdate[property][actions[i].getId()] = true;
      }
    }
  }

  // actionsToUpdate is now a de-duped map of property to list of actions.
  // Iterate through the map and update as necessary.
  for (var property in actionsToUpdate) {
    for (var actionId in actionsToUpdate[property]) {
      var action = this.getActionOrThrow(actionId);
      var enabled = this.getApplicationConfigForProperty(action, property).
          isEnabled(this.applicationState_);
      this.updateAction_(action, property, enabled);
    }
  }
};


/**
 * Helper method to enable/disable action properties.
 * @param {!apps.action.Action} action
 * @param {string} property The property to update.
 * @param {boolean} enabled Whether to set the property as enabled.
 * @private
 */
office.controller.ActionManager.prototype.updateAction_ = function(
    action, property, enabled) {
  if (property == apps.action.Property.ENABLED) {
    // Some actions are still enabled/disabled with "reasons".
    // Action#setEnabled(true) does not do the same thing as
    // Action#setProperty('enabled', true). setEnabled checks
    // disabledReason whereas setProperty does not. We emulate previous
    // behavior so as to not break other components.
    //  Remove this method once all actions have been updated
    // to use the action manager.
    action.setEnabled(enabled);
  } else {
    action.setProperty(property, enabled);
  }
};


/** @override */
office.controller.ActionManager.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);

  goog.base(this, 'disposeInternal');
};


/**
 * @param {!fava.AppContext} appContext The app context.
 * @param {!office.controller.ActionRegistryImpl} actionRegistry The action
 *     registry.
 * @param {!Array.<!office.controller.StateTrigger>} triggers The state triggers.
 * @return {!office.controller.ActionManager} The action manager.
 */
office.controller.ActionManager.register = function(
    appContext, actionRegistry, triggers) {
  var manager = new office.controller.ActionManager(actionRegistry, triggers);
  appContext.registerService(office.controller.ServiceId.ACTION_MANAGER,
      manager);
  return manager;
};


/**
 * @param {!fava.AppContext} appContext The app context.
 * @return {!office.controller.ActionManager} The action manager.
 */
office.controller.ActionManager.get = function(appContext) {
  return /** @type {!office.controller.ActionManager} */ (appContext.get(
      office.controller.ServiceId.ACTION_MANAGER));
};
