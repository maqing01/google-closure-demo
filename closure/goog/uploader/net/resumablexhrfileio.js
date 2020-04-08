

/**
 * @fileoverview An extension to {@link apps.uploader.net.ResumableFileIo}
 *     which uses XhrIo as the underlying mechanism for uploading form files.
 *
 * @author wescarr@google.com (Wes Carr)
 */


goog.provide('apps.uploader.net.ResumableXhrFileIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.ResumableFileIo');
goog.require('apps.uploader.net.XhrFileIo.XhrIo');
goog.require('goog.asserts');
goog.require('goog.crypt');
goog.require('goog.crypt.BlobHasher');
goog.require('goog.crypt.BlobHasher.EventType');
goog.require('goog.crypt.Md5');
goog.require('goog.fs');
goog.require('goog.log');
goog.require('goog.net.EventType');



/**
 * Creates a new ResumableXhrFileIo object.
 * @param {apps.uploader.File} file The file to upload.
 * @param {!Blob} blob The Html File reference associated with the file, or an
 *     alternate data blob.
 * @constructor
 * @extends {apps.uploader.net.ResumableFileIo}
 */
apps.uploader.net.ResumableXhrFileIo = function(file, blob) {
  apps.uploader.net.ResumableFileIo.call(this, file);

  /**
   * The file data assocated with the file, or a alternate data blob.
   * @type {!Blob}
   * @private
   */
  this.blob_ = blob;

  /**
   * Blob hasher for the local content.
   * @type {goog.crypt.BlobHasher}
   * @private
   */
  this.blobHasher_ = null;
};
goog.inherits(apps.uploader.net.ResumableXhrFileIo,
              apps.uploader.net.ResumableFileIo);


/**
 * Named logger for this class.
 * @type {goog.log.Logger}
 * @protected
 * @override
 */
apps.uploader.net.ResumableXhrFileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.ResumableXhrFileIo');


/** @override */
apps.uploader.net.ResumableXhrFileIo.prototype.sendRequest = function(url,
    opt_headers, opt_range) {
  this.request = new apps.uploader.net.XhrFileIo.XhrIo();
  var chunkStart = opt_range ? opt_range.start : 0;
  this.getHandler().
      listen(this.request, goog.net.EventType.READY_STATE_CHANGE,
          this.handleReadyStateChange).
      listen(this.request, goog.net.EventType.PROGRESS, function(e) {
        this.onProgress(chunkStart + e.getBrowserEvent()['loaded']);
      });

  var slice = this.blob_;
  if (opt_range) {
    slice = goog.fs.sliceBlob(this.blob_, opt_range.start, opt_range.end + 1);
    goog.asserts.assert(slice);
    goog.log.info(this.logger, 'Sending partial blob: ' + opt_range);
  }

  this.request.send(url, 'POST', slice, opt_headers);
};


/** @override */
apps.uploader.net.ResumableXhrFileIo.prototype.handleReadyStateComplete =
    function() {
  // Detect a XhrIo network error (i.e., broken connection).
  if (this.getRequestStatus() == 0) {
    if (this.isAutoRetry()) {
      goog.log.fine(this.logger, 'Handling retryable network error');
      this.handleRetryableError();
    } else {
      this.handleError(apps.uploader.ErrorCode.NETWORK_ERROR,
                       'network error');
    }
    return;
  }

  apps.uploader.net.ResumableXhrFileIo.superClass_.handleReadyStateComplete
      .call(this);
};


/**
 * Aborts the current upload request.
 * @override
 */
apps.uploader.net.ResumableXhrFileIo.prototype.abort = function() {
  if (this.blobHasher_) {
    this.blobHasher_.abort();
  }
  apps.uploader.net.ResumableXhrFileIo.superClass_.abort.call(this);
};


/** @override */
apps.uploader.net.ResumableXhrFileIo.prototype.computeMd5 = function(bytes,
    callback) {
  var md5 = new goog.crypt.Md5();
  this.blobHasher_ = new goog.crypt.BlobHasher(md5);
  var selfObj = this;
  goog.events.listen(this.blobHasher_,
                     goog.crypt.BlobHasher.EventType.COMPLETE,
                     function() {
    var hash = selfObj.blobHasher_.getHash();
    selfObj.blobHasher_ = null;
    callback(goog.crypt.byteArrayToHex(hash));
  });
  var slice = goog.fs.sliceBlob(this.blob_, 0, bytes);
  goog.asserts.assert(slice);
  this.blobHasher_.hash(slice);
};
