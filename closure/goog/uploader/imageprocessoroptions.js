

/**
 * @fileoverview Configuration bean for client-side downsampling of images to
 * upload.  Specifies the resolution, smallest image to consider, and
 * downsampling quality for downsampling-enabled uploaders to use.
 *
 * @author jonemerson@google.com (Jon Emerson)
 */

goog.provide('apps.uploader.ImageProcessorOptions');

goog.require('goog.math.Size');



/**
 * Configuration bean for client-side downsampling of images to upload.  Default
 * values are the resolution and quality that Google+ would apply to images,
 * with a minimum file size of 50k.
 * @constructor
 */
apps.uploader.ImageProcessorOptions = function() {
};


/**
 * Enum for downsampling methods.
 * @enum {number}
 */
apps.uploader.ImageProcessorOptions.DownsamplingMethod = {
  CANVAS: 0,
  AFFINE_GAMMA: 1
};


/**
 * A number from 0 to 100 specifying the JPEG quality to use when recompressing
 * the downsampled image.  Defaults to 90.
 * @type {number}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.quality_ = 90;


/**
 * Whether the EXIF and other APP1 and APP12 data inside images should be
 * preserved on the resulting image.  Very important for downsampling, since it
 * preserves copyright information, but not useful for generating client-side
 * only previews.  Defaults to true.
 * @type {boolean}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.preserveExif_ = true;


/**
 * The resize function to use to determine the size the image should be resized
 * to. This is an optional variable that allows callers to set a more specific
 * resizing algorithm.
 * @type {function(!goog.math.Size):!goog.math.Size|undefined}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.resizeFunction_;


/**
 * Method to use to downsample images that are bigger than the required
 * dimensions.
 * @type {apps.uploader.ImageProcessorOptions.DownsamplingMethod}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.downsamplingMethod_ =
    apps.uploader.ImageProcessorOptions.DownsamplingMethod.CANVAS;


/**
 * The dimensions to which the downsampled image must fit into.  E.g. if set
 * to 1600x1200, and a 3200x2000 image is passed in to the image processor,
 * the image would be downsampled to 1600x1000.  Defaults to undefined so that
 * the image processor options will not resize by default.
 * @type {!goog.math.Size|undefined}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.size_;


/**
 * Specifies if the image processor should enable the color profile fix.
 * Defaults to false.
 * @type {boolean}
 * @private
 */
apps.uploader.ImageProcessorOptions.prototype.photosColorProfileFixEnabled_ =
    false;


/**
 * Returns the largest allowed size for the downsampled image. Returns undefined
 * if the size has not been set.
 * @return {!goog.math.Size|undefined} Largest allowed size.
 */
apps.uploader.ImageProcessorOptions.prototype.getSize = function() {
  return this.size_;
};


/**
 * Sets the largest allowed size for the downsampled image.
 * @param {!goog.math.Size|number} size The size to set, or a width.
 * @param {number=} opt_height The height, if the first parameter was a number.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 * @throws {Error} if the resize function has already been set. The resize
 *      process should only depend on the size OR the resize function.
 */
apps.uploader.ImageProcessorOptions.prototype.setSize =
    function(size, opt_height) {
  if (!!this.resizeFunction_) {
    // Resize function has already been set. Cannot set size and resize
    // function.
    throw new Error();
  }
  this.size_ = goog.isNumber(size) ?
      new goog.math.Size(/** @type {number} */ (size),
          opt_height || /** @type {number} */ (size)) :
      size;
  return this;
};


/**
 * Returns if the size has been set or not.
 * @return {boolean} True if the size has been set.
 */
apps.uploader.ImageProcessorOptions.prototype.hasSize = function() {
  return !!this.size_;
};


/**
 * A number from 0 to 100 specifying the JPEG quality to use when recompressing
 * the downsampled image.
 * @return {number} JPEG quality.
 */
apps.uploader.ImageProcessorOptions.prototype.getQuality = function() {
  return this.quality_;
};


/**
 * Sets the JPEG quality to use when downsampling images.
 * @param {number} quality A number from 0 to 100 specifying the JPEG quality.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 */
apps.uploader.ImageProcessorOptions.prototype.setQuality = function(quality) {
  this.quality_ = quality;
  return this;
};


/**
 * Sets the state of the flag to enable the color profile fix.
 * @param {boolean} enable The boolean value of the flag.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 */
apps.uploader.ImageProcessorOptions.prototype.setPhotosColorProfileFixEnabled =
    function(enable) {
  this.photosColorProfileFixEnabled_ = enable;
  return this;
};


/**
 * Sets the resize function to determine the size the images must be resized to.
 * Used for custom resizing algorithms.
 * @param {function(!goog.math.Size):!goog.math.Size} func The resize function.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 * @throws {Error} if the size has already been set. The resizing process should
 *      depend on only the size Or the resize function, not both.
 */
apps.uploader.ImageProcessorOptions.prototype.setResizeFunction =
    function(func) {
  if (!!this.size_) {
    // Size has already been set. Cannot set size and resize function.
    throw new Error();
  }
  this.resizeFunction_ = func;
  return this;
};


/**
 * Returns true if the resize function has been set.
 * @return {boolean} True if the resize function has been set.
 */
apps.uploader.ImageProcessorOptions.prototype.hasResizeFunction = function() {
  return !!this.resizeFunction_;
};


/**
 * Returns the resize function from the image processor options.
 * @return {function(!goog.math.Size):!goog.math.Size|undefined} The resize
 *     function from the options.
 */
apps.uploader.ImageProcessorOptions.prototype.getResizeFunction = function() {
  return this.resizeFunction_;
};


/**
 * Returns whether the EXIF and other APP1 and APP12 data inside images should
 * be preserved on the resulting image.
 * @return {boolean} Whether to preserve EXIF information.
 */
apps.uploader.ImageProcessorOptions.prototype.isPreserveExif = function() {
  return this.preserveExif_;
};


/**
 * Sets whether the EXIF and other APP1 and APP12 data inside images should be
 * preserved on the resulting image.
 * @param {boolean} preserveExif Whether EXIF data should be preserved.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 */
apps.uploader.ImageProcessorOptions.prototype.setPreserveExif =
    function(preserveExif) {
  this.preserveExif_ = preserveExif;
  return this;
};


/**
 * Returns method to use for downsampling images that are bigger than the
 * required dimensions.
 * @return {apps.uploader.ImageProcessorOptions.DownsamplingMethod} Downsampling
 *     method.
 */
apps.uploader.ImageProcessorOptions.prototype.getDownsamplingMethod =
    function() {
  return this.downsamplingMethod_;
};


/**
 * Sets method to use for downsampling images that are bigger than the
 * required dimensions.
 * @param {apps.uploader.ImageProcessorOptions.DownsamplingMethod}
 *     downsamplingMethod Downsampling method.
 * @return {!apps.uploader.ImageProcessorOptions} Pointer to this.
 */
apps.uploader.ImageProcessorOptions.prototype.setDownsamplingMethod =
    function(downsamplingMethod) {
  this.downsamplingMethod_ = downsamplingMethod;
  return this;
};
