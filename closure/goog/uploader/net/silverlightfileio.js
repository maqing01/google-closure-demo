

/**
 * @fileoverview An extension to {@link apps.uploader.net.FileIo} which uses
 * Silverlight as the underlying mechanism for uploading files.
 *
 * @author azzie@google.com (Marcin Marszalek)
 */


goog.provide('apps.uploader.net.SilverlightFileIo');

goog.require('apps.uploader.net.FileIo');
goog.require('goog.log');



/**
 * Creates a new SilverlightFileIo object.
 * @param {!apps.uploader.File} file The file to upload.
 * @param {!Object} appUploader The Silverlight uploader object.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.SilverlightFileIo = function(file, appUploader) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The Silverlight uploader object.
   * @type {!Object}
   * @private
   */
  this.appUploader_ = appUploader;

  /**
   * Named logger for this class.
   * @type {goog.log.Logger}
   * @protected
   */
  this.logger =
      goog.log.getLogger('apps.uploader.net.SilverlightFileIo');
};
goog.inherits(apps.uploader.net.SilverlightFileIo, apps.uploader.net.FileIo);



/**
 * @override
 */
apps.uploader.net.SilverlightFileIo.prototype.sendInternal = function(url) {
  this.appUploader_['HintedUpload'](this.getFile().getSelectionId(), url,
                                    this.getFile().getBytesTransferred());
};


/**
 * @override
 */
apps.uploader.net.SilverlightFileIo.prototype.abort = function() {
  this.appUploader_['Abort'](this.getFile().getSelectionId());
};


/**
 * @inheritDoc
 */
apps.uploader.net.SilverlightFileIo.prototype.computeMd5 = function(bytes,
    callback) {
  this.appUploader_['ComputeMd5'](this.getFile().getSelectionId(),
                                  bytes, callback);
};


/**
 * Handles the Silverlight application file upload state change event.
 * @param {!Object} state Silverlight upload state.
 */
apps.uploader.net.SilverlightFileIo.prototype.onStateUpdate = function(state) {
  var status = state['StatusAsString'];
  switch (status) {
    case 'UPLOADING':
    case 'RECOVERABLE_ERROR':
    case 'SEVERE_ERROR':
      // Read the int64 as string to work around a bug in Moonlight HTML bridge.
      var uploadedBytes = state['UploadedBytesAsString'];
      if (uploadedBytes) {
        this.onProgress(Number(uploadedBytes));
      }
      break;
    case 'SUCCEEDED':
      var responseString = state['ResponseString'];
      this.handleSuccess(responseString);
      break;
    case 'FAILED':
      var error = state['LastErrorAsString'];
      goog.log.warning(this.logger, 'Silverlight returned error: ' + error);
      var errorCode = apps.uploader.ErrorCode.UNKNOWN_ERROR;
      switch (error) {
        case 'NETWORK_ERROR':
          errorCode = apps.uploader.ErrorCode.NETWORK_ERROR;
          break;
        case 'IO_ERROR':
          errorCode = apps.uploader.ErrorCode.IO_ERROR;
          break;
        case 'RESOURCE_ERROR':
          errorCode = apps.uploader.ErrorCode.EXCEPTION;
          break;
        case 'SECURITY_ERROR':
          errorCode = apps.uploader.ErrorCode.SECURITY_ERROR;
          break;
        case 'SERVER_REJECTED':
          errorCode = apps.uploader.ErrorCode.SERVER_REJECTED;
          break;
        case 'INVALID_RESPONSE':
        case 'SERVER_ERROR':
          errorCode = apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE;
          break;
        case 'UNKNOWN_ERROR':
          errorCode = apps.uploader.ErrorCode.UNKNOWN_ERROR;
          break;
        default:
          goog.log.error(this.logger,
              'Unhandled Silverlight upload error: ' + error);
      }
      this.handleError(errorCode, error);
      break;
    case 'ABORTED':
      break;
    default:
      goog.log.error(this.logger,
          'Unhandled Silverlight upload status: ' + status);
  }
};
