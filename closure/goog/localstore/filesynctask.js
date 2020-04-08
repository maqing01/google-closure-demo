/**
 * @fileoverview Encapsulates the logic to synchronize remote files with both
 * the local file system and local database storage. A started task always
 * completes and can then be interrogated for any errors that might have
 * occurred.
 */

goog.provide('office.localstore.FileSyncTask');

goog.require('office.localstore.FileSyncResult');
goog.require('goog.Disposable');
goog.require('goog.log');
goog.require('goog.object');



/**
 * @param {!office.localstore.FileStorageAdapter} fileStorageAdapter The local
 *     store to use for filesystem storage.
 * @param {!Object.<!office.storage.LocalFile>} fileMap A map from unique ids to
 *     local file objects that should be synced.
 * @param {!Array.<string>} directoryPrefix The directory to use for syncing
 *     files.
 * @param {boolean} deleteMissing Whether files found locally for the given
 *     document and entity type should be deleted if they don't appear in the
 *     given map.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called with the task as an argument when the sync completed.
 * @constructor
 * @struct
 * @implements {office.localstore.FileSyncResult}
 * @extends {goog.Disposable}
 */
office.localstore.FileSyncTask = function(fileStorageAdapter, fileMap,
    directoryPrefix, deleteMissing, callback) {
  goog.base(this);

  /**
   * @type {!office.localstore.FileStorageAdapter}
   * @private
   */
  this.fileStorageAdapter_ = fileStorageAdapter;

  /**
   * @type {!Object.<!office.storage.LocalFile>}
   * @private
   */
  this.fileMap_ = fileMap;

  /**
   * @type {boolean}
   * @private
   */
  this.deleteMissing_ = deleteMissing;

  /**
   * @type {function(!office.localstore.FileSyncResult)}
   * @private
   */
  this.callback_ = callback;

  /**
   * A map from file ids to local file URLs that have successfully been synced.
   * @type {!Object.<?string>}
   * @private
   */
  this.localUrls_ = {};

  /**
   * @type {!Array.<string>}
   * @private
   */
  this.directoryPrefix_ = directoryPrefix;

  /**
   * Number of files that have been submitted for syncing.
   * @type {number}
   * @private
   */
  this.syncCount_ = goog.object.getCount(this.fileMap_);
};
goog.inherits(office.localstore.FileSyncTask, goog.Disposable);


/**
 * @type {number}
 * @private
 */
office.localstore.FileSyncTask.prototype.syncSuccessCount_ = 0;


/**
 * Number of files that have failed to sync.
 * @type {number}
 * @private
 */
office.localstore.FileSyncTask.prototype.syncFailureCount_ = 0;


/**
 * Number of files that have been submitted for deletion.
 * @type {number}
 * @private
 */
office.localstore.FileSyncTask.prototype.deleteCount_ = 0;


/**
 * Number of files that have successfully completed deletion.
 * @type {number}
 * @private
 */
office.localstore.FileSyncTask.prototype.deleteSuccessCount_ = 0;


/**
 * Number of files that have failed to delete.
 * @type {number}
 * @private
 */
office.localstore.FileSyncTask.prototype.deleteFailureCount_ = 0;


/**
 * A logger.
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.FileSyncTask.prototype.logger_ = goog.log.getLogger(
    'office.localstore.FileSyncTask');


/**
 * Starts this sync task. It will attempt to sync all files its been configured
 * for individually. Some files might fail to sync, the task can be interrogated
 * about these failures after completion.
 *
 * For files that need to be written, we write to the local filesystem, and if
 * requested delete any unreferenced files.
 */
office.localstore.FileSyncTask.prototype.start = function() {
  if (this.deleteMissing_) {
    this.fileStorageAdapter_.getAllFiles(
        this.directoryPrefix_,
        goog.bind(this.retrievedFileEntries_, this));
  } else {
    this.writeFiles_();
  }
};


/**
 * Called after all file entries for the task's document have been retrieved.
 * Deletes files not listed for sync.
 * @param {Array.<!office.localstore.FileStorageAdapter.FileEntry>} entries The
 *     retrieved file entries.
 * @private
 */
office.localstore.FileSyncTask.prototype.retrievedFileEntries_ =
    function(entries) {
  if (entries) {
    var toDelete = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!this.fileMap_[entry.id]) {
        toDelete.push(entry);
      }
    }
    if (toDelete.length) {
      this.deleteCount_ += toDelete.length;
      this.removeFiles_(toDelete);
    }
  }
  this.writeFiles_();
};


/**
 * Removes files from the local filesystem.  Is only used to remove files stored
 * in the directory format.
 * @param {!Array.<!office.localstore.FileStorageAdapter.FileEntry>} entries The
 *     entries to remove from the local filesystem.
 * @private
 */
office.localstore.FileSyncTask.prototype.removeFiles_ = function(entries) {
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    this.fileStorageAdapter_.removeFile(entry.directory, entry.id,
        goog.bind(this.fileDeleted_, this),
        goog.bind(this.fileDeletedError_, this));
  }
};


/**
 * Writes all files to be synced in this task to the local filesystem, later
 * proceeds to add file entities to local storage.
 * @private
 */
office.localstore.FileSyncTask.prototype.writeFiles_ = function() {
  if (this.syncCount_ == 0) {
    this.maybeCompleteSync_();
    return;
  }

  for (var uniqueId in this.fileMap_) {
    var localFile = this.fileMap_[uniqueId];
    this.fileStorageAdapter_.addFile(
        this.directoryPrefix_.concat(localFile.getDirectory()),
        uniqueId,
        localFile.getRemoteUrl() /* url */,
        goog.bind(this.fileWritten_, this, uniqueId),
        goog.bind(this.fileWrittenError_, this));
  }
};


/**
 * Callback called when a file was written.
 * @param {string} fileId The id of the file.
 * @param {string} contentType The mime type of the file written.
 * @param {?string} localUrl The local file URL.
 * @private
 */
office.localstore.FileSyncTask.prototype.fileWritten_ = function(
    fileId, contentType, localUrl) {
  this.localUrls_[fileId] = localUrl;
  this.syncSuccessCount_++;
  this.maybeCompleteSync_();
};


/**
 * Callback called when a file failed to be written.
 * @param {Error} error The reported error.
 * @private
 */
office.localstore.FileSyncTask.prototype.fileWrittenError_ = function(error) {
  //  Record more details about the error somehow.
  goog.log.warning(this.logger_, 'Error writing file: ' + error);
  this.syncFailureCount_++;
  this.maybeCompleteSync_();
};


/**
 * Callback called when a file has been deleted.
 * @private
 */
office.localstore.FileSyncTask.prototype.fileDeleted_ = function() {
  this.deleteSuccessCount_++;
  this.maybeCompleteSync_();
};


/**
 * Callback called when a file failed to delete.
 * @param {Error} error The reported error.
 * @private
 */
office.localstore.FileSyncTask.prototype.fileDeletedError_ = function(error) {
  //  Record more details about the error somehow.
  goog.log.warning(this.logger_, 'Error deleting file: ' + error);
  this.deleteFailureCount_++;
  this.maybeCompleteSync_();
};


/**
 * If all outstanding asynchronous actions have completed, signal completion of
 * the task by calling the completion callback.
 * @private
 */
office.localstore.FileSyncTask.prototype.maybeCompleteSync_ = function() {
  if (this.isSyncCompleted_()) {
    this.callback_(this);
  }
};


/**
 * @return {boolean} Whether all outstanding asynchronous actions that are part
 *     of this task have completed.
 * @private
 */
office.localstore.FileSyncTask.prototype.isSyncCompleted_ = function() {
  var synced = this.syncSuccessCount_ + this.syncFailureCount_;
  var deleted = this.deleteSuccessCount_ + this.deleteFailureCount_;
  return this.syncCount_ == synced && this.deleteCount_ == deleted;
};


/** @override */
office.localstore.FileSyncTask.prototype.hasFailures = function() {
  return this.syncFailureCount_ > 0 || this.deleteFailureCount_ > 0;
};


/** @override */
office.localstore.FileSyncTask.prototype.hasUnexpectedFailures = function() {
  return this.hasFailures();
};


/** @override */
office.localstore.FileSyncTask.prototype.getSyncedCount = function() {
  return this.syncSuccessCount_;
};


/** @override */
office.localstore.FileSyncTask.prototype.getSyncFailedCount = function() {
  return this.syncFailureCount_;
};


/** @override */
office.localstore.FileSyncTask.prototype.getDeletedCount = function() {
  return this.deleteSuccessCount_;
};


/** @override */
office.localstore.FileSyncTask.prototype.getDeleteFailedCount = function() {
  return this.deleteFailureCount_;
};


/** @override */
office.localstore.FileSyncTask.prototype.getLocalUrl = function(fileId) {
  return this.localUrls_[fileId];
};


/** @override */
office.localstore.FileSyncTask.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  delete this.fileStorageAdapter_;
  delete this.fileMap_;
};
