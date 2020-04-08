/**
 * @fileoverview Event type for events dispatched by the action registry.

 */


goog.provide('office.controller.ActionRegistryEventType');


/**
 * Events to be used by classes in docs/controller.
 * @enum {string}
 */
office.controller.ActionRegistryEventType = {
  ACTION_REGISTERED: goog.events.getUniqueId('office-action-registered')
};
