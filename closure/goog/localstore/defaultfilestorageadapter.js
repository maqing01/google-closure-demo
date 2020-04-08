goog.provide('office.localstore.DefaultFileStorageAdapter');

goog.require('office.localstore.FileStorageAdapter');
goog.require('office.localstore.IdleDelay');
goog.require('office.localstore.filesystem');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.string');



/**
 * @param {!office.debug.ErrorReporterApi} errorReporter The docs error reporter.
 * @param {(function(!FileError))=} opt_fileErrorCallback The error callback to
 *     use when errors from the file system are encountered. This callback
 *     should notification the user of the file errors (e.g. quota exceeded) as
 *     necessary.
 * @param {string=} opt_dirName The directory name to use in the local
 *     filesystem, or null to use the root directory. Does not accept a path.
 *     Used for testing.
 * @param {number=} opt_filesystemType The type of filesystem to request. The
 *     default is PERSISTENT storage.
 * @constructor
 * @struct
 * @extends {office.localstore.FileStorageAdapter}
 */
office.localstore.DefaultFileStorageAdapter = function(
    errorReporter, opt_fileErrorCallback, opt_dirName, opt_filesystemType) {
  goog.base(this);

  /** @private {?(function(!FileError))} */
  this.fileErrorCallback_ = opt_fileErrorCallback || null;

  /**
   * The directory name to use. If null, FILESYSTEM_STORAGE_DIRECTORY will be
   * used.
   * @private {string}
   */
  this.dirName_ = opt_dirName ||
      office.localstore.DefaultFileStorageAdapter.FILESYSTEM_STORAGE_DIRECTORY;

  /** @private {number} */
  this.filesystemType_ = goog.isDef(opt_filesystemType) ?
      opt_filesystemType : goog.global.PERSISTENT;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;
};
goog.inherits(office.localstore.DefaultFileStorageAdapter,
    office.localstore.FileStorageAdapter);


/**
 * Directory under which to store files on the local filesystem.
 * @type {string}
 */
office.localstore.DefaultFileStorageAdapter.FILESYSTEM_STORAGE_DIRECTORY = 'docs';


/**
 * Size of the requested filesystem, in bytes.
 *  Figure out a way to deal with the filesystem running out of
 * space.
 * @type {number}
 */
office.localstore.DefaultFileStorageAdapter.SIZE_BYTES = 10 * 1024 * 1024;


/**
 * Request file URL timeout, in milliseconds.
 * @type {number}
 */
office.localstore.DefaultFileStorageAdapter.FILE_URL_TIMEOUT = 20 * 1000;


/**
 * Request filesystem timeout, in milliseconds.
 * @type {number}
 */
office.localstore.DefaultFileStorageAdapter.FILESYSTEM_REQUEST_TIMEOUT =
    30 * 1000;


/**
 * @type {DirectoryEntry}
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.directory_ = null;


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.initialize = function(
    callback, errorCallback) {
  this.execFileSystemRequest_(
      'initialize',
      goog.partial(
          office.localstore.filesystem.requestFileSystem,
          this.filesystemType_,
          office.localstore.DefaultFileStorageAdapter.SIZE_BYTES),
      goog.bind(this.handleFileSystemAvailable_, this, callback, errorCallback),
      goog.bind(this.handleInitializationError_, this, errorCallback));
};


/**
 * Executes a filesystem operation and logs errors and slowness.
 * @param {string} callSite The call site that caused the FileSystem error,
 *     used only for debugging errors.
 * @param {function(!Function, function(!FileError))} fileSystemOperation
 *     The operation to execute.
 * @param {!Function} successCallback The callback to call when the operation
 *     succeeds.
 * @param {function(string, !FileError)} errorCallback The callback to call when
 *     the operation fails.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.execFileSystemRequest_ =
    function(callSite, fileSystemOperation, successCallback, errorCallback) {
  var timeoutDelay = new office.localstore.IdleDelay(
      goog.bind(this.handleSlowFileSystemResponse_, this, callSite),
      office.localstore.DefaultFileStorageAdapter.FILESYSTEM_REQUEST_TIMEOUT,
      document);
  timeoutDelay.start();

  fileSystemOperation(
      function() {
        timeoutDelay.dispose();
        successCallback.apply(this, arguments);
      },
      function(fileError) {
        timeoutDelay.dispose();
        errorCallback(callSite, fileError);
      });
};


/**
 * Called whenever an error happens during initialization.
 * @param {function(!FileError)} errorCallback Initialization error callback.
 * @param {string} callSite The call site that caused the FileSystem error,
 *     used only for debugging errors.
 * @param {!FileError} fileError The error.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.
    handleInitializationError_ = function(errorCallback, callSite, fileError) {
  this.errorReporter_.info(
      this.buildFileSystemError_(callSite, fileError.code));
  errorCallback(fileError);
};


/**
 * Handles a filesystem error by logging it and calling the failure callback.
 * @param {string} callSite The call site that caused the FileSystem error,
 *     used only for debugging errors.
 * @param {function(Error)} failureCallback The callback to be called.
 * @param {Array} ignorableErrorCodes Error codes that don't need to be logged.
 *      Null if nothing to ignore.
 * @param {!FileError} fileError The error.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.handleError_ = function(
    callSite, failureCallback, ignorableErrorCodes, fileError) {
  var error = this.buildFileSystemError_(callSite, fileError.code);
  if (!ignorableErrorCodes ||
      !goog.array.contains(ignorableErrorCodes, fileError.code)) {
    this.errorReporter_.info(error);
  }
  if (this.fileErrorCallback_) {
    this.fileErrorCallback_(fileError);
  }
  failureCallback(error);
};


/**
 * Handles a filesystem request taking a long time to complete.
 * @param {string} callSite The call site that performed the FileSystem request,
 *     used only for debugging errors.
 * @param {!office.localstore.IdleDelay} timeoutDelay The timeout delay that
 *     called this function.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.
    handleSlowFileSystemResponse_ = function(callSite, timeoutDelay) {
  var context = {};
  context['requestTimeout'] =
      office.localstore.DefaultFileStorageAdapter.FILESYSTEM_REQUEST_TIMEOUT;
  context['timeoutDelays'] = timeoutDelay.getDelays().toString();

  this.errorReporter_.info(new Error('Filesystem slowness, took ' +
      office.localstore.DefaultFileStorageAdapter.FILESYSTEM_REQUEST_TIMEOUT +
      'ms during ' + callSite), context);
};


/**
 * Builds an error object containing information about the FileSystem error.
 * @param {string} callSite The call site that caused the FileSystem error,
 *     used only for debugging errors.
 * @param {number} errorCode The FileError error code number.
 * @return {!Error} An error object containing information about the cause of
 *     of the error.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.buildFileSystemError_ =
    function(callSite, errorCode) {
  var errorType;
  switch (errorCode) {
    case FileError.INVALID_MODIFICATION_ERR:
      errorType = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      errorType = 'INVALID_STATE_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      errorType = 'NOT_FOUND_ERR';
      break;
    case FileError.QUOTA_EXCEEDED_ERR:
      errorType = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.SECURITY_ERR:
      errorType = 'SECURITY_ERR';
      break;
    default:
      errorType = 'UNKNOWN';
      break;
  }
  return Error('Filesystem error (' + errorCode + ' ' + errorType +
      ') during ' + callSite);
};


/**
 * Called when the filesystem object has been fetched, registers it.
 * @param {function()} callback Initialization callback.
 * @param {function(!FileError)} errorCallback Initialization error callback.
 * @param {!FileSystem} fileSystem The newly received filesystem object.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.
    handleFileSystemAvailable_ = function(callback, errorCallback, fileSystem) {
  fileSystem.root.getDirectory(this.dirName_, {create: true},
      goog.bind(this.handleDirectoryEntryAvailable_, this, callback,
          errorCallback),
      goog.bind(this.handleInitializationError_, this, errorCallback,
          'handleFileSystemAvailable_'));
};


/**
 * Called when the directory object has been fetched, registers it.
 * @param {function()} callback Initialization callback.
 * @param {function(!FileError)} errorCallback Initialization error callback.
 * @param {!DirectoryEntry} directory The newly retrieved directory object.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.
    handleDirectoryEntryAvailable_ = function(callback, errorCallback,
    directory) {
  this.directory_ = directory;
  // To test whether this file system is really useable right now (e.g., there
  // is quota) we have to create something.
  directory.getFile('__initcheck', {create: true},
      function(entry) {
        callback();
      },
      goog.bind(this.handleInitializationError_, this, errorCallback,
          'handleDirectoryEntryAvailable_'));
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.addFile = function(
    directory, filename, url, successCallback, failureCallback) {
  var filePath = this.getFilePath_(directory, filename);
  this.addFileToDirectory_(filePath, directory.concat(), url,
      successCallback, failureCallback);
};


/**
 * @param {!Array.<string>} directory The path to the file.
 * @param {string=} opt_filename The filename of the file to add.
 * @return {string} The full path of the file.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.getFilePath_ = function(
    directory, opt_filename) {
  var filePath = directory.join('/');
  if (filePath) {
    filePath += '/';
  }
  if (opt_filename) {
    filePath += opt_filename;
  }
  return filePath;
};


/**
 * Ensures that each of the directories in the specified path exist and then
 * adds a file to local storage.
 * @param {string} fullPath The full path to the file including the filename.
 * @param {!Array.<string>} directory The directory where the file is located.
 * @param {string} url The server URL to fetch the file from.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {function(Error)} failureCallback The callback to be called if adding
 *     the file fails.
 * @param {DirectoryEntry=} opt_directoryEntry The directory entry.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.addFileToDirectory_ =
    function(fullPath, directory, url, successCallback, failureCallback,
        opt_directoryEntry) {
  if (goog.array.isEmpty(directory)) {
    // There are no more directory levels to check so we add the file.
    this.addFile_(fullPath, url, successCallback, failureCallback);
  } else {
    // Check that the next level of the directory path exists.
    var nextDirectory = directory.shift();
    var addFileFn = goog.bind(this.addFileToDirectory_, this,
        fullPath, directory, url, successCallback, failureCallback);
    var dir = opt_directoryEntry || this.directory_;
    dir.getDirectory(nextDirectory, {create: true}, addFileFn,
        goog.bind(this.handleError_, this, 'addFileToDirectory_',
            failureCallback, null /* ignorableErrorCodes */));
  }
};


/**
 * Retrives a file URL and stores it under an id in local storage.
 * @param {string} fileId The file id.
 * @param {string} url The server URL to fetch the file from.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {function(Error)} failureCallback The callback to be called if
 *     retrieval of the file fails.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.addFile_ = function(
    fileId, url, successCallback, failureCallback) {
  var xhrIo = new goog.net.XhrIo();
  goog.events.listen(xhrIo, goog.net.EventType.COMPLETE,
      goog.bind(this.handleXhrComplete_, this, fileId, successCallback,
          failureCallback));
  xhrIo.setTimeoutInterval(
      office.localstore.DefaultFileStorageAdapter.FILE_URL_TIMEOUT);
  xhrIo.setResponseType(goog.net.XhrIo.ResponseType.BLOB);
  xhrIo.send(url, 'GET');
};


/**
 * Callback called when an XHR completed.
 * @param {string} id The file id.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {function(Error)} failureCallback The callback to be called if
 *     retrieval of the file fails.
 * @param {!goog.events.Event} event Event dispatched by the XHR module.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.handleXhrComplete_ =
    function(id, successCallback, failureCallback, event) {
  var xhr = /** @type {goog.net.XhrIo} */ (event.target);
  var contentType = null;
  var response = null;
  var error = null;

  // NOTE: XhrIo.isSuccess() is known to be inaccurate in the case of broken
  // network connections. But in those cases the response will be empty, which
  // we catch below. See also office.net.NetService.isNetworkWarning_().
  if (xhr.isSuccess()) {
    contentType = xhr.getResponseHeader('Content-Type');
    if (goog.string.isEmptySafe(contentType)) {
      error = new Error('Missing Content-Type for URL ' + xhr.getLastUri());
    } else {
      response = /** @type {Blob} */ (xhr.getResponse());
      if (response == null || response.size == 0) {
        error = new Error('Invalid Blob response for URL ' + xhr.getLastUri());
      }
    }
  } else {
    error = new Error(xhr.getLastError());
  }

  if (error) {
    failureCallback(error);
  } else {
    var writeData = goog.bind(this.writeDataToFile_, this,
        response, contentType, successCallback, failureCallback);
    this.directory_.getFile(id, {create: true}, writeData,
        goog.bind(this.handleError_, this, 'handleXhrComplete_',
            failureCallback, null /* ignorableErrorCodes */));
  }

  xhr.dispose();
};


/**
 * Writes the given data to a file, and calls the given callback.
 * @param {!Blob} blob The data to write.
 * @param {?string} contentType The mime content type, if known.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 * @param {!FileEntry} fileEntry The file to write to.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.writeDataToFile_ = function(
    blob, contentType, successCallback, failureCallback, fileEntry) {
  // The file needs to be cleared first before we write any data, in case the
  // file already exists and is larger than the blob.
  fileEntry.createWriter(
      goog.bind(this.clearAndWriteDataToWriter_, this, blob, contentType,
          successCallback, fileEntry.toURL()),
      goog.bind(this.handleError_, this, 'writeDataToFile_', failureCallback,
          null /* ignorableErrorCodes */));
};


/**
 * Clears the given file and writes data to it with the file writer.
 * @param {!Blob} blob The data to write.
 * @param {?string} contentType The mime content type, if known.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {?string} localUrl The local URL for the file.
 * @param {!FileWriter} fileWriter The file writer to write to.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.clearAndWriteDataToWriter_ =
    function(blob, contentType, successCallback, localUrl, fileWriter) {
  fileWriter.onwriteend = goog.bind(this.writeDataToWriter_, this, blob,
      contentType, successCallback, localUrl, fileWriter);
  fileWriter.truncate(0);
};


/**
 * Writes data to the given file with the file writer.
 * @param {!Blob} blob The data to write.
 * @param {?string} contentType The mime content type, if known.
 * @param {function(string, ?string)} successCallback The callback which will be
 *     called on success. Its arguments are the mime type and the local URL.
 * @param {?string} localUrl The local URL for the file.
 * @param {!FileWriter} fileWriter The file writer to write to.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.writeDataToWriter_ =
    function(blob, contentType, successCallback, localUrl, fileWriter) {
  fileWriter.onwriteend = goog.partial(successCallback, contentType, localUrl);
  fileWriter.write(blob);
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.getFileUrl = function(
    directory, uniqueId, successCallback) {
  this.directory_.getFile(this.getFilePath_(directory, uniqueId), {},
      goog.bind(this.callWithUrlFromFileEntry_, this, successCallback),
      goog.bind(this.handleGetFileUrlFailed_, this, successCallback));
};


/**
 * Handle a failure in the getFileUrl method.  If the error is a 'file not
 * found' error, just call the success callback with null.  Otherwise, call
 * the general error handler.
 * @param {function(?string)} successCallback The success callback.
 * @param {!FileError} error The file error.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.handleGetFileUrlFailed_ =
    function(successCallback, error) {
  // If the file simply wasn't found, we just want to return null rather
  // than triggering a fatal error.
  if (error.code == FileError.NOT_FOUND_ERR) {
    successCallback(null);
  } else {
    // Log an error but call back with null to ensure execution continues.
    this.handleError_('handleGetFileUrlFailed_', function(error) {
      successCallback(null);
    }, null /* ignorableErrorCodes */, error);
  }
};


/**
 * Calls the given callback with the URL from the given file entry.
 * @param {function(?string)} successCallback The callback to call with
 *     the file file URL.
 * @param {!FileEntry} fileEntry The file entry to get the URL for.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.callWithUrlFromFileEntry_ =
    function(successCallback, fileEntry) {
  successCallback(fileEntry.toURL());
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.removeFile = function(
    directory, filename, successCallback, failureCallback) {
  var fileLocation = this.getFilePath_(directory, filename);
  this.directory_.getFile(fileLocation, {} /* options */,
      goog.bind(this.removeFileEntry_, this, successCallback,
          failureCallback),
      goog.bind(this.handleRemoveFileFailed_, this,
          successCallback, failureCallback));
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.removeDirectory = function(
    directory, successCallback, failureCallback) {
  var directoryLocation = this.getFilePath_(directory);
  this.directory_.getDirectory(directoryLocation, {} /* options */,
      goog.bind(this.removeDirectory_, this, successCallback,
          failureCallback),
      goog.bind(this.handleRemoveFileFailed_, this,
          successCallback, failureCallback));
};


/**
 * Removes all files from local storage. The behavior for subsequent attempts to
 * add new files is undefined.
 * @param {function()} successCallback This callback will be called when
 *     all files have been cleared.
 */
office.localstore.DefaultFileStorageAdapter.prototype.clearStorage = function(
    successCallback) {
  this.directory_.removeRecursively(successCallback,
      goog.bind(this.handleError_, this, 'clearStorage', function(error) {
        // Log an error but call back with null to ensure execution continues.
        successCallback();
      }, null /* ignorableErrorCodes */));
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.getDirectoryContents =
    function(directory, contentType, callback) {
  var directoryPath = this.getFilePath_(directory);
  var callSite = 'getDirectoryContents of directory [' + directory + ']';

  // Don't log NOT_FOUND_ERRs as they are expected and treated gracefully.
  this.directory_.getDirectory(directoryPath, {},
      goog.bind(this.getDirectoryContents_, this, contentType, callback),
      goog.bind(this.handleError_, this, callSite,
          function(error) {
            callback(null);
          }, [FileError.NOT_FOUND_ERR] /* ignorableErrorCodes */));
};


/**
 * Called when a directory entry is successfully obtained.
 * @param {office.localstore.FileStorageAdapter.ContentType} contentType The type
 *     of content to return.
 * @param {function(Array.<string>)} callback The callback to call with the
 *     list of files.
 * @param {!DirectoryEntry} directory The directory to read from.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.getDirectoryContents_ =
    function(contentType, callback, directory) {
  var directoryReader = directory.createReader();
  directoryReader.readEntries(
      goog.bind(this.handleDirectoryRead_, this, contentType, callback),
      goog.bind(this.handleError_, this, 'getDirectoryContents_', function(
          error) {
        callback(null);
      }, null /* ignorableErrorCodes */));
};


/**
 * Called when a directory is successfully read.
 * @param {office.localstore.FileStorageAdapter.ContentType} contentType The type
 *     of content to return.
 * @param {function(Array.<string>)} callback The callback to call when
 *     the directory has been read.
 * @param {!Array.<!Entry>} entries The list of entries that were read.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.handleDirectoryRead_ =
    function(contentType, callback, entries) {
  var ids = [];
  var ContentType = office.localstore.FileStorageAdapter.ContentType;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (contentType == ContentType.ALL ||
        (contentType == ContentType.FILE && entry.isFile) ||
        (contentType == ContentType.DIRECTORY && entry.isDirectory)) {
      ids.push(entry.name);
    }
  }
  callback(ids);
};


/**
 * Handle a failure in the removeFile method.  If the error is a 'file not
 * found' error, we should treat it as a success.  Otherwise, call the general
 * error handler.
 * @param {function()} successCallback The success callback.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 * @param {!FileError} error The file error.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.handleRemoveFileFailed_ =
    function(successCallback, failureCallback, error) {
  // If the file simply wasn't found, we can treat that as a success.
  if (error.code == FileError.NOT_FOUND_ERR) {
    successCallback();
  } else {
    this.handleError_('handleRemoveFileFailed_', failureCallback,
        null /* ignorableErrorCodes */, error);
  }
};


/**
 * Removes a file entry.
 * @param {function()} successCallback Success callback.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 * @param {!FileEntry} fileEntry The file entry to remove.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.removeFileEntry_ = function(
    successCallback, failureCallback, fileEntry) {
  fileEntry.remove(
      successCallback,
      goog.bind(this.handleError_, this, 'removeFileEntry_', failureCallback,
          null /* ignorableErrorCodes */));
};


/**
 * Removes a directory entry.
 * @param {function()} successCallback Success callback.
 * @param {function(Error)} failureCallback The callback to be called if
 *     removal fails.
 * @param {!DirectoryEntry} directoryEntry The directory entry to remove.
 * @private
 */
office.localstore.DefaultFileStorageAdapter.prototype.removeDirectory_ = function(
    successCallback, failureCallback, directoryEntry) {
  directoryEntry.removeRecursively(
      successCallback,
      goog.bind(this.handleError_, this, 'removeDirectory_', failureCallback,
          null /* ignorableErrorCodes */));
};


/** @override */
office.localstore.DefaultFileStorageAdapter.prototype.disposeInternal =
    function() {
  goog.base(this, 'disposeInternal');

  delete this.directory_;
};
