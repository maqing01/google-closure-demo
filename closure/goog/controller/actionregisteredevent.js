goog.provide('office.controller.ActionRegisteredEvent');

goog.require('office.controller.ActionRegistryEventType');
goog.require('goog.events.Event');



/**
 * @param {!apps.action.Action} action The registered action.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.controller.ActionRegisteredEvent = function(action) {
  goog.base(this, office.controller.ActionRegistryEventType.ACTION_REGISTERED);

  /**
   * The action which was registered.
   * @type {!apps.action.Action}
   */
  this.action = action;
};
goog.inherits(office.controller.ActionRegisteredEvent, goog.events.Event);
