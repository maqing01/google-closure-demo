/**
 * @fileoverview Event types triggered by IdbLocalStoreFactory.

 */

goog.provide('office.localstore.idb.IdbLocalStoreFactoryEventType');

goog.require('goog.events');


/**
 * Event types triggered by IdbLocalStoreFactory.
 * @enum {string}
 */
office.localstore.idb.IdbLocalStoreFactoryEventType = {
  /**
   * Fired when the user does not have the docs Chrome Drive app installed.
   */
  CHROME_APP_MISSING: goog.events.getUniqueId('chrome_app_missing')
};
