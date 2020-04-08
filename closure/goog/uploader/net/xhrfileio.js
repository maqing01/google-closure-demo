goog.provide('apps.uploader.net.XhrFileIo');
goog.provide('apps.uploader.net.XhrFileIo.XhrIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');
goog.require('goog.dispose');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');



/**
 * @param {apps.uploader.File} file The file to upload.
 * @param {Blob} blob The Html File reference associated with the file, or an
 *     alternate data blob.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.XhrFileIo = function(file, blob) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The file data assocated with the file.
   * @type {Blob}
   * @private
   */
  this.blob_ = blob;
};
goog.inherits(apps.uploader.net.XhrFileIo, apps.uploader.net.FileIo);


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @protected
 * @override
 */
apps.uploader.net.XhrFileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.XhrFileIo');


/**
 * The request object being used for the transfer.
 * @type {goog.net.XhrIo}
 * @private
 */
apps.uploader.net.XhrFileIo.prototype.request_ = null;


/** @override */
apps.uploader.net.XhrFileIo.prototype.sendInternal = function(url) {
  var request = this.createXhr_();
  this.request_ = request;

  // Setup callbacks
  this.getHandler().
      listen(request, goog.net.EventType.SUCCESS, function(e) {
        this.handleSuccess(request.getResponseText());
      }).
      listen(request, goog.net.EventType.ERROR, function(e) {
        this.handleError(
            apps.uploader.ErrorCode.mapErrorCode(request.getLastErrorCode()),
            request.getLastError());
      }).
      listen(request, goog.net.EventType.PROGRESS, function(e) {
        this.onProgress(e.getBrowserEvent()['loaded']);
      });

  request.send(url,
      'POST',
      this.blob_,
      {'Content-Type': this.blob_['type'] || 'application/octet-stream'});
};


/** @override */
apps.uploader.net.XhrFileIo.prototype.abort = function() {
  this.request_.abort();
};


/**
 * Makes a status query to get the final status. Should only be called after the
 * file has finished uploading.
 * @private
 */
apps.uploader.net.XhrFileIo.prototype.sendFinalProgressQuery_ = function() {
  var request = new goog.net.XhrIo();

  // Setup callbacks.
  this.getHandler().
      listen(request, goog.net.EventType.SUCCESS, function(e) {
        this.handleSuccess(request.getResponseText());
      }).
      listen(request, goog.net.EventType.ERROR, function(e) {
        this.handleError(
            apps.uploader.ErrorCode.mapErrorCode(request.getLastErrorCode()),
            request.getLastError());
      });

  request.send(this.getFile().getSessionUrl(), 'POST', '',
      {'X-HTTP-Method-Override': 'PUT',
       'Content-Range': 'bytes */' + this.getFile().getBytesTotal()});
};


/**
 * Creates a new {apps.uploader.net.XhrFileIo.XhrIo} object.
 * @return {!apps.uploader.net.XhrFileIo.XhrIo} object.
 * @private
 */
apps.uploader.net.XhrFileIo.prototype.createXhr_ = function() {
  return new apps.uploader.net.XhrFileIo.XhrIo();
};



/**
 * A small extension to {@link goog.net.XhrIo} which adds support for upload
 * progress events.
 * @constructor
 * @extends {goog.net.XhrIo}
 */
apps.uploader.net.XhrFileIo.XhrIo = function() {
  goog.net.XhrIo.call(this);

  /**
   * Event handler for this class.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(apps.uploader.net.XhrFileIo.XhrIo, goog.net.XhrIo);


/** @override */
apps.uploader.net.XhrFileIo.XhrIo.prototype.createXhr = function() {
  var xhr = apps.uploader.net.XhrFileIo.XhrIo.superClass_.createXhr.call(this);
  this.eventHandler_.listen(xhr['upload'], goog.net.EventType.PROGRESS,
      this.dispatchEvent);

  return xhr;
};


/** @override */
apps.uploader.net.XhrFileIo.XhrIo.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
};
