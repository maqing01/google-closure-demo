/**
 * @fileoverview Utility methods to set, clear and read the unsaved changes bit.
 *
 * The unsaved changes bit will be set in Local Storage to indicate that there
 * are pending changes in any pending queue. This parameter should be cleared
 * when all pending queues are guranteed to be empty.
 *
 * For performance reasons we only clear this bit when the bulksyncer has
 * finished syncing all pending changes and we're certain all pending queues
 * are empty.
 *

 */

goog.provide('office.localstore.idb.unsavedChangesBit');
goog.provide('office.localstore.idb.unsavedChangesBit.Result');


/**
 * The key name under which we store the bit in local storage.
 *
 * @private {string}
 */
office.localstore.idb.unsavedChangesBit.KEY_ = 'office-ucb';


/**
 * Result of reading the unsaved changes bit.
 *
 * @enum {string}
 */
office.localstore.idb.unsavedChangesBit.Result = {
  ERROR: 'e',
  FALSE: 'f',
  TRUE: 't',
  UNINITIALIZED: 'u'
};


/**
 * Value stored in LocalStorage for the unsaved changes bit.
 *
 * @private
 * @enum {string}
 */
office.localstore.idb.unsavedChangesBit.Value_ = {
  TRUE: '1',
  FALSE: '0'
};


/**
 * Sets the data loss bit.
 *
 * @param {!office.debug.ErrorReporterApi} errorReporter
 */
office.localstore.idb.unsavedChangesBit.set = function(errorReporter) {
  try {
    goog.global.localStorage.setItem(
        office.localstore.idb.unsavedChangesBit.KEY_,
        office.localstore.idb.unsavedChangesBit.Value_.TRUE);
  } catch (e) {
    // We want to fail silently if there was an error setting the
    // dataloss bit.
    errorReporter.info(
        new Error('Error setting unsaved changes bit in Local Storage: ' +
        e.message));
  }
};


/**
 * Clears the data loss bit.
 *
 * @param {!office.debug.ErrorReporterApi} errorReporter
 */
office.localstore.idb.unsavedChangesBit.clear = function(errorReporter) {
  try {
    goog.global.localStorage.setItem(
        office.localstore.idb.unsavedChangesBit.KEY_,
        office.localstore.idb.unsavedChangesBit.Value_.FALSE);
  } catch (e) {
    // We want to fail silently if there was an error setting the
    // dataloss bit.
    errorReporter.info(
        new Error('Error clearing unsaved changes bit in Local Storage: ' +
            e.message));
  }
};


/**
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @return {office.localstore.idb.unsavedChangesBit.Result}
 */
office.localstore.idb.unsavedChangesBit.get = function(errorReporter) {
  try {
    var value = goog.global.localStorage.getItem(
        office.localstore.idb.unsavedChangesBit.KEY_);
  } catch (e) {
    errorReporter.info(
        new Error('Error reading unsaved changes bit: ' + e.message));
    return office.localstore.idb.unsavedChangesBit.Result.ERROR;
  }
  switch (value) {
    case office.localstore.idb.unsavedChangesBit.Value_.TRUE:
      return office.localstore.idb.unsavedChangesBit.Result.TRUE;
    case office.localstore.idb.unsavedChangesBit.Value_.FALSE:
      return office.localstore.idb.unsavedChangesBit.Result.FALSE;
    default:
      return office.localstore.idb.unsavedChangesBit.Result.UNINITIALIZED;
  }
};
