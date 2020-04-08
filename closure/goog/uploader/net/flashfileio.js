
// All Rights Reserved.

/**
 * @fileoverview An extension to {@link apps.uploader.net.FileIo} which uses
 *     Flash as the underlying mechanism for uploading files.
 *
 * @author wescarr@google.com (Wes Carr)
 */


goog.provide('apps.uploader.net.FlashFileIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');
goog.require('goog.log');



/**
 * Creates a new FlashFileIo object.
 * @param {apps.uploader.File} file The file to upload.
 * @param {Object} flashFile The underlying Flash file representation.
 * @param {Element} flashUploader The Flash instance used to make upload
 *     requests.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.FlashFileIo = function(file, flashFile, flashUploader) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The underlying Flash file representation.
   * @type {Object}
   * @private
   */
  this.flashFile_ = flashFile;

  /**
   * The Flash instance used to make upload requests.
   * @type {Element}
   * @private
   */
  this.flashUploader_ = flashUploader;

  /**
   * Whether an upload has been started, so we know whether cancelUpload
   * calls are necessary.
   * @type {boolean}
   * @private
   */
  this.uploadStarted_ = false;
};
goog.inherits(apps.uploader.net.FlashFileIo, apps.uploader.net.FileIo);


/**
 * Named logger for this class.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.net.FlashFileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.FlashFileIo');

/**
 * Aborts the current upload request.
 * @override
 */
apps.uploader.net.FlashFileIo.prototype.abort = function() {
  if (this.uploadStarted_) {
    // cancelUpload may not still be a function if the SWF has been hidden in
    // the DOM.
    if (goog.isFunction(this.flashUploader_['cancelUpload'])) {
      // We can't call cancelUploadFunction directly: It's a foreign function
      // wrapper that for some reason loses its context if assigned to a local
      // variable.
      this.flashUploader_['cancelUpload'](this.flashFile_['id']);
    }
  }
};


/**
 * Starts an upload request to the specified url.
 * @param {string} url The url to which the file will be sent.
 * @protected
 * @override
 */
apps.uploader.net.FlashFileIo.prototype.sendInternal = function(url) {
  this.flashUploader_['startUpload'](this.flashFile_['id'], url);

  this.uploadStarted_ = true;
};


/**
 * Handles events called by the Flash API.
 * @param {Object} event The event to handle.
 */
apps.uploader.net.FlashFileIo.prototype.handleFlashMessage = function(event) {
  switch (event['type']) {
    case 'onOpen':
      goog.log.fine(this.logger, 'Flash:onOpen ' + this.getFile());
      break;
    case 'onProgress':
      this.onProgress(event['bytesLoaded']);
      break;
    case 'onCompleteData':
      this.handleSuccess(event['data']);
      break;
    case 'onHttpError':
      this.handleError(apps.uploader.ErrorCode.NETWORK_ERROR,
                       'HTTP Error ' + event['code']);
      break;
    case 'onSecurityError':
      this.handleError(apps.uploader.ErrorCode.SECURITY_ERROR,
                       event['error']);
      break;
    case 'onIoError':
      this.handleError(apps.uploader.ErrorCode.IO_ERROR,
                       'An error occured while reading the file.');
      break;
  }
};
