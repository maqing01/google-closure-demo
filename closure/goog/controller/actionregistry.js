goog.provide('office.controller.ActionRegistry');

goog.require('goog.events.Listenable');



/**
 * @interface
 * @extends {goog.events.Listenable}
 */
office.controller.ActionRegistry = function() {};


/**
 * Registers an action with the given unique identifier and values.
 * Actions are enabled and visible by default. The visual properties of a menu
 * or submenu can also be specified by an action which simply doesn't fire.
 * @param {string} id Unique action identifier.
 * @param {string} label Text label.
 * @param {office.diagnostics.impressions.proto.ImpressionCode=}
 *     opt_impressionCode The impression code to record for the action.
 * @param {string=} opt_hint Hint text, typically shown on hover.
 * @param {string=} opt_icon Icon class name suffix. For example,
 *     'strikethrough' for 'office-icon-accessible-img office-icon-strikethrough'.
 *     If the icon begins with 'office-icon-', then 'office-icon-align-left'
 *     would be turned into 'office-icon-img office-icon-align-left'.
 * @param {string|!Array.<string>=} opt_keys Keyboard shortcut(s).
 * @param {*=} opt_value Initial value associated with the action.
 * @param {boolean=} opt_disabled Whether this action is disabled.
 * @param {string=} opt_groupId Unique action group identifier.
 * @param {boolean=} opt_requireDirectTarget Whether to require that this
 *     action be directly invoked by its bound controls, rather than invoked
 *     when a child control is invoked. When false, which is default, this
 *     lets submenu child items fire both their own bound action and their
 *     parent menu item's bound action, which isn't always appropriate.
 * @param {boolean=} opt_rtlIcon Whether there is an RTL icon.
 * @param {office.action.ActionDataExtractor=} opt_actionDataExtractor A function
 *     that knows how to transform opt_data passed to Action#fireAction for
 *     this action into ActionData.
 * @param {string=} opt_longLabel Optional long label for the action.
 * @param {string=} opt_synonyms Optional synonyms for the action.
 * @return {!apps.action.Action} The action that was registered.
 */
office.controller.ActionRegistry.prototype.registerAction = goog.abstractMethod;


/**
 * Initializes a selectable group. A selectable group is a logical grouping of
 * actions where only a single action can be selected at a time (i.e. selecting
 * an action has the side-effect of unselecting all the other actions in that
 * group).
 * NOTE: This should be called only after all the action in the selectable group
 * have been registered.
 * @param {string} groupId The group id.
 */
office.controller.ActionRegistry.prototype.makeSelectableGroup =
    goog.abstractMethod;


/**
 * Gets the action with the given identifier (null if none).
 * @param {string} id Action identifier.
 * @return {apps.action.Action} The action (null if none).
 */
office.controller.ActionRegistry.prototype.getAction = goog.abstractMethod;


/**
 * Gets the action with the given identifier or throws if not present.
 * @param {string} id Action identifier.
 * @return {!apps.action.Action} The action.
 * @throws {Error} If an id is not registered.
 */
office.controller.ActionRegistry.prototype.getActionOrThrow = goog.abstractMethod;


/**
 * Gets the actions with the given identifiers.
 * @param {!Array.<string>} ids Action identifier.
 * @return {!Array.<!apps.action.Action>} The actions.
 * @throws {Error} If any id is not registered.
 */
office.controller.ActionRegistry.prototype.getActions = goog.abstractMethod;


/**
 * Gets all action ids registered with this action manager.
 * @return {!Array.<string>} The action ids.
 */
office.controller.ActionRegistry.prototype.getActionIds = goog.abstractMethod;


/**
 * Registers an existing action.
 * @param {!apps.action.Action} action The action to register.
 */
office.controller.ActionRegistry.prototype.registerExistingAction =
    goog.abstractMethod;


/**
 * Gets all the existing global action ids registered by the application.
 * @return {!Array.<string>} The action ids.
 */
office.controller.ActionRegistry.prototype.getExistingActionIds =
    goog.abstractMethod;


/**
 * Gets the map of action group ID to groups of action values and Ids.
 * @return {!Object.<!Object.<string>>} the map of action group ID to groups.
 */
office.controller.ActionRegistry.prototype.getActionGroups = goog.abstractMethod;


/**
 * Selects the action from the given group based on the value. If no action is
 * registered with the given value, then all the actions in the group are
 * deselected.
 * @param {string} group The group whose selection will be
 *     set.
 * @param {*} selectValue The requested value to be selected in the group.
 */
office.controller.ActionRegistry.prototype.selectGroupAction =
    goog.abstractMethod;


/**
 * Changes the action icon to the appropriate directionality by appending or
 * removing the -rtl suffix of the icon CSS class name.
 * @param {string} id The id of the action.
 * @param {boolean} isLtr Whether the directionality should be left to right.
 */
office.controller.ActionRegistry.prototype.setActionIconDirection =
    goog.abstractMethod;


/**
 * Sets the impression system and adds all registered actions to it.
 * @param {office.diagnostics.impressions.ImpressionSystem} impressionSystem The
 *     impression system.
 */
office.controller.ActionRegistry.prototype.setImpressionSystem =
    goog.abstractMethod;
