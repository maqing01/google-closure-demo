goog.provide('office.effects.filters.Kernel');



/**
 * A convolution kernel. The terminology used in this class is consistent with
 * the terms defined for convolution in SVG Filter Effects.
 * @see http://www.w3.org/TR/SVG11/filters.html#feConvolveMatrixElement
 * @param {!Array.<number>} values The kernel matrix values.
 * @param {number} orderX The width of the kernel.
 * @param {number} orderY The heigh of the kernel.
 * @param {number} targetX The position in X of the kernel relative to the
 *     target pixel.
 * @param {number} targetY The position in Y of the kernel relative to the
 *     target pixel.
 * @constructor
 * @struct
 * @final
 */
office.effects.filters.Kernel =
    function(values, orderX, orderY, targetX, targetY) {
  /** @private {!Array.<number>} */
  this.values_ = values.concat();

  /** @private {number} */
  this.orderX_ = orderX;

  /** @private {number} */
  this.orderY_ = orderY;

  /** @private {number} */
  this.targetX_ = targetX;

  /** @private {number} */
  this.targetY_ = targetY;
};


/** @return {!Array.<number>} */
office.effects.filters.Kernel.prototype.getValues = function() {
  return this.values_.concat();
};


/** @return {number} */
office.effects.filters.Kernel.prototype.getOrderX = function() {
  return this.orderX_;
};


/** @return {number} */
office.effects.filters.Kernel.prototype.getOrderY = function() {
  return this.orderY_;
};


/** @return {number} */
office.effects.filters.Kernel.prototype.getTargetX = function() {
  return this.targetX_;
};


/** @return {number} */
office.effects.filters.Kernel.prototype.getTargetY = function() {
  return this.targetY_;
};
