/**
 * @fileoverview Contains the definition of the
 * office.localstore.DocumentFileSyncer class.

 */

goog.provide('office.localstore.DocumentFileSyncer');

goog.require('office.localstore.DocumentFileLocation');



/**
 * Syncs files locally that belong to a document.
 * @param {!office.localstore.FileSyncer} fileSyncer The file syncer.
 * @constructor
 * @struct
 */
office.localstore.DocumentFileSyncer = function(fileSyncer) {
  /**
   * @type {!office.localstore.FileSyncer}
   * @private
   */
  this.fileSyncer_ = fileSyncer;
};


/**
 * Retrieves a URL pointing to a locally stored file.
 * @param {string} docId The id of the document the file is associated with.
 * @param {string} uniqueId The unique id of the file to get the local URL for.
 * @param {string} directory Directory to use, if any.
 * @param {function(?string)} callback The callback called with the URL on
 *     success. Called with null if the file wasn't found locally.
 */
office.localstore.DocumentFileSyncer.prototype.getFileUrl = function(
    docId, uniqueId, directory, callback) {
  this.fileSyncer_.getFileUrl(uniqueId,
      office.localstore.DocumentFileLocation.getDirectory(docId).
          concat(directory), callback);
};


/**
 * Syncs a single file to local storage, fetching from the network and storing
 * it in the file system and as an entity in the local database. If a file
 * with the given id already exists, all existing data will be overwritten.
 * @param {!office.storage.LocalFile} file The local file object.
 * @param {string} docId The id of the document the file is associated with.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called when the file was synced. The argument is the result of this
 *     sync.
 */
office.localstore.DocumentFileSyncer.prototype.syncFile = function(
    file, docId, callback) {
  this.fileSyncer_.syncFile(file,
      office.localstore.DocumentFileLocation.getDirectory(docId), callback);
};


/**
 * Syncs a whole set of files of in a particular document and of a particular
 * type with local storage. All files passed in the map are fetched from the
 * network and stored locally. In addition, any file that exists locally in
 * the given document and of the given type but does not appear in the map
 * will be deleted locally.
 * @param {!Object.<!office.storage.LocalFile>} fileMap A map from unique ids to
 *     local file objects that should be synced.
 * @param {string} docId The id of the document the file is associated with.
 * @param {function(!office.localstore.FileSyncResult)} callback The callback
 *     called when the sync is complete. The argument is the result of this
 *     sync.
 */
office.localstore.DocumentFileSyncer.prototype.syncFiles = function(
    fileMap, docId, callback) {
  this.fileSyncer_.syncFiles(fileMap,
      office.localstore.DocumentFileLocation.getDirectory(docId),
      true /* deleteMissing */, callback);
};
