goog.provide('apps.action.Action');

goog.require('apps.action.ActionInterface');
goog.require('apps.action.Property');
goog.require('apps.action.Topic');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.pubsub.PubSub');



/**
 * An action is a centralized place to store all information related to a UI
 * command.  Clients may subscribe to {@link apps.action.Topic}s of interest.
 * Actions use publish/subscribe to notification clients when the action fires or
 * changes.  Action-aware UI controls can update their appearance in response
 * to changes in the associated action such as the ENABLED or VISIBLE property.
 *
 * The source of the action can be anything -- buttons, toolbars, keyboard
 * shortcuts, or even text editing commands.  {@link apps.action.ControlBinder}
 * is provided for the common case of integrating with {@link goog.ui.Control}s.
 *
 * @param {string} id Unique action identifier.
 * @param {!Object=} opt_values Map of action property keys to their values.
 *     See {@link apps.action.Property} for standard properties.
 * @constructor
 * @extends {goog.Disposable}
 * @implements {apps.action.ActionInterface}
 */
apps.action.Action = function(id, opt_values) {
  goog.Disposable.call(this);

  /**
   * Action identifier.
   * @type {string}
   * @private
   */
  this.id_ = id;

  /**
   * Map holding reasons why the action is currently disabled.  Maps from the
   * reason string to 'true'.  When reasons are removed they should be deleted,
   * not set to 'false'.
   * @type {Object}
   * @private
   */
  this.disabledReasons_ = {};

  /**
   * Map of action property keys to their values.  Standard properties are
   * listed in the {@link apps.action.Property} enum.
   * @type {!Object}
   * @private
   */
  this.values_ = opt_values ? goog.object.clone(opt_values) : {};

  /**
   * Initial values that this was constructed with.
   * @private {!Object}
   */
  this.initialValues_ = goog.object.clone(this.values_);

  this.setInitialProperties_();

  /**
   * Pubsub channel used to call subscribers when the action fires or changes.
   * @type {!goog.pubsub.PubSub}
   * @private
   */
  this.pubsub_ = new goog.pubsub.PubSub();

  //  Decide whether inheritance is better than composition here...
};
goog.inherits(apps.action.Action, goog.Disposable);


/**
 * If an action is marked as disabled without a reason code, this one is used.
 * @type {string}
 */
apps.action.Action.DEFAULT_DISABLED_REASON = 'default';


/**
 * Global flag that can be used to temporarily suspend all actions.
 * @type {boolean}
 * @private
 */
apps.action.Action.suspendAll_ = false;


/**
 * Sets initial properties values after construction or being reset.
 * @private
 */
apps.action.Action.prototype.setInitialProperties_ = function() {
  //  Add this to constructor call sites instead of
  // having it be the default.
  if (!goog.isDef(this.values_[apps.action.Property.KEYS_ENABLED])) {
    // Default keyboard shortcuts enabled to true.
    this.values_[apps.action.Property.KEYS_ENABLED] = true;
  }

  if (!goog.isDef(this.values_[apps.action.Property.KEYS_VISIBLE])) {
    // Default keyboard shortcuts to be visible.
    this.values_[apps.action.Property.KEYS_VISIBLE] = true;
  }

  // Initialize the disabled reasons map
  if (!this.isEnabled()) {
    this.disabledReasons_[apps.action.Action.DEFAULT_DISABLED_REASON] = true;
  }
};


/** @override */
apps.action.Action.prototype.disposeInternal = function() {
  apps.action.Action.superClass_.disposeInternal.call(this);
  this.pubsub_.dispose();
  delete this.pubsub_;
  delete this.values_;
};


/** @override */
apps.action.Action.prototype.getId = function() {
  return this.id_;
};


/** @override */
apps.action.Action.prototype.isEnabled = function() {
  return !!this.getProperty(apps.action.Property.ENABLED);
};


/** @override */
apps.action.Action.prototype.setEnabled = function(enable, opt_reason) {
  var reason = opt_reason || apps.action.Action.DEFAULT_DISABLED_REASON;
  var willEnable = true;
  if (enable) {
    delete this.disabledReasons_[reason];
    // Find out if there are any remaining reasons why this action should be
    // disabled.
    for (var i in this.disabledReasons_) {
      willEnable = false;
      break;
    }
  } else {
    this.disabledReasons_[reason] = true;
    willEnable = false;
  }
  this.setProperty(apps.action.Property.ENABLED, willEnable);
};


/** @override */
apps.action.Action.prototype.areKeysEnabled = function() {
  return !!this.getProperty(apps.action.Property.KEYS_ENABLED);
};


/** @override */
apps.action.Action.prototype.setKeysEnabled = function(enable) {
  this.setProperty(apps.action.Property.KEYS_ENABLED, enable);
};


/** @override */
apps.action.Action.prototype.areKeysVisible = function() {
  return !!this.getProperty(apps.action.Property.KEYS_VISIBLE);
  // TODO(jcai):
  //return false;
};


/** @override */
apps.action.Action.prototype.setKeysVisible = function(visible) {
  this.setProperty(apps.action.Property.KEYS_VISIBLE, visible);
};


/** @override */
apps.action.Action.prototype.isVisible = function() {
  return !!this.getProperty(apps.action.Property.VISIBLE);
};


/** @override */
apps.action.Action.prototype.setVisible = function(visible) {
  this.setProperty(apps.action.Property.VISIBLE, visible);
};


/** @override */
apps.action.Action.prototype.isSelected = function() {
  return !!this.getProperty(apps.action.Property.SELECTED);
};


/** @override */
apps.action.Action.prototype.setSelected = function(select) {
  this.setProperty(apps.action.Property.SELECTED, select);
};


/** @override */
apps.action.Action.prototype.getSubscriptionCount = function(topic) {
  return this.pubsub_.getCount(topic);
};


/** @override */
apps.action.Action.prototype.clearSubscriptions = function(opt_topic) {
  return this.pubsub_.clear(opt_topic);
};


/** @override */
apps.action.Action.prototype.getHint = function() {
  return /** @type {string} */ (this.getProperty(apps.action.Property.HINT));
};


/** @override */
apps.action.Action.prototype.getLabel = function() {
  //  Discrepency in return type. The action's label is actually
  // of type {@type {string|!Node}. The action interface specifies that the
  // label property returns a string though. (b/9900703).
  return /** @type {string} */ (this.getProperty(apps.action.Property.LABEL));
};


/** @override */
apps.action.Action.prototype.getIcon = function() {
  return /** @type {string} */ (this.getProperty(apps.action.Property.ICON));
};


/** @override */
apps.action.Action.prototype.getKeys = function() {
  return /** @type {!Array.<string>|string} */ (
      this.getProperty(apps.action.Property.KEYS));
};


/** @override */
apps.action.Action.prototype.getValue = function() {
  return this.getProperty(apps.action.Property.VALUE);
};


/** @override */
apps.action.Action.prototype.setValue = function(value) {
  this.setProperty(apps.action.Property.VALUE, value);
};


/** @override */
apps.action.Action.prototype.getProperty = function(property) {
  return this.values_[property];
};


/** @override */
apps.action.Action.prototype.setProperty = function(property, newValue) {
  var oldValue = this.values_[property];
  // Use non-coercing equals so that the value can go from undefined to null.
  if (newValue !== oldValue) {
    this.values_[property] = newValue;
    this.pubsub_.publish(apps.action.Topic.CHANGE, property, newValue,
        oldValue);
    var topic = this.getPropertyTopic_(
        /** @type {apps.action.Property} */ (property));
    if (topic) {
      this.pubsub_.publish(topic, property, newValue, oldValue);
    }
  }
};


/** @override */
apps.action.Action.prototype.fireAction = function(
    opt_data, opt_diagnosticsData) {
  if (this.isEnabled() && !apps.action.Action.suspendAll_) {
    var selected = this.values_[apps.action.Property.SELECTED];
    if (goog.isDefAndNotNull(selected)) {
      this.setSelected(!selected);
    }
    this.pubsub_.publish(
        apps.action.Topic.ACTION, opt_data, opt_diagnosticsData);
  }

};


/** @override */
apps.action.Action.prototype.subscribe = function(topic, fn, opt_context) {
  return this.pubsub_.subscribe(topic, fn, opt_context);
};


/** @override */
apps.action.Action.prototype.unsubscribe = function(topic, fn, opt_context) {
  return this.pubsub_.unsubscribe(topic, fn, opt_context);
};


/** @override */
apps.action.Action.prototype.unsubscribeByKey = function(key) {
  return this.pubsub_.unsubscribeByKey(key);
};


/** @override */
apps.action.Action.prototype.reset = function(key) {
  this.pubsub_.clear();
  this.values_ = goog.object.clone(this.initialValues_);
  this.disabledReasons_ = {};
  this.setInitialProperties_();
};


/**
 * Enables or disables multiple actions by calling {@code setEnabled} on each
 * action.
 * @param {!Array.<!apps.action.Action>} actions Actions to enable or disable.
 * @param {boolean} enabled Whether the actions are to be enabled or disabled.
 * @param {string=} opt_reason Optionally, a reason code can be associated with
 *     a call to disable an action.  If an action is disabled for multiple
 *     reasons, it will not effectively be reenabled until it has been enabled
 *     for all of those same reasons.
 */
apps.action.Action.enableActions = function(actions, enabled, opt_reason) {
  goog.array.forEach(actions, function(action) {
    action.setEnabled(enabled, opt_reason);
  });
};


/**
 * Changes the value of a property on multiple actions.
 * @param {!Array.<!apps.action.Action>} actions Actions to change.
 * @param {string} property Name of the property to change.
 * @param {*} newValue New value of the property.
 */
apps.action.Action.updateActions = function(actions, property, newValue) {
  goog.array.forEach(actions, function(action) {
    action.setProperty(property, newValue);
  });
};


/**
 * @return {boolean} Whether all actions are suspended globally.
 */
apps.action.Action.areActionsSuspended = function() {
  return apps.action.Action.suspendAll_;
};


/**
 * Suspends or resumes the processing of all actions globally.
 * @param {boolean} suspend Whether to suspend or resume all actions globally.
 */
apps.action.Action.suspendActions = function(suspend) {
  apps.action.Action.suspendAll_ = !!suspend;
};


/**
 * Binds listeners such that selecting any of the actions will deselect all of
 * the other actions.
 * @param {!Array.<!apps.action.Action>} actions The actions to group.
 * @param {boolean=} opt_radio If set, deselecting all actions will be prevented
 *     (the RADIO property will be set to true).
 */
apps.action.Action.makeSelectableGroup = function(actions, opt_radio) {
  goog.array.forEach(actions, function(action) {
    if (opt_radio) {
      action.setProperty(apps.action.Property.RADIO, true);
    }
    action.subscribe(apps.action.Topic.CHANGE, function(property, newValue) {
      if (property == apps.action.Property.SELECTED && newValue) {
        goog.array.forEach(actions, function(otherAction) {
          if (otherAction != action) {
            otherAction.setSelected(false);
          }
        });
      }
    });
  });
};


/**
 * Returns the pubsub topic used when the given property is changed, or
 * undefined if no topic is associated with the property.
 * @param {apps.action.Property} property The property to locate the topic of.
 * @return {?apps.action.Topic} The topic used on changes
 *    to the property.
 * @private
 */
apps.action.Action.prototype.getPropertyTopic_ = function(property) {
  switch (property) {
    case apps.action.Property.ENABLED:
      return apps.action.Topic.ENABLED;
      break;
    case apps.action.Property.SELECTED:
      return apps.action.Topic.SELECTION;
      break;
    case apps.action.Property.VISIBLE:
      return apps.action.Topic.VISIBILITY;
      break;
    case apps.action.Property.VALUE:
      return apps.action.Topic.VALUE;
      break;
    default:
      // Other properties do not have individual pubsub topics.
      return null;
  }
};
