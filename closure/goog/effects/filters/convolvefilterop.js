goog.provide('office.effects.filters.ConvolveFilterOp');

goog.require('office.effects.filters.FilterOp');



/**
 * A filter primitive for performing image convolution.
 *
 * @param {!office.effects.filters.Kernel} kernel The convolution kernel.
 * @param {office.effects.filters.ConvolveFilterOp.EdgeMode} edgeMode The edge
 *     mode for how to handle pixels at the edge of the image.
 * @param {boolean} preserveAlpha Whether to preserve or convolve alpha when
 *     applying the filter.
 * @constructor
 * @struct
 * @extends {office.effects.filters.FilterOp}
 * @final
 */
office.effects.filters.ConvolveFilterOp =
    function(kernel, edgeMode, preserveAlpha) {
  goog.base(this, office.effects.filters.FilterOp.Type.CONVOLVE);

  /** @private {!office.effects.filters.Kernel} */
  this.kernel_ = kernel;

  /** @private {office.effects.filters.ConvolveFilterOp.EdgeMode} */
  this.edgeMode_ = edgeMode;

  /** @private {boolean} */
  this.preserveAlpha_ = preserveAlpha;
};
goog.inherits(office.effects.filters.ConvolveFilterOp,
    office.effects.filters.FilterOp);


/**
 * Edge mode for the convolution determines how to handle pixels at the edge of
 * the image.
 * @see http://www.w3.org/TR/SVG11/filters.html#feConvolveMatrixElementEdgeModeAttribute
 * @enum {string}
 */
office.effects.filters.ConvolveFilterOp.EdgeMode = {
  /**
   * DUPLICATE indicates that the input image is extended along each of its
   * borders as necessary by duplicating the color values at the given edge of
   * the input image.
   */
  DUPLICATE: 'duplicate',

  /**
   * NONE indicates that the input image is extended with pixel values of zero
   * for R, G, B and A.
   */
  NONE: 'none',

  /**
   * WRAP indicates that the input image is extended by taking the color values
   * from the opposite edge of the image.
   */
  WRAP: 'wrap'
};


/** @return {!office.effects.filters.Kernel} */
office.effects.filters.ConvolveFilterOp.prototype.getKernel = function() {
  return this.kernel_;
};


/** @return {office.effects.filters.ConvolveFilterOp.EdgeMode} */
office.effects.filters.ConvolveFilterOp.prototype.getEdgeMode = function() {
  return this.edgeMode_;
};


/** @return {boolean} */
office.effects.filters.ConvolveFilterOp.prototype.getPreserveAlpha = function() {
  return this.preserveAlpha_;
};
