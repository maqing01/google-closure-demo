

/**
 * @fileoverview Contains the definition of the NullFileSyncer class.

 */

goog.provide('office.localstore.FailingFileSyncer');

goog.require('office.localstore.FailedFileSyncResult');
goog.require('office.localstore.FileSyncer');
goog.require('goog.object');



/**
 * A FileSyncer implementation that fails for all operations.
 * @constructor
 * @struct
 * @implements {office.localstore.FileSyncer}
 */
office.localstore.FailingFileSyncer = function() {};


/** @override */
office.localstore.FailingFileSyncer.prototype.syncFile = function(
    file, directoryPrefix, callback, opt_docId) {
  callback(new office.localstore.FailedFileSyncResult(1 /* syncFailedCount */));
};


/** @override */
office.localstore.FailingFileSyncer.prototype.syncFiles = function(
    fileMap, directoryPrefix, deleteMissing, callback, opt_docId) {
  callback(new office.localstore.FailedFileSyncResult(
      goog.object.getCount(fileMap)));
};


/** @override */
office.localstore.FailingFileSyncer.prototype.getFileUrl = function(
    uniqueId, directory, callback) {
  return callback(null /* url */);
};
