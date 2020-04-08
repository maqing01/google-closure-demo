
// All Rights Reserved.

/**
 * @fileoverview An extension to {@link apps.uploader.net.FileIo} which uses
 *     Java as the underlying mechanism for uploading files.
 *
 * @author natescottdavis@google.com (Nathan Davis)
 */


goog.provide('apps.uploader.net.JavaFileIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');

goog.require('goog.json');
goog.require('goog.userAgent');


/**
 * Creates a new JavaFileIo object.
 * @param {apps.uploader.File} file The file to upload.
 * @param {Element} applet The Java applet used to make upload requests.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.JavaFileIo = function(file, applet) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The Java applet used to make upload requests.
   * @type {Element}
   * @private
   */
  this.applet_ = applet;

  /**
   * Whether an upload has been started, so we know whether cancelUpload
   * calls are necessary.
   * @type {boolean}
   * @private
   */
  this.uploadStarted_ = false;

  /**
   * ID returned from window.setInterval used for polling the applet to
   * determine file upload progress.
   * @type {?number}
   * @private
   */
  this.progressPollId_ = null;

  /**
   * @desc Message indicating that there was a client error.
   */
  var MSG_UPLOADER_CLIENT_ERROR =
      goog.getMsg('There was a client error with the upload.');

  /**
   * Client error message.
   * @type {string}
   * @private
   */
  this.clientErrorMsg_ = MSG_UPLOADER_CLIENT_ERROR;

  /**
   * Maximum request size for any chunk of a request.  This is currently set to
   * 5 MB until the server implements better checkpointing.
   * NOTE: After checkpointing is implemented in the server, we'll use 10 MB for
   * MAC and 100 MB for non-Mac platforms (since Mac's have issues with >10 MB).
   * @type {number}
   * @private
   */
  this.maxRequestSizeBytes_ = 5242880;
  //  After the server implements better checkpointing,
  // increase the chunck size to (goog.userAgent.MAC ? 10485760 : 104857600);
};
goog.inherits(apps.uploader.net.JavaFileIo, apps.uploader.net.FileIo);


/**
 * Progress polling interval in milliseconds.  The underlying applet will be
 * polled at most one time during this interval.
 * @type {number}
 * @private
 */
apps.uploader.net.JavaFileIo.POLL_INTERVAL_MS_ = 50;


/**
 * Set of responses from starting an upload.
 * NOTE: This enum should match StartUploadStatus in
 * (//java/com/google/uploader/service/client/applet/
 * UploaderApplet.java).
 * @enum {string}
 * @private
 */
apps.uploader.net.JavaFileIo.StartUploadStatus_ = {
  INVALID_URL: 'INVALID_URL',
  MISSING_SELECTION: 'MISSING_SELECTION',
  SUCCESS: 'SUCCESS',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};


/**
 * Aborts the current upload request.
 * @override
 */
apps.uploader.net.JavaFileIo.prototype.abort = function() {
  if (this.uploadStarted_) {
    this.applet_['abortUpload'](this.getFile().getSelectionId());
    window.clearInterval(this.progressPollId_);
  }
};


/**
 * Starts an upload request to the specified URL.
 * @param {string} url The URL to which the file will be sent.
 * @protected
 * @override
 */
apps.uploader.net.JavaFileIo.prototype.sendInternal = function(url) {
  var status = String(this.applet_['startUpload'](
      url, this.getFile().getSelectionId(), this.maxRequestSizeBytes_));
  switch (status) {
    case apps.uploader.net.JavaFileIo.StartUploadStatus_.SUCCESS:
      this.pollForProgress_();
      this.uploadStarted_ = true;
      break;
    case apps.uploader.net.JavaFileIo.StartUploadStatus_.INVALID_URL:
      /**
       * @desc Message that an invalid upload URL is trying to be used.
       */
      var MSG_UPLOADER_INVALID_URL_DETECTED = goog.getMsg(
          'A Url with an invalid domain was detected: {$badurl}',
          {'badurl': url});
      this.handleError(apps.uploader.ErrorCode.EXCEPTION,
          MSG_UPLOADER_INVALID_URL_DETECTED);
      break;
    case apps.uploader.net.JavaFileIo.StartUploadStatus_.UNKNOWN_ERROR:
    case apps.uploader.net.JavaFileIo.StartUploadStatus_.MISSING_SELECTION:
      this.handleError(apps.uploader.ErrorCode.EXCEPTION,
          this.clientErrorMsg_);
      break;
  }
};


/**
 * Updates the progress of this upload, and handles completion and error states.
 * @private
 */
apps.uploader.net.JavaFileIo.prototype.updateProgress_ = function() {
  var file = this.getFile();
  var progressObj = goog.json.parse(
      this.applet_['getProgress'](file.getSelectionId()));
  if (!progressObj) {
    window.clearTimeout(this.progressPollId_);

    /**
     * @desc Message indicating that progress could not be obtained.
     */
    var MSG_UPLOADER_UNABLE_TO_OBTAIN_PROGRESS =
        goog.getMsg('Unable to obtain file upload progress from java plugin.');
    this.handleError(apps.uploader.ErrorCode.EXCEPTION,
        MSG_UPLOADER_UNABLE_TO_OBTAIN_PROGRESS);
    this.applet_['freeResources'](file.getSelectionId());
  }

  var state = progressObj['state'];
  var bytesTransfered = progressObj['bytesTransfered'];
  var bytesTotal = null;
  if (progressObj['bytesTotal']) {
    file.setBytesTotal(progressObj['bytesTotal']);
  }
  switch (state) {
    case 'COMPLETE':
      window.clearTimeout(this.progressPollId_);
      this.onProgress(bytesTransfered);
      this.handleSuccess(
          this.applet_['readServerResponse'](file.getSelectionId()));
      this.applet_['freeResources'](file.getSelectionId());
      break;
    case 'IN_PROGRESS':
      this.onProgress(bytesTransfered);
      break;
    case 'CLIENT_ERROR':
      window.clearTimeout(this.progressPollId_);

      //  Get a more specific error to use here.
      this.handleError(apps.uploader.ErrorCode.EXCEPTION,
          this.clientErrorMsg_);
      this.applet_['freeResources'](file.getSelectionId());
      break;
  }
};


/**
 * Starts polling the applet for file progress.  The polling interval is
 * specified by apps.uploader.net.JavaFileIo.POLL_INTERVAL_MS_.
 * @private
 */
apps.uploader.net.JavaFileIo.prototype.pollForProgress_ = function() {
  this.progressPollId_ = window.setInterval(
      goog.bind(apps.uploader.net.JavaFileIo.prototype.updateProgress_, this),
      apps.uploader.net.JavaFileIo.POLL_INTERVAL_MS_);
};
