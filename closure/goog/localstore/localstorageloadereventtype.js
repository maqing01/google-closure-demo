

/**
 * @fileoverview Event types triggered by LocalStorageLoader.

 */

goog.provide('office.localstore.LocalStorageLoaderEventType');

goog.require('goog.events');


/**
 * Event types triggered by LocalStorageLoader.
 * @enum {string}
 */
office.localstore.LocalStorageLoaderEventType = {
  CHROME_APP_MISSING: goog.events.getUniqueId('chrome_app_missing'),
  INITIALIZED: goog.events.getUniqueId('initialized'),
  LOCAL_STORE_INIT_ERROR: goog.events.getUniqueId('local_store_init_error')
};
