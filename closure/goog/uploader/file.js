goog.provide('apps.uploader.File');
goog.provide('apps.uploader.File.State');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.common.utils');
goog.require('goog.crypt');
goog.require('goog.crypt.Sha1');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.structs.Map');
goog.require('goog.userAgent');



//  use opt_relativeDirectoryPath to specify relative dir
// and modify getName to include it.
/**
 * Creates a new File object. It is meant to represent a file selected from a
 * user's local disk. File's also track the state of a file during an upload.
 * @param {string=} opt_path Full or partial file path.
 * @param {number=} opt_size Size of the file in bytes.
 * @param {string=} opt_relativeDirectoryPath The relative path of the directory
 *     from which this file was selected (if this file was selected as part of
 *     a single directory selection). For example, if the user selects the
 *     directory "/home/dir", and "/home/dir/foo/file.txt" is contained (and
 *     consequently selected), this value will be "dir/foo/".
 * @param {string=} opt_selectionId The selection identifier, which for some
 *     uploaders, maps to an absolute file path known only to the plugin (for
 *     security purposes).
 * @param {number=} opt_modifiedTime The time in milliseconds that the file was
 *     last modified according to the OS.
 * @param {string=} opt_mimeType Mime type of the file.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
apps.uploader.File = function(opt_path, opt_size, opt_relativeDirectoryPath,
    opt_selectionId, opt_modifiedTime, opt_mimeType) {
  goog.events.EventTarget.call(this);

  /**
   * Unique ID for a file.
   * @type {number}
   * @private
   */
  this.id_ = apps.uploader.File.nextId_++;

  /**
   * Timestamp of when the file was selected in milliseconds. This is usually
   * the same as when the File object is created.
   * @type {number}
   * @private
   */
  this.selectionTime_ = goog.now();

  /**
   * The full or partial OS file path.
   * @type {string}
   * @private
   */
  this.path_ = apps.uploader.File.normalizePath(opt_path) || '';

  /**
   * The size of a file in bytes.
   * @type {?number}
   * @private
   */
  this.bytesTotal_ = goog.isDefAndNotNull(opt_size) ? opt_size : null;

  /**
   * Arbitrary key/value meta-data to associate with a file.
   * @type {goog.structs.Map.<string,string>}
   * @private
   */
  this.metaData_ = new goog.structs.Map();

  /**
   * The relative path of the directory from which this file was selected
   * (if this file was selected as part of a single directory selection). For
   * example, if the user selects the directory "/home/dir", and
   * "/home/dir/foo/file.txt" is contained (and consequently selected), this
   * value will be "dir/foo/".
   * @type {string|undefined}
   * @private
   */
  this.relativeDirectoryPath_ = apps.uploader.File.normalizePath(
      opt_relativeDirectoryPath);

  /**
   * The selection identifier, which for some uploaders, maps to an
   * absolute file path known only to the plugin (for security purposes).
   * @type {string|undefined}
   * @private
   */
  this.selectionId_ = opt_selectionId;

  /**
   * The top level directory through which this file was selected (or null
   * if the file was not selected via a directory).
   * @type {apps.uploader.Directory}
   * @private
   */
  this.directoryToUpdateOnChange_ = null;

  /**
   * The extra HTTP headers to be sent when uploading the file.
   * @private {!Object}
   */
  this.extraHeaders_ = {};

  /**
   * The intermediate HTTP response headers received while the upload is
   * still in progress.
   * @type {goog.structs.Map.<string,string>}
   * @private
   */
  this.intermediateResponseHeaders_ = new goog.structs.Map();

  /**
   * The time in milliseconds that the file was last modified.
   * @type {?number}
   * @private
   */
  this.modifiedTime_ = goog.isDefAndNotNull(opt_modifiedTime) ?
      opt_modifiedTime : null;

  /**
   * Mime type of the file.
   * @type {?string}
   * @private
   */
  this.mimeType_ = opt_mimeType || null;

  goog.log.info(this.logger_, 'Created new ' + this);
};
goog.inherits(apps.uploader.File, goog.events.EventTarget);


/**
 * The standard path separator to use for all file paths regardless of OS.
 * @type {string}
 */
apps.uploader.File.PATH_SEPARATOR = '/';


/**
 * The filename associated with directory indicators, that is, those files that
 * exist solely to establish directory structure.
 * @type {string}
 */
apps.uploader.File.DIRECTORY_INDICATOR_FILENAME = '.';


/**
 * The various states a file upload can be in.
 * @enum {string}
 */
apps.uploader.File.State = {

  /** The default state for a file (nothing has happened). */
  DEFAULT: 'default',

  /** File has been queued for upload, still no transfer related events. */
  IN_QUEUE: 'inqueue',

  /** File upload recovery is being attempted. */
  RECOVERY: 'recovery',

  /** The upload 'process' has begun, eg: A session for the file is created. */
  START: 'start',

  /** A session for the file was created and actual file transfer has begun. */
  TRANSFER: 'transfer',

  /** The file was transfered to the server without error. */
  SUCCESS: 'success',

  /** An error occured at somepoint in the upload 'process'. */
  ERROR: 'error',

  /** Some files failed as part of a directory upload. */
  PARTIAL_ERROR: 'partial-error',

  /** The user has cancelled the upload. */
  CANCEL: 'cancel'
};


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.File.prototype.logger_ =
    goog.log.getLogger('apps.uploader.File');


/**
 * The number of bytes transferred to a server.
 * @type {number}
 * @private
 */
apps.uploader.File.prototype.bytesTransferred_ = 0;


/**
 * The last error code.
 * @type {apps.uploader.ErrorCode}
 * @private
 */
apps.uploader.File.prototype.lastErrorCode_ = apps.uploader.ErrorCode.NO_ERROR;


/**
 * The last error message.
 * @type {string}
 * @private
 */
apps.uploader.File.prototype.lastErrorMessage_ = '';


/**
 * The URL that the query requests (and upload requests if the crossDomainUrl
 * is undefined) should be made to. This is always has the same domain as
 * the sessionServerUrl. Null if the Rupio session create response has not
 * been received yet.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.sessionUrl_ = null;


/**
 * The URL to report stats to. null or undefined if stats should not be
 * reported for this file.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.statsUrl_ = null;


/**
 * The cross domain URL that the file should be uploaded to or null if the
 * Rupio session create response has not been received yet. If undefined, the
 * sessionUrl should be used as the upload url.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.crossDomainUrl_ = null;


/**
 * The upload id that this file was assigned or null if the Rupio session
 * create response has not been received yet.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.uploadId_ = null;


/**
 * The correlation id set in the Rupio session create response.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.correlationId_ = null;


/**
 * The content type derived from the file extension. This is set by the server
 * in the Rupio session create response.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.contentType_ = null;


/**
 * The drop zone label set in the Rupio session create response.
 * @type {?string}
 * @private
 */
apps.uploader.File.prototype.dropZoneLabel_ = null;


/**
 * The alternate data buffer used in lieu of the on-disk data.
 * @type {Blob|undefined}
 * @private
 */
apps.uploader.File.prototype.alternateBlob_;


/**
 * True if the bytes total is set to an estimate of the file size. False if it
 * is set to the actual size of the file or not set.
 * @type {boolean}
 * @private
 */
apps.uploader.File.prototype.isBytesTotalAnEstimate_ = false;


/**
 * The number of times this file has been retried.
 * @type {number}
 * @private
 */
apps.uploader.File.prototype.retryCount_ = 0;


/**
 * True if the uploader this file was selected from supports retries and this
 * file is in a state that can be retried.
 * @type {boolean}
 * @private
 */
apps.uploader.File.prototype.canRetry_ = false;

/**
 * Returns true if the File supports the specified state, false otherwise.
 * @param {apps.uploader.File.State} state State to check.
 * @return {boolean} Whether the file supports the given state.
 */
apps.uploader.File.isSupportedState = function(state) {
  return goog.object.contains(apps.uploader.File.State, state);
};


/**
 * Next unique instance ID of a File.
 * @type {number}
 * @private
 */
apps.uploader.File.nextId_ = 0;


/**
 * Normalizes a path by replacing '\'s with '/'s on Windows and ensuring that
 * paths do not end with a trailing '/'.
 * @param {string|undefined} path a file or directory path.
 * @return {string|undefined} the path with all '\'s replaced with '/'s on
 *     Windows and any trailing '/' removed.
 */
apps.uploader.File.normalizePath = function(path) {
  if (!path) {
    return path;
  }

  // Replace '\' with '/'.
  if (goog.userAgent.WINDOWS) {
    path = path.replace(/\\/g, apps.uploader.File.PATH_SEPARATOR);
  }

  // Remove trailing '/'.
  if (goog.string.endsWith(path, apps.uploader.File.PATH_SEPARATOR)) {
    path = path.substring(
        0, path.length - apps.uploader.File.PATH_SEPARATOR.length);
  }

  return path;
};


/**
 * Resets the state of this file so that it can be uploaded again.
 * Preserves information that is set when the file is selected.
 */
apps.uploader.File.prototype.resetTransferState = function() {
  this.bytesTransferred_ = 0;
  this.lastErrorCode_ = apps.uploader.ErrorCode.NO_ERROR;
  this.lastErrorMessage_ = '';
  this.sessionUrl_ = null;
  this.statsUrl_ = null;
  this.crossDomainUrl_ = null;
  this.uploadId_ = null;
  this.correlationId_ = null;
  this.contentType_ = null;
  this.dropZoneLabel_ = null;

  this.retryCount_++;
};


/**
 * Returns the unique id for a file.
 * @return {string} The file id.
 */
apps.uploader.File.prototype.getId = function() {
  return String(this.id_);
};


/**
 * Sets the selection timestamp of the file in milliseconds.
 * @param {number} time The new selection time of the file in milliseconds.
 */
apps.uploader.File.prototype.setSelectionTime = function(time) {
  this.selectionTime_ = time;
};


/**
 * Returns the selection time of the file in milliseconds.
 * @return {number} The selection time of the file in milliseconds.
 */
apps.uploader.File.prototype.getSelectionTime = function() {
  return this.selectionTime_;
};


/**
 * Returns the selection id for a file if it has been set, and undefined if
 * it has not been set.  A selection ID (for some uploaders) maps to an absolute
 * file path, known by the uploader plugin.
 * @return {string|undefined} The selection id.
 */
apps.uploader.File.prototype.getSelectionId = function() {
  return this.selectionId_;
};


/**
 * Returns the name of a file including extension.  If the file was selected
 * as part of a directory (i.e., a user selected a directory and this file was
 * contained at some level inside of the directory), then the relative path
 * from the directory to the file is included as well.  For example, if a user
 * selected a directory named "foo" and it contained a subfolder name "bar",
 * which contained this file (named "file.txt"), then this function would
 * return "foo/bar/file.txt".  This is currently how we pass the directory
 * structure information to customer agents.
 * @return {string} The file name.
 */
apps.uploader.File.prototype.getName = function() {
  var baseName = this.getBaseName();
  return this.relativeDirectoryPath_ ?
      this.relativeDirectoryPath_ +
      apps.uploader.File.PATH_SEPARATOR + baseName :
      baseName;
};


/**
 * Returns the file extension.  If the user selects a file named "file.txt",
 * then this function will return "txt".  No sanity checks or case
 * normalization are performed.  If there is no extension, then null is
 * returned.
 * @return {?string} The file extension or null for files without extension.
 */
apps.uploader.File.prototype.getExtension = function() {
  var name = this.getName();
  var dot = name.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  return name.substr(dot + 1);
};


/**
 * Returns the hex-encoded hash of file information, which is supposed to be
 * a cheap replacement for content hash. The assumption here is that a file
 * with the same path and size has the same content. Other information like
 * time of last modification might be added in the future if available.
 * @return {?string} File information hash or null if not available.
 */
apps.uploader.File.prototype.getInfoHash = function() {
  if (!this.bytesTotal_) {
    return null;
  }
  var sha1 = new goog.crypt.Sha1();
  sha1.update(
      goog.crypt.stringToByteArray(this.path_ + '|' + this.bytesTotal_));
  return goog.crypt.byteArrayToHex(sha1.digest());
};


/**
 * Returns the base name (no path) of a file including extension.
 * @return {string} The file base name.
 */
apps.uploader.File.prototype.getBaseName = function() {
  return this.path_.split(apps.uploader.File.PATH_SEPARATOR).pop();
};


/**
 * Clears the relative directory path information for the file.
 */
apps.uploader.File.prototype.clearRelativeDirectoryPath = function() {
  this.relativeDirectoryPath_ = undefined;
};


/**
 * Sets the relative directory path information for the file.
 * @param {string} path The relative directory path to use.
 */
apps.uploader.File.prototype.setRelativeDirectoryPath = function(path) {
  this.relativeDirectoryPath_ = apps.uploader.File.normalizePath(path);
};


/**
 * Sets the top level directory (through which the file was selected) that
 * should be updated when this file's status changes.
 * @param {apps.uploader.Directory} directory The directory to update.
 */
apps.uploader.File.prototype.setDirectoryToUpdateOnChange =
    function(directory) {
  this.directoryToUpdateOnChange_ = directory;
};


/**
 * Gets the top level directory (through which the file was selected) that
 * should be updated when this file's status changes.
 * @return {apps.uploader.Directory} The directory to update.
 */
apps.uploader.File.prototype.getDirectoryToUpdateOnChange = function() {
  return this.directoryToUpdateOnChange_;
};


/**
 * Sets the full or partial system path for a file.
 * @param {string} path The file path.
 */
apps.uploader.File.prototype.setPath = function(path) {
  this.path_ = /** @type {string} */ (apps.uploader.File.normalizePath(path));
};


/**
 * Returns the full OS path of a file. Returns the same value as
 * {@link apps.uploader.File#getName} if the full path is not available.
 * @return {string} The file path.
 */
apps.uploader.File.prototype.getPath = function() {
  return this.path_;
};


/**
 * Returns the relative directory path of a file, or undefined if there is
 * no relative directory path for this file.
 * @return {string|undefined} The relative directory path if it exists.
 */
apps.uploader.File.prototype.getRelativeDirectoryPath = function() {
  return this.relativeDirectoryPath_;
};


/**
 * Returns the time in milliseconds that this file was last modified.
 * @return {?number} The time in milliseconds that this file was last modified
 *     or null if it is not available.
 */
apps.uploader.File.prototype.getModifiedTime = function() {
  return this.modifiedTime_;
};


/**
 * Updates the number of bytes that have been transferred to a server.
 * @param {number} bytes The number of bytes.
 */
apps.uploader.File.prototype.setBytesTransferred = function(bytes) {
  this.bytesTransferred_ = bytes;
};


/**
 * Returns the number of bytes transferred to a server.
 * @return {number} The number of bytes transferred.
 */
apps.uploader.File.prototype.getBytesTransferred = function() {
  return this.bytesTransferred_;
};


/**
 * Updates the last error.
 * @param {apps.uploader.ErrorCode} code The error code.
 * @param {string=} opt_message The error message.
 */
apps.uploader.File.prototype.setError = function(code, opt_message) {
  this.lastErrorCode_ = code;
  this.lastErrorMessage_ = opt_message || '';
};


/**
 * Returns the last error code.
 * @return {apps.uploader.ErrorCode} The last error code.
 */
apps.uploader.File.prototype.getLastErrorCode = function() {
  return this.lastErrorCode_;
};


/**
 * Returns the last error message.
 * @return {string} The last error message.
 */
apps.uploader.File.prototype.getLastErrorMessage = function() {
  return this.lastErrorMessage_;
};


/**
 * Sets the size of a file in bytes.
 * @param {number} bytes The file size in bytes.
 */
apps.uploader.File.prototype.setBytesTotal = function(bytes) {
  this.bytesTotal_ = bytes;
};


/**
 * Returns the size of a file in bytes.
 * @return {?number} The file size in bytes.
 */
apps.uploader.File.prototype.getBytesTotal = function() {
  return this.bytesTotal_;
};


/**
 * Sets if the bytes total is an estimate.
 * @param {boolean} isEstimate True if the bytes total is an estimate.
 */
apps.uploader.File.prototype.setIsBytesTotalAnEstimate = function(isEstimate) {
  this.isBytesTotalAnEstimate_ = isEstimate;
};


/**
 * @return {boolean} True if the bytes total is an estimate.
 */
apps.uploader.File.prototype.isBytesTotalAnEstimate = function() {
  return this.isBytesTotalAnEstimate_;
};


/**
 * Sets the meta-data to associate with a file. All current meta-data will be
 * overriden.
 * @param {Object.<string,string>=} opt_data The object containing meta-data.
 */
apps.uploader.File.prototype.setMetaData = function(opt_data) {
  this.metaData_ = new goog.structs.Map(opt_data);
};


/**
 * Returns the meta-data Map associated with a file.
 * @return {goog.structs.Map.<string,string>} The meta-data map.
 */
apps.uploader.File.prototype.getMetaData = function() {
  return this.metaData_;
};


/**
 * Sets the session URL.
 * @param {?string} url The new URL.
 */
apps.uploader.File.prototype.setSessionUrl = function(url) {
  this.sessionUrl_ = url;
};


/**
 * @return {?string} The session URL.
 */
apps.uploader.File.prototype.getSessionUrl = function() {
  return this.sessionUrl_;
};


/**
 * Sets the stats URL.
 * @param {?string} url The new URL. Can be null or undefined.
 */
apps.uploader.File.prototype.setStatsUrl = function(url) {
  this.statsUrl_ = url;
};


/**
 * @return {?string} The stats URL.
 */
apps.uploader.File.prototype.getStatsUrl = function() {
  return this.statsUrl_;
};


/**
 * Sets the cross domain URL this file will be uploaded to.
 * @param {?string} url The new URL.
 */
apps.uploader.File.prototype.setCrossDomainUrl = function(url) {
  this.crossDomainUrl_ = url;
};


/**
 * @return {?string} The cross domain URL this file will be
 *     uploaded to. Will be undefined if the server did not specify a cross
 *     domain URL.
 */
apps.uploader.File.prototype.getCrossDomainUrl = function() {
  return this.crossDomainUrl_;
};


/**
 * @return {boolean} true if the cross domain URL is present.
 */
apps.uploader.File.prototype.hasCrossDomainUrl = function() {
  return !!this.crossDomainUrl_;
};


/**
 * @return {?string} The URL that the file should be uploaded to. This will be
 *     the cross domain URL or the session URL if the cross domain URL was not
 *     specified.
 */
apps.uploader.File.prototype.getUploadUrl = function() {
  if (this.crossDomainUrl_) {
    return this.crossDomainUrl_;
  }
  return this.sessionUrl_;
};


/**
 * Sets the upload id.
 * @param {?string} uploadId The upload id.
 */
apps.uploader.File.prototype.setUploadId = function(uploadId) {
  this.uploadId_ = uploadId;
};


/**
 * @return {?string} The upload id that this file was assigned.
 */
apps.uploader.File.prototype.getUploadId = function() {
  return this.uploadId_;
};


/**
 * Sets the correlation id.
 * @param {?string} correlationId The correlation id.
 */
apps.uploader.File.prototype.setCorrelationId = function(correlationId) {
  this.correlationId_ = correlationId;
};


/**
 * @return {?string} The correlation id that was returned by the server.
 */
apps.uploader.File.prototype.getCorrelationId = function() {
  return this.correlationId_;
};


/**
 * Sets the content type.
 * @param {?string} contentType The content type derived from the file
 *     extension.
 */
apps.uploader.File.prototype.setContentType = function(contentType) {
  this.contentType_ = contentType;
};


/**
 * @return {?string} The content type derived from the file extension.
 */
apps.uploader.File.prototype.getContentType = function() {
  return this.contentType_;
};


/**
 * Sets the drop zone label.
 * @param {?string} dropZoneLabel The drop zone label.
 */
apps.uploader.File.prototype.setDropZoneLabel = function(dropZoneLabel) {
  this.dropZoneLabel_ = dropZoneLabel;
};


/**
 * @return {?string} The drop zone label returned by the server.
 */
apps.uploader.File.prototype.getDropZoneLabel = function() {
  return this.dropZoneLabel_;
};


/**
 * Sets the extra HTTP headers to be sent when uploading the file.
 * @param {!Object} extraHeaders The headers object.
 */
apps.uploader.File.prototype.setExtraHeaders = function(extraHeaders) {
  this.extraHeaders_ = extraHeaders;
};


/**
 * @return {!Object} The extra HTTP headers to be sent when uploading the file.
 */
apps.uploader.File.prototype.getExtraHeaders = function() {
  return this.extraHeaders_;
};


/**
 * Sets the intermediate HTTP response headers receieved while the upload is
 * still in progress.
 * @param {string} headersText The text of all intermediate response headers.
 */
apps.uploader.File.prototype.setIntermediateResponseHeaders =
    function(headersText) {
  this.intermediateResponseHeaders_ = new goog.structs.Map(
      apps.uploader.common.utils.headersToObject(headersText));
};


/**
 * @return {goog.structs.Map.<string,string>} The intermediate HTTP response
 * headers received while the upload is still in progress.
 */
apps.uploader.File.prototype.getIntermediateResponseHeaders = function() {
  return this.intermediateResponseHeaders_;
};


/**
 * @return {boolean} Whether this file is a directory indicator file, that is,
 *     a file whose base name is simply '.'.
 */
apps.uploader.File.prototype.isDirectoryIndicator = function() {
  return this.getBaseName() == apps.uploader.File.DIRECTORY_INDICATOR_FILENAME;
};


/**
 * Gets the alteranate data blob, if set.
 * @return {Blob|undefined} Alternate data, or undefined.
 */
apps.uploader.File.prototype.getAlternateBlob = function() {
  return this.alternateBlob_;
};


/**
 * Set the alternate data buffer for the in-file data.  This is used by client-
 * side scaling, where we upload the reduced image over the wire rather than the
 * full resolution image.
 * @param {Blob|undefined} alternateBlob The alternate data blob.
 */
apps.uploader.File.prototype.setAlternateBlob = function(alternateBlob) {
  this.alternateBlob_ = alternateBlob;
  if (alternateBlob) {
    this.bytesTotal_ = alternateBlob.size;
  }
};


/**
 * @return {number} The number of times this file has been retried for upload.
 */
apps.uploader.File.prototype.getRetryCount = function() {
  return this.retryCount_;
};


/**
 * Sets whether this file can be retried.
 * @param {boolean} canRetry True if the uploader supports retries and this
 *     file is in a state that can be retried.
 */
apps.uploader.File.prototype.setCanRetry = function(canRetry) {
  this.canRetry_ = canRetry;
};


/**
 * @return {boolean} True if the uploader supports retries and this file is in
 *     a state that can be retried.
 */
apps.uploader.File.prototype.canRetry = function() {
  return this.canRetry_;
};


/**
 * Returns custom toString() for Files.
 * @return {string} The string representation of a file.
 * @override
 */
apps.uploader.File.prototype.toString = function() {
  return ['File(',
          'id:', this.id_,
          ', :', this.path_,
          ', :', this.relativeDirectoryPath_,
          ', :', this.selectionId_,
          ', :', this.bytesTransferred_,
          ', :', this.bytesTotal_,
          ')'].join('');
};

/**
 * Returns the file's mime type.
 * @return {?string}
 */
apps.uploader.File.prototype.getMimeType = function() {
  return this.mimeType_;
};
