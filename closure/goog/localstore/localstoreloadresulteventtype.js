/**

 */

goog.provide('office.localstore.LocalStoreLoadResultEventType');

goog.require('goog.events');


/**
 * Event types dispatched by the local store load result.
 * @enum {string}
 */
office.localstore.LocalStoreLoadResultEventType = {
  LOCAL_STORE_LOAD_RESULT_COMPLETE:
      goog.events.getUniqueId('local_store_load_result_complete')
};
