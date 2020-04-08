

/**
 * @fileoverview Contains the definition of the IdbVersionChangeEvent
 * class.

 */

goog.provide('office.localstore.idb.VersionChangeEvent');

goog.require('goog.events');
goog.require('goog.events.Event');



/**
 * An event dispatched by IdbUtil to indicate that the schema version is
 * changing.
 * @param {number} newVersion The new version that the IDB database will be
 *     changed to.
 * @param {Object=} opt_target The target of this event.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.localstore.idb.VersionChangeEvent = function(newVersion, opt_target) {
  goog.base(this, office.localstore.idb.VersionChangeEvent.EVENT_TYPE,
      opt_target);

  /**
   * @type {number} The new version that the IDB database will be changed to.
   */
  this.newVersion = newVersion;
};
goog.inherits(office.localstore.idb.VersionChangeEvent, goog.events.Event);


/**
 * The event type for the IdbVersionChangeEvent.
 * @type {string}
 */
office.localstore.idb.VersionChangeEvent.EVENT_TYPE =
    goog.events.getUniqueId('versionChange');
