goog.provide('office.controller.ActionRegistryImpl');

goog.require('apps.action.Action');
goog.require('apps.action.Property');
goog.require('office.action');
goog.require('office.action.Property');
goog.require('office.controller.ActionRegisteredEvent');
goog.require('office.controller.ActionRegistry');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('goog.string');



/**
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 * @implements {office.controller.ActionRegistry}
 */
office.controller.ActionRegistryImpl = function() {
  goog.base(this);

  /**
   * Map of action identifiers to action instances.
   * @type {!Object.<!apps.action.Action>}
   * @private
   */
  this.actions_ = {};

  /**
   * @type {boolean}
   * @private
   */
  this.isRtlLocale_ = false;

  /**
   * Map of action group ID to the group's list of action Ids.
   * @type {!Object.<!Array.<string>>}
   * @private
   */
  this.actionGroups_ = {};

  if (!office.action.isRegistered()) {
    office.action.registerActions(false);
  }

  /**
   * Map of action ID to an action. We keep all the singleton actions used
   * by the application in this map.
   * @type {!Object.<!apps.action.Action>}
   * @private
   */
  this.existingActions_ = {};
};
goog.inherits(office.controller.ActionRegistryImpl, goog.events.EventTarget);


/**
 * The impression system.
 * @type {office.diagnostics.impressions.ImpressionSystem}
 * @private
 */
office.controller.ActionRegistryImpl.prototype.impressionSystem_ = null;


/** @override */
office.controller.ActionRegistryImpl.prototype.makeSelectableGroup = function(
    groupId) {
  var group = this.actionGroups_[groupId];
  var groupActions = [];
  if (group != null) {
    for (var i = 0; i < group.length; i++) {
      var actionId = group[i];
      var action = this.actions_[actionId];
      groupActions.push(action);
      action.setSelected(false);
    }
  }
  apps.action.Action.makeSelectableGroup(groupActions, true);
};


/** @override */
office.controller.ActionRegistryImpl.prototype.registerAction = function(
    id, label, opt_impressionCode, opt_hint, opt_icon, opt_keys, opt_value,
    opt_disabled, opt_groupId, opt_requireDirectTarget, opt_rtlIcon,
    opt_actionDataExtractor, opt_longLabel, opt_synonyms) {
  var values = {};
  values[apps.action.Property.ENABLED] = !opt_disabled;
  values[apps.action.Property.HINT] = opt_hint;
  if (opt_icon) {
    var baseCss = office.action.getCommonCssClassForIcons();
    //values[apps.action.Property.ICON] = baseCss + ' ' + opt_icon +
    //    (opt_rtlIcon && this.isRtlLocale_ ? '-rtl' : '');
    values[apps.action.Property.ICON] = baseCss + ' ' + opt_icon;
  }
  values[apps.action.Property.KEYS] = opt_keys;
  values[apps.action.Property.LABEL] = label;
  values[apps.action.Property.VALUE] = opt_value;
  values[apps.action.Property.VISIBLE] = true;
  values[apps.action.Property.REQUIRE_DIRECT_TARGET] =
      !!opt_requireDirectTarget;
  values[office.action.Property.ACTION_DATA_EXTRACTOR] = opt_actionDataExtractor;
  values[office.action.Property.LONG_LABEL] = opt_longLabel;
  values[office.action.Property.SYNONYMS] = opt_synonyms;
  if (opt_synonyms) {
    office.action.assertSynonymsFormat(id, opt_synonyms);
  }
  if (goog.isDefAndNotNull(opt_impressionCode)) {
    values[office.action.Property.IMPRESSION_CODE] = opt_impressionCode;
  }
  var action = this.actions_[id] = new apps.action.Action(id, values);
  if (opt_groupId) {
    if (!this.actionGroups_[opt_groupId]) {
      this.actionGroups_[opt_groupId] = [];
    }
    this.actionGroups_[opt_groupId].push(id);
  }

  this.dispatchEvent(new office.controller.ActionRegisteredEvent(action));
  return action;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getAction = function(id) {
  return this.actions_[id] || this.existingActions_[id] || null;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getActionOrThrow = function(id) {
  var action = this.getAction(id);
  if (!action) {
    throw Error('Action not registered for id ' + id);
  }
  return action;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getActions = function(ids) {
  var actions = [];
  for (var i = 0; i < ids.length; i++) {
    actions.push(this.getActionOrThrow(ids[i]));
  }
  return actions;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.registerExistingAction = function(
    action) {
  if (!this.existingActions_[action.getId()]) {
    this.existingActions_[action.getId()] = action;
    this.dispatchEvent(new office.controller.ActionRegisteredEvent(action));
  }
  this.actions_[action.getId()] = action;
};


/**
 * @param {string} groupId The action group id.
 * @param {*} value The value for the action to find.
 * @return {apps.action.Action} The action (null, if none).
 * @private
 */
office.controller.ActionRegistryImpl.prototype.getActionFromGroupAndValue_ =
    function(groupId, value) {
  if (!this.actionGroups_[groupId]) {
    return null;
  }
  var group = this.actionGroups_[groupId];
  if (group != null) {
    for (var i = 0; i < group.length; i++) {
      var actionId = group[i];
      var action = this.getAction(actionId);
      if (action != null && action.getValue() == value) {
        return action;
      }
    }
  }
  return null;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getActionIds = function() {
  return goog.object.getKeys(this.actions_);
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getExistingActionIds = function() {
  return goog.object.getKeys(this.existingActions_);
};


/** @override */
office.controller.ActionRegistryImpl.prototype.getActionGroups = function() {
  return this.actionGroups_;
};


/** @override */
office.controller.ActionRegistryImpl.prototype.selectGroupAction = function(group,
    selectValue) {
  var action = this.getActionFromGroupAndValue_(group, selectValue);
  if (action) {
    action.setSelected(true);
  } else if (this.actionGroups_[group] != null) {
    for (var i = 0; i < this.actionGroups_[group].length; i++) {
      var actionId = this.actionGroups_[group][i];
      var curAction = this.getAction(actionId);
      curAction.setSelected(false);
    }
  }
};


/** @override */
office.controller.ActionRegistryImpl.prototype.setActionIconDirection = function(
    id, isLtr) {
  //var action = this.getAction(id);
  //if (action) {
  //  var icon = /** @type {string} */ (
  //      action.getProperty(apps.action.Property.ICON));
  //  var wasLtr = !goog.string.endsWith(icon, '-rtl');
  //  if (isLtr && !wasLtr) {
  //    action.setProperty(apps.action.Property.ICON, icon.substring(0,
  //        icon.length - 4));
  //  } else if (!isLtr && wasLtr) {
  //    action.setProperty(apps.action.Property.ICON, icon + '-rtl');
  //  }
  //}
};


/** @override */
office.controller.ActionRegistryImpl.prototype.setImpressionSystem = function(
    impressionSystem) {
  if (this.impressionSystem_) {
    throw Error('Impression system has already been set.');
  }
  this.impressionSystem_ = impressionSystem;
  this.impressionSystem_.addActions(goog.object.getValues(this.actions_));
};


/**
 * Adds the given action to the impression system, if there is one.
 * @param {!apps.action.Action} action The action.
 * @private
 */
office.controller.ActionRegistryImpl.prototype.addActionToImpressionSystem_ =
    function(action) {
  //if (this.impressionSystem_) {
  //  this.impressionSystem_.addAction(action);
  //}
};


/** @override */
office.controller.ActionRegistryImpl.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  for (var key in this.actions_) {
    // Don't dispose of it if it's been registered as an existing action.
    if (!(key in this.existingActions_)) {
      goog.dispose(this.actions_[key]);
    }
  }
};
