/**
 * @fileoverview Interface used by the local storage system for retrieving files
 * from the server and storing them locally.
 */

goog.provide('office.localstore.FileStorageAdapter');
goog.provide('office.localstore.FileStorageAdapter.FileEntry');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.async.Deferred');



/**
 * Base class for the file storage adapter expected by the local storage system
 * to handle locally stored files.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.FileStorageAdapter = function() {
  goog.base(this);
};
goog.inherits(office.localstore.FileStorageAdapter, goog.Disposable);


/**
 * The type of directory content.
 * @enum {string}
 */
office.localstore.FileStorageAdapter.ContentType = {
  ALL: 'all',
  DIRECTORY: 'directory',
  FILE: 'file'
};


/**
 * Initializes the file storage adapter.
 * @param {function()} completionCallback Function to call when initialization
 *     is complete.
 * @param {function(!FileError)} errorCallback Function to call when
 *     initialization failed, most likely because local storage is not
 *     available.
 */
office.localstore.FileStorageAdapter.prototype.initialize = goog.abstractMethod;


/**
 * Package private. Retrieves a file URL, and stores it in local storage under
 * the given directory, using the given filename. If there is already a file
 * matching the given directory and filename, it will be re-fetched and
 * overwritten.
 * @param {!Array.<string>} directory The path of a directory to which to add
 *     the file.
 * @param {string} filename The name of the file to add.
   @param {string} serverUrl The server URL to fetch the file from.
 * @param {function(string, ?string)} successCallback The callback which
 *     will be called on success. Its arguments are the mime type and the local
 *     URL of the file.
 * @param {function(Error)} failureCallback The callback to be called if adding
 *     the file fails.
 */
office.localstore.FileStorageAdapter.prototype.addFile = goog.abstractMethod;


/**
 * Package private. Retrieves the local URL of a file. This method retrieves the
 * file specified by 'filename' at the given 'directory' path.
 * @param {!Array.<string>} directory The directory to use.
 * @param {string} filename The name of the file.
 * @param {function(?string)} successCallback The callback with the local URL as
 *     an argument, or null if the file is not locally available.
 */
office.localstore.FileStorageAdapter.prototype.getFileUrl = goog.abstractMethod;


/**
 * Removes a file from local storage given its directory and filename.
 * @param {!Array.<string>} directory The path of the directory where the file
 *     should be located.
 * @param {string} filename The name of the file to remove.
 * @param {function()} successCallback This callback will be called when removal
 *     is complete.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 */
office.localstore.FileStorageAdapter.prototype.removeFile = goog.abstractMethod;


/**
 * Package private. Removes a directory and all of its contents, recursively,
 * from local storage.
 * @param {!Array.<string>} directory The path of the directory to remove.
 * @param {function()} successCallback This callback will be called when removal
 *     is complete.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 */
office.localstore.FileStorageAdapter.prototype.removeDirectory =
    goog.abstractMethod;


/**
 * Gets a list of file and/or directory names under a given directory.
 * @param {!Array.<string>} directory The path of a directory from which to get
 *     a list of contents.
 * @param {office.localstore.FileStorageAdapter.ContentType} contentType The type
 *     of content to return.
 * @param {function(Array.<string>)} callback The callback, to be called with
 *     the list of file names and/or directory names under the provided
 *     directory, or an empty array if the provided directory does not exist or
 *     is empty.
 */
office.localstore.FileStorageAdapter.prototype.getDirectoryContents =
    goog.abstractMethod;


/**
 * Returns all the files of type FILE under a directory prefix and its sub
 * directories.
 * @param {!Array.<string>} dirPrefix The directory to start the search from.
 * @param {function(!Array.<!office.localstore.FileStorageAdapter.FileEntry>)}
 *     callback To be called with the list of file entries.
 */
office.localstore.FileStorageAdapter.prototype.getAllFiles =
    function(dirPrefix, callback) {
  var files = [];
  var deferCollectingDirectFiles = new goog.async.Deferred();
  var deferCollectingNonDirectFiles = new goog.async.Deferred();
  deferCollectingDirectFiles.awaitDeferred(deferCollectingNonDirectFiles);
  deferCollectingDirectFiles.addCallback(goog.partial(callback, files));

  // Adding all the files from the current directory.
  this.getDirectoryContents(
      dirPrefix,
      office.localstore.FileStorageAdapter.ContentType.FILE,
      /** @param {Array.<string>} ids */
      function(ids) {
        if (ids) {
          for (var i = 0; i < ids.length; i++) {
            files.push(new office.localstore.FileStorageAdapter.FileEntry(
                ids[i], dirPrefix));
          }
        }
        deferCollectingDirectFiles.callback();
      });

  // Getting all the sub directories and recursively call this method.
  this.getDirectoryContents(
      dirPrefix,
      office.localstore.FileStorageAdapter.ContentType.DIRECTORY,
      goog.bind(/** @param {Array.<string>} dirs */ function(dirs) {
        if (dirs && dirs.length) {
          var numDirs = dirs.length;
          for (var i = 0; i < dirs.length; i++) {
            this.getAllFiles(dirPrefix.concat(dirs[i]),
                /**
                 * @param {!Array.<!office.localstore.FileStorageAdapter.
                 *     FileEntry>} entries
                 */
                function(entries) {
                  numDirs--;
                  goog.array.extend(files, entries);
                  if (numDirs == 0) {
                    deferCollectingNonDirectFiles.callback();
                  }
                });
          }
        } else {
          deferCollectingNonDirectFiles.callback();
        }
      }, this));
};



/**
 * Represents a file and its directory.
 * @param {string} id
 * @param {!Array.<string>} directory
 * @constructor
 */
office.localstore.FileStorageAdapter.FileEntry = function(id, directory) {
  /**
   * @type {string}
   * @const
   */
  this.id = id;

  /**
   * @type {!Array.<string>}
   * @const
   */
  this.directory = directory;
};
