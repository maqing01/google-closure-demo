goog.provide('office.effects.filters.BezierCurveValueProvider');

goog.require('goog.math');



/**
 * A class for flattening a bezier curve into an array of values.
 * @param {!goog.math.Bezier} curve
 * @constructor
 * @struct
 * @final
 */
office.effects.filters.BezierCurveValueProvider = function(curve) {
  if (curve.x0 >= curve.x3) {
    throw Error(
        'The X value of the start point must be less than the endpoint.');
  }
  /** @private {!goog.math.Bezier} */
  this.curve_ = curve;
};


/**
 * Returns an array of numbers, corresponding to {@code numValues - 1} segments
 * Y values along the curve. The first value is always the start point Y
 * value. If {@code numValues} is greater than one, then the last value is the
 * end point Y value. All values will be clamped between 0 and 1. If the curve's
 * start point X value is greater than 0, then the start point Y value will be
 * used for all values between 0 and the start point X value, the same is true
 * for values between the end point X value and 1.
 * @param {number} numValues The number of values to extract from the curve.
 * @return {!Array.<number>}
 * @throws {Error} If {@code numValues} is less than 0.
 */
office.effects.filters.BezierCurveValueProvider.prototype.getValuesFromCurve =
    function(numValues) {
  if (numValues < 0) {
    throw Error('Invalid value for numValues ' + numValues);
  } else if (numValues == 0) {
    return [];
  }

  var values = [];
  var numSegments = numValues - 1;
  var segmentWidth = numSegments >= 1 ? 1 / numSegments : 0;
  for (var i = 0; i < numValues; i++) {
    var x = segmentWidth * i;
    values.push(goog.math.clamp(this.getYValueForXValue_(x), 0, 1));
  }

  return values;
};


/**
 * @param {number} x
 * @return {number} The Y value on the curve for the given X value.
 * @private
 */
office.effects.filters.BezierCurveValueProvider.prototype.getYValueForXValue_ =
    function(x) {
  if (x <= this.curve_.x0) {
    return this.curve_.y0;
  } else if (x >= this.curve_.x3) {
    return this.curve_.y3;
  }
  return this.curve_.solveYValueFromXValue(x);
};
