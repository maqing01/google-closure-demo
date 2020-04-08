goog.provide('office.effects.ColorStop');



/**
 * A color positioned between 0 and 1.
 * @param {!office.effects.RgbaColorValue} colorValue
 * @param {number} position
 * @constructor
 * @struct
 * @final
 * @throws {Error} if position is less than 0 or greater than 1.
 */
office.effects.ColorStop = function(colorValue, position) {
  if (position < 0 || position > 1) {
    throw Error('Invalid color stop position ' + position);
  }

  /** @private {!office.effects.RgbaColorValue} */
  this.colorValue_ = colorValue;

  /** @private {number} */
  this.position_ = position;
};


/** @return {!office.effects.RgbaColorValue} */
office.effects.ColorStop.prototype.getColorValue = function() {
  return this.colorValue_;
};


/** @return {number} */
office.effects.ColorStop.prototype.getPosition = function() {
  return this.position_;
};


/**
 * Compares the position of the given color stops, returns a value less than 0
 * if color stop 1 is less than color stop 2, 0 if they or equal, or a value
 * greater than 0 if color stop 1 is greater than color stop 2.
 * @param {!office.effects.ColorStop} colorStop1
 * @param {!office.effects.ColorStop} colorStop2
 * @return {number}
 */
office.effects.ColorStop.comparePosition = function(colorStop1, colorStop2) {
  return colorStop1.getPosition() - colorStop2.getPosition();
};
