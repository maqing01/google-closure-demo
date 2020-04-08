goog.provide('apps.uploader.ImageProcessor');
goog.provide('apps.uploader.ImageProcessor.Item');

goog.require('apps.photos.processing.agresizer.AGResizer');
goog.require('apps.photos.processing.resizer.AbstractResizer');
goog.require('apps.photos.processing.resizer.CanvasResizer');
goog.require('apps.uploader.ExifHelper');
goog.require('apps.uploader.ImageProcessorEvent');
goog.require('apps.uploader.ImageProcessorEvent.Type');
goog.require('apps.uploader.common.utils');
goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.fs');
goog.require('goog.fs.FileReader');
goog.require('goog.log');
goog.require('goog.math');
goog.require('goog.math.Size');
goog.require('goog.structs.Queue');



/**
 * Processor for downsampling images the user is uploading using either
 * HTML5 / Canvas built-in scaling capabilities or JavaScript-based affine
 * gamma resizer. Works on supported browsers such as Chrome and Firefox.
 * Does not work for Internet Explorer as of version 9.
 * @extends {goog.Disposable}
 * @constructor
 */
apps.uploader.ImageProcessor = function() {
  goog.base(this);

  /**
   * Number of items in processing.
   * @type {number}
   * @private
   */
  this.numItemsInProcess_ = 0;

  /**
   * An ordered map of the items queued for processing.  The item(s) currently
   * being processed are not included here.
   * @type {goog.structs.Queue.<!apps.uploader.ImageProcessor.Item>}
   * @private
   */
  this.itemsQueue_ = new goog.structs.Queue();

  /**
   * Event handler for listening to item processing events.
   * @type {!goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(apps.uploader.ImageProcessor, goog.Disposable);


/**
 * Cached flag for whether the browser is capable of generating scaled images.
 * @type {boolean|undefined} True if client-side scaling is supported.
 * @private
 */
apps.uploader.ImageProcessor.isClientScalingSupported_;


/**
 * Tests whether client-side scaling is supported.  Static method exists for the
 * benefit of UploadManager2, which needs to decide if previews are supported.
 * @return {boolean} True if UA is capable of client-side scaling.
 */
apps.uploader.ImageProcessor.isClientScalingSupported = function() {
  if (!goog.isDef(apps.uploader.ImageProcessor.isClientScalingSupported_)) {
    apps.uploader.ImageProcessor.isClientScalingSupported_ = false;
    try {
      if (apps.uploader.common.utils.isBlobSupported() &&
          document.createElement('canvas').getContext) {
        // HACK(thrasher): Test for object URL support.  If not, {@link
        // goog.fs.getUrlObject_} will throw.
        goog.fs.revokeObjectUrl('');
        return apps.uploader.ImageProcessor.isClientScalingSupported_ = true;
      }
    } catch (x) {
    }
  }
  return apps.uploader.ImageProcessor.isClientScalingSupported_;
};


/**
 * Queues a file for image processing.
 * @param {!Blob} blob The OS file object for the file parameter.
 * @param {!apps.uploader.ImageProcessorOptions} options Configuration options
 *     for what size to downsample the image to, what quality to use, etc.
 * @return {!apps.uploader.ImageProcessor.Item} The queued item.
 */
apps.uploader.ImageProcessor.prototype.start = function(blob, options) {
  var item = new apps.uploader.ImageProcessor.Item(blob, options);
  this.itemsQueue_.enqueue(item);
  this.startNextItem_();
  return item;
};


/**
 * Starts processing of the next image if there are any images to process.
 * @private
 */
apps.uploader.ImageProcessor.prototype.startNextItem_ = function() {
  // For now, cap the number of images to be processed concurrently at 1 image.
  // This can probably be increased in the future if necessary.
  // NOTE(jonemerson): If we want to remove this restriction, the call to
  // this.eventHandler_.removeAll() will have to be removed.  Instead we'd
  // want to stop listening for events only on the Item that finished.
  if (!this.itemsQueue_.isEmpty() && this.numItemsInProcess_ < 1) {
    var item = /** @type {!apps.uploader.ImageProcessor.Item} */ (
        this.itemsQueue_.dequeue());
    this.eventHandler_.listen(item,
        [apps.uploader.ImageProcessorEvent.Type.STARTED,
          apps.uploader.ImageProcessorEvent.Type.COMPLETED,
          apps.uploader.ImageProcessorEvent.Type.ERROR],
        this.onItemEvent_);

    // Start image processing asynchronously so that callers have a chance to
    // listen for events first.
    this.numItemsInProcess_++;
    goog.Timer.callOnce(goog.bind(item.start, item), 0);
  }
};


/**
 * Handles the event from an Item.  For final-state events, removes the item
 * from our queue and disposes of any memory it allocated along the way.
 * @param {apps.uploader.ImageProcessorEvent} ev The image processing event.
 * @private
 */
apps.uploader.ImageProcessor.prototype.onItemEvent_ = function(ev) {
  if (ev.type == apps.uploader.ImageProcessorEvent.Type.COMPLETED ||
      ev.type == apps.uploader.ImageProcessorEvent.Type.ERROR) {
    this.numItemsInProcess_--;

    // Clean up everything relating to this image.  Dispose of the item
    // asynchronously so that any other event listeners have a chance to inspect
    // its data.
    this.eventHandler_.removeAll();
    goog.Timer.callOnce(function() {
      ev.getItem().dispose();

      // Start the next item after disposing to ensure that disposal occurs
      // before incurring more memory resources.
      this.startNextItem_();
    }, 0, this);
  }
};



/**
 * An item in the image processor queue.
 * <p>
 * The following events are fired by this object, in order.
 * <ol>
 * <li>When processing on an item starts, a STARTED event is fired.
 * <li>If the processing completes successfully, a COMPLETED event is fired.
 * <li>If the processing completes in error, an ERROR event is fired.
 * </ol>
 * @param {!Blob} blob The OS file object for the file parameter.
 * @param {!apps.uploader.ImageProcessorOptions} options Configuration options
 *     for what size to downsample the image to, what quality to use, etc.
 * @extends {goog.events.EventTarget}
 * @constructor
 */
apps.uploader.ImageProcessor.Item = function(blob, options) {
  goog.base(this);

  /**
   * Temporarily holds a reference to image data until preprocessing is done.
   * @type {?Blob}
   * @private
   */
  this.blob_ = blob;

  /**
   * Configuration options for what size to downsample the image to, what
   * quality to use, etc.
   * @type {!apps.uploader.ImageProcessorOptions}
   * @private
   */
  this.options_ = options;

  /**
   * Internal file ID for this, used solely for logging.
   * @type {number}
   * @private
   */
  this.id_ = apps.uploader.ImageProcessor.Item.nextId_++;
};
goog.inherits(apps.uploader.ImageProcessor.Item, goog.events.EventTarget);


/**
 * Internal counter for item IDs.
 * @type {number}
 * @private
 */
apps.uploader.ImageProcessor.Item.nextId_ = 0;


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.logger_ =
    goog.log.getLogger('apps.uploader.ImageProcessor.Item');


/**
 * The IMG element into which we load the image file.
 * @type {!Image|undefined}
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.imgEl_;


/**
 * EXIF header information pulled from the image if EXIF preservation is
 * enabled.  This will be set once the image has been loaded, rescaled, and our
 * asynchronous EXIF processing has completed -- which will all be done before
 * we dispatch the COMPLETED event.
 * @type {!Array.<number>|undefined}
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.exifHeader_;


/**
 * Whether the dimensions of this item changed during the processing.  If the
 * processed image was smaller than the size prescribed in the processor
 * options, this will be false.
 * @type {boolean}
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.dimensionsChanged_ = false;


/**
 * Starts reading the file into the IMG object.
 */
apps.uploader.ImageProcessor.Item.prototype.start = function() {
  this.dispatchEvent(new apps.uploader.ImageProcessorEvent(
      apps.uploader.ImageProcessorEvent.Type.STARTED, this));
  var imgEl = this.imgEl_ = /** @type {!Image} */ (
      document.createElement('img'));
  imgEl.onload = goog.bind(this.onImageLoaded_, this);
  imgEl.onerror = goog.bind(this.onImageError_, this);
  imgEl.src = goog.fs.createObjectUrl(/** @type {!Blob} */ (this.blob_));
};


/**
 * Handles the image data read in for the purpose of thumbnail generation or
 * client-side rescale.
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.onImageLoaded_ = function() {
  goog.log.info(this.logger_, 'Image loaded: ' + this.id_);

  // Image loaded -- Downsample it!
  // If the canvas can't be drawn correctly, just send complete event here.
  // Doing so causes listening code to upload the original image.
  this.initializeCanvas_().
      addErrback(this.sendCompletedEvent_, this).
      addCallback(this.onCanvasInitialized_, this);
};


/**
 * Reads metadata from the original image afer it was successfully resized.
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.onCanvasInitialized_ = function() {
  // If we haven't been asked to preserve EXIF data, or dimensions have not
  // changed, our job is done.  Let the people know!
  if (!this.options_.isPreserveExif() || !this.dimensionsChanged_) {
    this.sendCompletedEvent_();
    return;
  }

  // Start the EXIF preservation: Look in the image data to find the EXIF
  // and other APP1/APP12 fields.
  var readAsync = goog.fs.FileReader.readAsArrayBuffer(/** @type {!Blob} */ (
      this.blob_));
  readAsync.addCallback(function(data) {
    var header;
    try {
      var finalSize = this.getSize();
      header = /** @type {Array.<number>} */(
          apps.uploader.ExifHelper.createHeader(data,
              this.imgEl_.width, this.imgEl_.height,
              finalSize.width, finalSize.height));
      this.exifHeader_ = header ? header : undefined;
    } catch (x) {
      goog.log.info(this.logger_,
          'APP1 extraction failed: ' + this.id_ + ': ' + x);
    }
    this.sendCompletedEvent_();
  }, this);
  readAsync.addErrback(this.sendCompletedEvent_, this);
};


/**
 * Handles the scenario where the image data couldn't be read.
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.onImageError_ = function() {
  goog.log.info(this.logger_, 'Image load failed: ' + this.id_);
  this.dispatchEvent(new apps.uploader.ImageProcessorEvent(
      apps.uploader.ImageProcessorEvent.Type.ERROR, this));
};


/**
 * Sends an event stating that all requested processing has been completed.
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.sendCompletedEvent_ = function() {
  // Remove the reference to the blob so it can be garbage collected.
  this.blob_ = null;
  this.dispatchEvent(new apps.uploader.ImageProcessorEvent(
      apps.uploader.ImageProcessorEvent.Type.COMPLETED, this));
};


/**
 * Sets the canvas member variable to a Canvas with the current image drawn into
 * it, resized down to the dimensions specified in the downsampling options.
 * Assumes the image has already been loaded, otherwise this will fail.
 * @return {!goog.async.Deferred} Success if the canvas initialized and resized
 *     the image without error.
 * @private
 */
apps.uploader.ImageProcessor.Item.prototype.initializeCanvas_ = function() {
  goog.log.info(this.logger_, 'initializeCanvas_ started: ' + this.id_);

  var targetSize = new goog.math.Size(this.imgEl_.width, this.imgEl_.height);
  if (this.options_.hasSize() &&
      !targetSize.fitsInside(
          /** @type {!goog.math.Size} */ (this.options_.getSize()))) {
    targetSize.scaleToFit(
        /** @type {!goog.math.Size} */ (this.options_.getSize())).round();
    this.dimensionsChanged_ = true;
  }
  if (this.options_.hasResizeFunction()) {
    var newSize = this.options_.getResizeFunction()(targetSize);
    this.dimensionsChanged_ = !goog.math.Size.equals(newSize, targetSize);
    targetSize = newSize;
  }

  var canvasEl = /** @type {!HTMLCanvasElement} */
      (document.createElement('canvas'));
  canvasEl.width = targetSize.width;
  canvasEl.height = targetSize.height;
  var resizer;
  if (this.options_.getDownsamplingMethod() ==
      apps.uploader.ImageProcessorOptions.DownsamplingMethod.AFFINE_GAMMA) {
    resizer = new apps.photos.processing.agresizer.AGResizer();
  } else {
    resizer = new apps.photos.processing.resizer.CanvasResizer();
  }
  var result = resizer.resizeImageToCanvas(this.imgEl_, canvasEl,
      this.id_);
  result.addCallback(function() {
    // URL syntax is data:[<MIME-type>][;charset=<encoding>][;base64],<data>.
    // See {@link http://en.wikipedia.org/wiki/Data_URI_scheme}.
    this.dataUrl_ = /** @type {!Element} */ (canvasEl).
        toDataURL('image/jpeg', this.options_.getQuality() / 100);
    this.size_ = targetSize;
  }, this);
  result.addErrback(function() {
    // Mark the dimensions as not having successfully changed.
    this.dimensionsChanged_ = false;
  }, this);
  return result;
};


/**
 * Returns the final size of the downsampled image, if it could be downsampled.
 * @return {!goog.math.Size|undefined} The downsampled image size.
 */
apps.uploader.ImageProcessor.Item.prototype.getSize = function() {
  return this.size_;
};


/**
 * Returns a data URL for the downsampled image.  E.g. a "data:..." string that
 * you can put into an img src="" tag to render it immediately on the client-
 * side.  If you receive a ImageProcessorEvent.Type.COMPLETED from this item,
 * the data URL is guaranteed to be set.  Before you receive COMPLETED, or if
 * you instead receive ERROR, this method returns undefined.
 * @return {string|undefined} The data URL.
 */
apps.uploader.ImageProcessor.Item.prototype.getDataUrl = function() {
  return this.dataUrl_;
};


/**
 * Returns a Blob of the bytes of the downsampled image, retaining EXIF data
 * if requested and it was possible to read it.
 * @return {Blob} A Blob, if possible.
 */
apps.uploader.ImageProcessor.Item.prototype.getBlob = function() {
  goog.log.info(this.logger_, 'getBlob started: ' + this.id_);

  // If the caller asked us to preserve EXIF data, but we didn't downsample the
  // image because it was already small enough, calling this method would lose
  // the EXIF data and potentially copyright information.  Therefore be
  // extremely defensive and throw if EXIF data could be lost.  Callers should
  // be sure to only call .getBlob() if this.getDimensionsChanged() returned
  // true.
  if (this.options_.isPreserveExif() && !this.dimensionsChanged_) {
    goog.asserts.fail(
        'You asked us to preserve EXIF data, but this method would lose them.');
  }

  if (this.dataUrl_ && this.dataUrl_.substr(0, 5) == 'data:') {
    var dataStart = this.dataUrl_.indexOf(',');
    if (dataStart > 0) {
      var params = this.dataUrl_.substr(5, dataStart - 5).split(';');
      var data = this.dataUrl_.substr(dataStart + 1); // Don't include comma.
      var contentType = params[0] || 'application/octet-stream';

      // Note, mime-type parameters always have "=" in them, so we can
      // unambiguously differentiate them from "base64".
      if (params[params.length - 1] === 'base64') {
        data = window.atob(data);
      }

      try {
        return apps.uploader.ExifHelper.CreateBlobWithNewHeader(contentType,
            data, this.exifHeader_);
      } catch (x) {
        goog.log.info(this.logger_,
            'blobFromData_ failed: ' + this.id_ + ': ' + x);
      }
    }
  }
  return null;
};


/**
 * Returns true if this image's dimensions changed due to the processing.  If
 * the image was smaller than the size specified in the processor options, this
 * method will return false.
 * @return {boolean} True, if processing changed the image's dimensions.
 */
apps.uploader.ImageProcessor.Item.prototype.getDimensionsChanged = function() {
  return this.dimensionsChanged_;
};


/** @override */
apps.uploader.ImageProcessor.Item.prototype.disposeInternal = function() {
  var imgEl = this.imgEl_;
  var url = imgEl.src;
  imgEl.onload = imgEl.onerror = null;
  goog.fs.revokeObjectUrl(url);

  delete this.options_;
  delete this.imgEl_;
  delete this.dataUrl_;
  delete this.exifHeader_;
};
