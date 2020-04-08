

/**
 * @fileoverview Syncs remote files to local storage.

 */

goog.provide('office.localstore.FileSyncer');



/**
 * Interface for syncing remote files to local storage.
 * @interface
 */
office.localstore.FileSyncer = function() {};


/**
 * Syncs a single file to local storage, fetching from the network and storing
 * it in the file system and as an entity in the local database. If a file
 * with the given id already exists, all existing data will be overwritten.
 * @param {!office.storage.LocalFile} file The local file object.
 * @param {!Array.<string>} directoryPrefix The directory to use for syncing
 *     files.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called when the file was synced. The argument is the result of this
 *     sync.
 */
office.localstore.FileSyncer.prototype.syncFile = goog.abstractMethod;


/**
 * Syncs a whole set of files of in a particular document and of a particular
 * type with local storage. All files passed in the map are fetched from the
 * network and stored locally. In addition, any file that exists locally in
 * the given document and of the given type but does not appear in the map
 * will be deleted locally.
 * @param {!Object.<!office.storage.LocalFile>} fileMap A map from unique ids to
 *     local file objects that should be synced.
 * @param {!Array.<string>} directoryPrefix The directory to use for syncing
 *     files. An array of ['a', 'b', 'c'] corresponds to a path of a/b/c/. If
 *     the local file specifies a directory as well, it will be added to the
 *     path. A local file with directory 'd' synced with a directoryPrefix
 *     ['a', 'b'] will be stored in a/b/d.
 * @param {boolean} deleteMissing Whether to delete files that are not present
 *     in the fileMap but appear in the destination directory.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called when the sync is complete. The argument is the result of this
 *     sync.
 */
office.localstore.FileSyncer.prototype.syncFiles = goog.abstractMethod;


/**
 * Retrieves a URL pointing to a locally stored file.
 * @param {string} uniqueId The unique id of the file to get the local URL for.
 * @param {!Array.<string>} directory The directory to use for syncing files.
 * @param {function(?string)} callback The callback called with the URL on
 *     success. Called with null if the file wasn't found locally.
 */
office.localstore.FileSyncer.prototype.getFileUrl = goog.abstractMethod;
