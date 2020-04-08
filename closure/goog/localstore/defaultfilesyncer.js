goog.provide('office.localstore.DefaultFileSyncer');

goog.require('office.localstore.FileSyncTask');
goog.require('office.localstore.FileSyncer');



/**
 * @param {!office.localstore.FileStorageAdapter} fileStorageAdapter The local
 *     store to use for filesystem storage.
 * @constructor
 * @struct
 * @implements {office.localstore.FileSyncer}
 */
office.localstore.DefaultFileSyncer = function(fileStorageAdapter) {
  /**
   * @type {!office.localstore.FileStorageAdapter}
   * @private
   */
  this.fileStorageAdapter_ = fileStorageAdapter;
};


/** @override */
office.localstore.DefaultFileSyncer.prototype.getFileUrl = function(
    uniqueId, directory, callback) {
  this.fileStorageAdapter_.getFileUrl(
      directory,
      uniqueId,
      callback);
};


/** @override */
office.localstore.DefaultFileSyncer.prototype.syncFile = function(
    file, directoryPrefix, callback) {
  var fileMap = {};
  fileMap[file.getId()] = file;
  this.runNewSyncTask_(fileMap, directoryPrefix, false /* deleteMissing */,
      callback);
};


/** @override */
office.localstore.DefaultFileSyncer.prototype.syncFiles = function(
    fileMap, directoryPrefix, deleteMissing, callback) {
  this.runNewSyncTask_(fileMap, directoryPrefix, deleteMissing, callback);
};


/**
 * Creates and runs a new sync task.
 * @param {!Object.<!office.storage.LocalFile>} fileMap A map from unique ids to
 *     local file objects that should be synced.
 * @param {!Array.<string>} directoryPrefix The directory to use for syncing
 *     files. An array of ['a', 'b', 'c'] corresponds to a path of a/b/c/.
 * @param {boolean} deleteMissing Whether files found locally for the given
 *     document and entity type should be deleted if they don't appear in the
 *     given map.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called with the sync task once the sync completed.
 * @private
 */
office.localstore.DefaultFileSyncer.prototype.runNewSyncTask_ = function(
    fileMap, directoryPrefix, deleteMissing, callback) {
  var task = new office.localstore.FileSyncTask(this.fileStorageAdapter_, fileMap,
      directoryPrefix, deleteMissing, callback);
  task.start();
};
