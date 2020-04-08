

/**
 * @fileoverview Contains the definition of the FailedFileSyncResult class.

 */

goog.provide('office.localstore.FailedFileSyncResult');

goog.require('office.localstore.FileSyncResult');



/**
 * A failed file sync result. Reports that all operations failed.
 * @param {number} syncFailedCount The number of file sync operations that
 *     failed.
 * @constructor
 * @struct
 * @implements {office.localstore.FileSyncResult}
 */
office.localstore.FailedFileSyncResult = function(syncFailedCount) {
  /**
   * @type {number}
   * @private
   */
  this.syncFailedCount_ = syncFailedCount;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.hasFailures = function() {
  return true;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.hasUnexpectedFailures =
    function() {
  return false;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.getSyncedCount = function() {
  return 0;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.getSyncFailedCount = function() {
  return this.syncFailedCount_;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.getDeletedCount = function() {
  return 0;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.getDeleteFailedCount =
    function() {
  return 0;
};


/** @override */
office.localstore.FailedFileSyncResult.prototype.getLocalUrl = function(fileId) {
  return null;
};
