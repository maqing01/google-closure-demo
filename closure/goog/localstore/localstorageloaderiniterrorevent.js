/**
 * @fileoverview Contains the definition of the LocalStorageLoaderInitErrorEvent
 * class.

 */

goog.provide('office.localstore.LocalStorageLoaderInitErrorEvent');

goog.require('office.localstore.LocalStorageLoaderEventType');
goog.require('goog.events.Event');



/**
 * An event dispatched by the {@code office.localstore.LocalStorageLoader} when
 * an initialization error occurred.
 * @param {!office.localstore.LocalStoreError} error The local store error.
 * @param {Object=} opt_target The target of this event.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.localstore.LocalStorageLoaderInitErrorEvent = function(
    error, opt_target) {
  goog.base(
      this, office.localstore.LocalStorageLoaderEventType.LOCAL_STORE_INIT_ERROR,
      opt_target);

  /**
   * The local store error.
   * @type {!office.localstore.LocalStoreError}
   */
  this.error = error;
};
goog.inherits(
    office.localstore.LocalStorageLoaderInitErrorEvent, goog.events.Event);
