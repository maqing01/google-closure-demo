

/**
 * @fileoverview Event types dispatched by LocalStore.

 */

goog.provide('office.localstore.LocalStoreEventType');

goog.require('goog.events');


/**
 * Event types dispatched by the local store or its helper classes.
 * @enum {string}
 */
office.localstore.LocalStoreEventType = {
  // The event type for the event that gets fired when the database is closed.
  DATABASE_CLOSED: goog.events.getUniqueId('database_closed'),

  // This event is generated after all data was deleted from local storage,
  // but is only propagated at the localstore where the deletion was actually
  // triggered (i.e., stores in other frames won't get the event).
  SCHEMA_VERSION_CHANGED: goog.events.getUniqueId('schema_version_changed')
};
