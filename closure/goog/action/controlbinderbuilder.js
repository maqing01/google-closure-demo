goog.provide('office.action.ControlBinderBuilder');

goog.require('apps.action.ControlBinder');
goog.require('apps.action.Property');
goog.require('office.diagnostics.impressions.FireActionDelegate');



/**
 * @constructor
 * @struct
 */
office.action.ControlBinderBuilder = function() {
  /**
   * Map of action property names to custom property updater functions.
   * @type {Object.<!apps.action.PropertyUpdater>}
   * @private
   */
  this.propertyUpdaters_ = null;

  /** @private {apps.action.FireActionDelegate} */
  this.fireActionDelegate_ = null;
};


/**
 * Adds property updaters that tie the visibility of a control to whether or not
 * an action is enabled.
 * @return {!office.action.ControlBinderBuilder} The updated builder.
 */
office.action.ControlBinderBuilder.prototype.withVisibilityUpdates = function() {
  if (!this.propertyUpdaters_) {
    this.propertyUpdaters_ = {};
  } else {
    this.checkProperties_(
        [apps.action.Property.ENABLED, apps.action.Property.VISIBLE]);
  }
  this.propertyUpdaters_[apps.action.Property.ENABLED] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    control.setVisible(!!newValue);
    control.setEnabled(!!newValue);
  };
  this.propertyUpdaters_[apps.action.Property.VISIBLE] = goog.nullFunction;
  return this;
};


/**
 * @param {!apps.action.FireActionDelegate} fireActionDelegate
 * @return {!office.action.ControlBinderBuilder}
 */
office.action.ControlBinderBuilder.prototype.withFireActionDelegate = function(
    fireActionDelegate) {
  this.fireActionDelegate_ = fireActionDelegate;
  return this;
};


/**
 * Creates a kennedy control binder which handles impressions and any custom
 * property updating behavior defined by the builder.
 * @return {!apps.action.ControlBinder} The control binder.
 */
office.action.ControlBinderBuilder.prototype.build = function() {
  return new apps.action.ControlBinder(
      this.propertyUpdaters_ || undefined,
      undefined /* opt_contentModifyingProperties */,
      true /* opt_kennedy */,
      this.fireActionDelegate_ ||
      office.diagnostics.impressions.FireActionDelegate.getInstance());
};


/**
 * Ensure each property to be assigned a custom updater, doesn't already have
 * one.
 * @param {!Array.<apps.action.Property>} properties The properties to check.
 * @private
 */
office.action.ControlBinderBuilder.prototype.checkProperties_ = function(
    properties) {
  for (var i = 0; i < properties.length; i++) {
    var property = properties[i];
    if (this.propertyUpdaters_[property]) {
      throw Error('Action property \"' + property +
          '\" already has a custom updater.');
    }
  }
};
