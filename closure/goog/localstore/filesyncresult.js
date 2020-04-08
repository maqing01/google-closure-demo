

/**
 * @fileoverview Result of a file sync operation.

 */

goog.provide('office.localstore.FileSyncResult');



/**
 * Interface for the result of syncing one or more files to local storage.
 * @interface
 */
office.localstore.FileSyncResult = function() {};


/**
 * @return {boolean} Whether there were failures during the sync.
 */
office.localstore.FileSyncResult.prototype.hasFailures = goog.abstractMethod;


/**
 * @return {boolean} Whether there were unexpected failures during the sync.
 *    This is necessary in order for callers to disambiguate between actual
 *    failures during a sync and failures because the syncer is configured to
 *    always fail because the user is not opted in.
 */
office.localstore.FileSyncResult.prototype.hasUnexpectedFailures =
    goog.abstractMethod;


/**
 * @return {number} The number of files that were successfully synced.
 */
office.localstore.FileSyncResult.prototype.getSyncedCount = goog.abstractMethod;


/**
 * @return {number} The number of files that failed to sync.
 */
office.localstore.FileSyncResult.prototype.getSyncFailedCount =
    goog.abstractMethod;


/**
 * @return {number} The number of files that were successfully deleted.
 */
office.localstore.FileSyncResult.prototype.getDeletedCount = goog.abstractMethod;


/**
 * @return {number} The number of files that failed to delete.
 */
office.localstore.FileSyncResult.prototype.getDeleteFailedCount =
    goog.abstractMethod;


/**
 * Gets the local URL for the given file id.
 * @param {string} fileId The id of the file entity to get.
 * @return {?string} The local URL.
 */
office.localstore.FileSyncResult.prototype.getLocalUrl = goog.abstractMethod;
