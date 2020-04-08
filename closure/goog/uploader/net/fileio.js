goog.provide('apps.uploader.net.FileIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.EventType');
goog.require('goog.dispose');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.log');



/**
 * Creates a new FileIo object. The object encapsulates upload requests for
 * {@link apps.uploader.File}s.
 * @param {apps.uploader.File} file The file to upload.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
apps.uploader.net.FileIo = function(file) {
  goog.events.EventTarget.call(this);

  /**
   * The file to be uploaded.
   * @type {apps.uploader.File}
   * @private
   */
  this.file_ = file;

  /**
   * The last URL used for an upload request.
   * @type {string}
   * @private
   */
  this.lastUri_ = '';

  /**
   * The last response text.
   * @type {string}
   * @private
   */
  this.responseText_ = '';

  /**
   * The event handler for this class.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(apps.uploader.net.FileIo, goog.events.EventTarget);


/**
 * Named logger for this class.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.net.FileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.FileIo');


/** @override */
apps.uploader.net.FileIo.prototype.dispatchEvent = function(event) {
  try {
    return apps.uploader.net.FileIo.superClass_.dispatchEvent.call(
        this, event);
  } catch (e) {
    goog.log.error(this.logger, 'Event listener threw exception.', e);
  }
};


/**
 * Aborts the current upload request.
 */
apps.uploader.net.FileIo.prototype.abort = goog.abstractMethod;


/**
 * @return {apps.uploader.File} The file to be uploaded.
 */
apps.uploader.net.FileIo.prototype.getFile = function() {
  return this.file_;
};


/**
 * @return {string} The last URL used for an upload request.
 */
apps.uploader.net.FileIo.prototype.getLastUri = function() {
  return this.lastUri_;
};


/**
 * @return {string} The HTTP status from the underlying request object.
 */
apps.uploader.net.FileIo.prototype.getStatus = goog.abstractMethod;


/**
 * @return {string} The status text from the underlying request object.
 */
apps.uploader.net.FileIo.prototype.getStatusText = goog.abstractMethod;


/**
 * @return {string} Text of the last response.
 */
apps.uploader.net.FileIo.prototype.getResponseText = function() {
  return this.responseText_;
};


/**
 * Sets the response text.
 * @param {string} text The text of the last response.
 * @protected
 */
apps.uploader.net.FileIo.prototype.setResponseText = function(text) {
  this.responseText_ = text;
};


/**
 * Starts an upload request to the specified url. This is a wrapper to
 * {@link #sendInternal} which preforms the actual request.
 * @param {string} url The url to which the file will be sent.
 */
apps.uploader.net.FileIo.prototype.send = function(url) {
  this.lastUri_ = url;
  this.sendInternal(url);
};


/**
 * Starts an upload request to the specified url. Subclasses must implement
 * this method.
 * @param {string} url The url to which the file will be sent.
 * @protected
 */
apps.uploader.net.FileIo.prototype.sendInternal = goog.abstractMethod;


/**
 * Called when the response from the server has been successfully received.
 * The file may have been successfully uploaded, or been rejected (due to
 * client or server error).
 * @param {string} responseText Text of the server's response.
 * @protected
 */
apps.uploader.net.FileIo.prototype.handleSuccess = function(responseText) {
  goog.log.fine(this.logger, 'Got upload response:\n' + responseText);
  this.responseText_ = responseText || '';
  var json;
  try {
    json = goog.json.unsafeParse(this.responseText_);
  // Invalid JSON response.
  } catch (ex) {
    this.handleError(apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE,
                     'Invalid response from server.');
    return;
  }

  // Upload success.
  if (json['sessionStatus'] != undefined) {
    // Make sure file progress is 100%
    if (this.file_.getBytesTotal() != null) {
      this.onProgress( /** @type {number} */ (this.file_.getBytesTotal()));
    }
    this.dispatchEvent(apps.uploader.net.EventType.SUCCESS);
  // Upload rejected.
  } else if (json['errorMessage'] != undefined) {
    this.handleError(apps.uploader.ErrorCode.SERVER_REJECTED,
                     '.');
  // Invalid JSON response.
  } else {
    this.handleError(apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE,
                     '.');
  }
};


/**
 * Handler for various error conditions. Dispatches a
 * {@link apps.uploader.net.EventType.ERROR} event.
 *
 * Public because this is accessed in silverlightuploader.js
 *
 * @param {apps.uploader.ErrorCode} errorCode The error code.
 * @param {Error|string} error The associated error.
 */
apps.uploader.net.FileIo.prototype.handleError = function(errorCode,
                                                          error) {
  this.file_.setError(errorCode, goog.isString(error) ? error : error.message);
  //  Additional cleanup?
  this.dispatchEvent(apps.uploader.net.EventType.ERROR);
};


/**
 * Called when there is an update on the number of bytes transferred.
 * @param {number} bytesTransferred The number of bytes transferred so far.
 * @protected
 */
apps.uploader.net.FileIo.prototype.onProgress = function(bytesTransferred) {
  this.file_.setBytesTransferred(bytesTransferred);
  this.dispatchEvent(apps.uploader.net.EventType.PROGRESS);
};


/**
 * Asynchronously computes a partial file hash. An MD5 hash is computed for
 * a given number of bytes from the beginning of the file. The default
 * implementation throws an exception, it should be overridden in FileIo
 * implementations that support upload recovery.
 * @param {number} bytes The length of the initial file block being hashed.
 * @param {function(string)} callback Called with the computed hash (hex).
 */
apps.uploader.net.FileIo.prototype.computeMd5 = function(bytes, callback) {
  throw Error('computeMd5() not implemented');
};


/**
 * Gets the event handler for this class.
 * @return {goog.events.EventHandler} The event handler.
 */
apps.uploader.net.FileIo.prototype.getHandler = function() {
  return this.eventHandler_;
};


/** @override */
apps.uploader.net.FileIo.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
};
