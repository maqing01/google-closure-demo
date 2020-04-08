

/**
 * @fileoverview Contains the definition of the SchemaVersionChangeEvent
 * class.

 */

goog.provide('office.localstore.SchemaVersionChangeEvent');

goog.require('office.localstore.LocalStoreEventType');
goog.require('goog.events.Event');



/**
 * An event dispatched by LocalStore to indicate that the schema version has
 * changed.
 * @param {number} newVersion
 * @param {Object=} opt_target
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.localstore.SchemaVersionChangeEvent = function(newVersion, opt_target) {
  goog.base(this, office.localstore.LocalStoreEventType.SCHEMA_VERSION_CHANGED,
      opt_target);

  /**
   * @type {number}
   */
  this.newVersion = newVersion;
};
goog.inherits(office.localstore.SchemaVersionChangeEvent, goog.events.Event);
