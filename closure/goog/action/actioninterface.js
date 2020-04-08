

/**
 * @fileoverview The interface for an Action loosely based on
 * {@code javax.swing.Action}.
 *



 */

goog.provide('apps.action.ActionInterface');

goog.require('apps.action.Topic');



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
 *  At some point, this interface should be renamed to Action, and
 * the current Action class called something like DefaultAction.
 *
 * @interface
 */
apps.action.ActionInterface = function() {};


/**
 * @return {string} This action's identifier.
 */
apps.action.ActionInterface.prototype.getId = goog.abstractMethod;


/**
 * @return {boolean} Whether the action is enabled.
 */
apps.action.ActionInterface.prototype.isEnabled = goog.abstractMethod;


/**
 * Enables or disables this action.  If the new enabled state is different,
 * calls subscribers to the {@link apps.action.Topic.CHANGE} topic.
 * @param {boolean} enable Whether to enable the action.
 * @param {string=} opt_reason Optionally, a reason code can be associated with
 *     a call to disable an action.  If an action is disabled for multiple
 *     reasons, it will not effectively be reenabled until it has been enabled
 *     for all of those same reasons.
 */
apps.action.ActionInterface.prototype.setEnabled = goog.abstractMethod;


/**
 * @return {boolean} Whether the action is visible.
 */
apps.action.ActionInterface.prototype.isVisible = goog.abstractMethod;


/**
 * Shows or hides this action.  If the new visible state is different,
 * calls subscribers to the {@link apps.action.Topic.CHANGE} topic.
 * @param {boolean} visible Whether to show the action.
 */
apps.action.ActionInterface.prototype.setVisible = goog.abstractMethod;


/**
 * @return {boolean} Whether the action is selected. Non-selectable actions
 *     are considered unselected.
 */
apps.action.ActionInterface.prototype.isSelected = goog.abstractMethod;


/**
 * Selects or deselects this action. If the new selected state is different,
 * calls subscribers to the {@link apps.action.Topic.CHANGE} topic.
 * @param {boolean} select Whether to select the action.
 */
apps.action.ActionInterface.prototype.setSelected = goog.abstractMethod;


/**
 * @return {string} The hint property value.
 */
apps.action.ActionInterface.prototype.getHint = goog.abstractMethod;


/**
 *  Update return type of this method to be {string|node}.
 * (b/9900703).
 * @return {string} The label property value.
 */
apps.action.ActionInterface.prototype.getLabel = goog.abstractMethod;


/**
 * @return {string} The icon property value.
 */
apps.action.ActionInterface.prototype.getIcon = goog.abstractMethod;


/**
 * @return {!Array.<string>|string} The serialized keyboard shortcut or
 *     shortcuts.
 */
apps.action.ActionInterface.prototype.getKeys = goog.abstractMethod;


/**
 * @return {*} The current action value.
 */
apps.action.ActionInterface.prototype.getValue = goog.abstractMethod;


/**
 * Sets the value for this action.  If the new value is different,
 * calls subscribers to the {@link apps.action.Topic.CHANGE} topic.
 * @param {*} value The new action value.
 */
apps.action.ActionInterface.prototype.setValue = goog.abstractMethod;


/**
 * Returns the number of subscriptions to the given topic.
 * @param {string} topic The topic.
 * @return {number} Number of subscriptions to the topic.
 */
apps.action.ActionInterface.prototype.getSubscriptionCount =
    goog.abstractMethod;


/**
 * Clears the subscription list for a topic, or all topics if unspecified.
 * @param {string=} opt_topic Topic to clear (all topics if unspecified).
 */
apps.action.ActionInterface.prototype.clearSubscriptions = goog.abstractMethod;


/**
 * Returns the value of the named property.
 * @param {string} property Name of the property to query.
 * @return {*} Property value (undefined if unset).
 */
apps.action.ActionInterface.prototype.getProperty = goog.abstractMethod;


/**
 * Sets the value of the named property. If the new value is different, calls
 * subscribers to the topic related to this property (if exists) and to the
 * {@code apps.action.Topic.CHANGE} topic. The callback is passed the property
 * name, the new value, and the old value as arguments.
 * @param {string} property Name of the property to change.
 * @param {*} newValue New value of the property.
 */
apps.action.ActionInterface.prototype.setProperty = goog.abstractMethod;


/**
 * Fires the action.  Calls subscribers to the {@link apps.action.Topic.ACTION}
 * topic with the given optional data as the argument.  Does nothing if the
 * action is disabled or if actions are globally suspended.
 * @param {*} opt_data Optional data associated with the action.
 * @param {!Object=} opt_diagnosticsData Optional data for diagnostics use.
 */
apps.action.ActionInterface.prototype.fireAction = goog.abstractMethod;


/**
 * Subscribes a function to a topic.  The function is invoked as a method on
 * the given {@code opt_context} object, or in the global scope if no context
 * is specified.  See {@link apps.action.Topic} for supported topics.  Returns
 * a subscription key that can be used to unsubscribe the function from the
 * topic via {@link #unsubscribeByKey}.
 * @param {apps.action.Topic} topic Topic to subscribe to.
 * @param {!Function} fn Function to be called when a message is published to
 *     the given topic.
 * @param {!Object=} opt_context Object in whose context the function is to be
 *     called (the global scope if none).
 * @return {number} Subscription key.
 */
apps.action.ActionInterface.prototype.subscribe = goog.abstractMethod;


/**
 * Unsubscribes a function from a topic.  Only deletes the first match found.
 * Returns a Boolean indicating whether a subscriber was removed.
 * @param {apps.action.Topic} topic Topic to unsubscribe from.
 * @param {!Function} fn Function to unsubscribe.
 * @param {!Object=} opt_context Object in whose context the function was to be
 *     called (the global scope if none).
 * @return {boolean} Whether a matching subscriber was removed.
 */
apps.action.ActionInterface.prototype.unsubscribe = goog.abstractMethod;


/**
 * Removes a subscription based on the key returned by {@link #subscribe}.
 * No-op if no matching subscription is found.  Returns a Boolean indicating
 * whether a subscription was removed.
 * @param {number} key Subscription key.
 * @return {boolean} Whether a matching subscription was removed.
 */
apps.action.ActionInterface.prototype.unsubscribeByKey = goog.abstractMethod;


/**
 * @return {boolean} Whether the action's keyboard shortcuts are enabled.
 */
apps.action.ActionInterface.prototype.areKeysEnabled = goog.abstractMethod;


/**
 * @param {boolean} enable Whether to enable the action's keyboard shortcuts
 *     (On by default).
 */
apps.action.ActionInterface.prototype.setKeysEnabled = goog.abstractMethod;


/**
 * @return {boolean} Whether the action's keyboard shortcuts are visible.
 */
apps.action.ActionInterface.prototype.areKeysVisible = goog.abstractMethod;


/**
 * @param {boolean} enable Whether to make the action's keyboard shortcuts
 *     visible (true by default).
 */
apps.action.ActionInterface.prototype.setKeysVisible = goog.abstractMethod;


/**
 * Resets the state of the action to the original values.
 */
apps.action.ActionInterface.prototype.reset = goog.abstractMethod;
