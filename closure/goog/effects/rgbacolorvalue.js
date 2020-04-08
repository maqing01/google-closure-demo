goog.provide('office.effects.RgbaColorValue');



/**
 * A class for representing RGBA colors.
 * @param {number} red A number in the closed range [0, 255].
 * @param {number} green A number in the closed range [0, 255].
 * @param {number} blue A number in the closed range [0, 255].
 * @param {number} alpha A number in the closed range [0, 1].
 * @constructor
 * @struct
 * @final
 * @throws {Error} if channel values are outside of their valid range.
 */
office.effects.RgbaColorValue = function(red, green, blue, alpha) {
  if (red < 0 || red > 255) {
    throw Error('Invalid red channel value ' + red);
  }
  if (green < 0 || green > 255) {
    throw Error('Invalid green channel value ' + green);
  }
  if (blue < 0 || blue > 255) {
    throw Error('Invalid blue channel value ' + blue);
  }
  if (alpha < 0 || alpha > 1) {
    throw Error('Invalid alpha channel value ' + alpha);
  }

  /** @private {number} */
  this.red_ = red;

  /** @private {number} */
  this.green_ = green;

  /** @private {number} */
  this.blue_ = blue;

  /** @private {number} */
  this.alpha_ = alpha;
};


/** @return {number} The red value as a number between 0 and 255. */
office.effects.RgbaColorValue.prototype.getRed = function() {
  return this.red_;
};


/** @return {number} The green value as a number between 0 and 255. */
office.effects.RgbaColorValue.prototype.getGreen = function() {
  return this.green_;
};


/** @return {number} The blue value as a number between 0 and 255. */
office.effects.RgbaColorValue.prototype.getBlue = function() {
  return this.blue_;
};


/** @return {number} The alpha value as a number between 0 and 1. */
office.effects.RgbaColorValue.prototype.getAlpha = function() {
  return this.alpha_;
};
