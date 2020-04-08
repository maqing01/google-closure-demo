goog.provide('office.effects.filters.ColorStopsValueProvider');

goog.require('office.effects.ColorStop');
goog.require('office.effects.RgbaColorValue');
goog.require('goog.array');
goog.require('goog.math');



/**
 * A class for converting an array of {@code office.effects.ColorStop} objects at
 * arbitrary positions between 0 and 1 into an array of 256 color values
 * defininng 255 interpolation regions. The color values are linearly
 * interpolated with respect to the position of the input color stops.
 * @param {!Array.<!office.effects.ColorStop>} colorStops
 * @constructor
 * @struct
 * @final
 */
office.effects.filters.ColorStopsValueProvider = function(colorStops) {
  office.effects.filters.ColorStopsValueProvider.validateColorStops_(colorStops);

  /** @private {!Array.<number>} */
  this.redValues_ = [];

  /** @private {!Array.<number>} */
  this.greenValues_ = [];

  /** @private {!Array.<number>} */
  this.blueValues_ = [];

  /** @private {!Array.<number>} */
  this.alphaValues_ = [];

  this.computeInterpolatedColorValues_(colorStops);
};


/** @private {number} */
office.effects.filters.ColorStopsValueProvider.COLORS_PER_CHANNEL_ = 256;


/**
 * Validates the given color stops are betwen 2 and 256 in length, begin at
 * position 0, end at position 1, and are sorted.
 * @param {!Array.<!office.effects.ColorStop>} colorStops
 * @private
 */
office.effects.filters.ColorStopsValueProvider.validateColorStops_ =
    function(colorStops) {
  var size = colorStops.length;
  var isSorted = goog.array.isSorted(colorStops,
      office.effects.ColorStop.comparePosition, true /* opt_strict */);
  if (size < 2 || size > 256 ||
      colorStops[0].getPosition() != 0 ||
      colorStops[size - 1].getPosition() != 1 ||
      !isSorted) {
    throw Error('Invalid color stops');
  }
};


/** @return {!Array.<number>} The interpolated red values. */
office.effects.filters.ColorStopsValueProvider.prototype.getRedValues =
    function() {
  return this.redValues_.concat();
};


/** @return {!Array.<number>} The interpolated green values. */
office.effects.filters.ColorStopsValueProvider.prototype.getGreenValues =
    function() {
  return this.greenValues_.concat();
};


/** @return {!Array.<number>} The interpolated blue values. */
office.effects.filters.ColorStopsValueProvider.prototype.getBlueValues =
    function() {
  return this.blueValues_.concat();
};


/** @return {!Array.<number>} The interpolated alpha values. */
office.effects.filters.ColorStopsValueProvider.prototype.getAlphaValues =
    function() {
  return this.alphaValues_.concat();
};


/**
 * Calculates the interpolated red, green, blue, and alpha values at all points
 * from 0 to 255 in the given array of color stops.
 * @param {!Array.<!office.effects.ColorStop>} colorStops
 * @private
 */
office.effects.filters.ColorStopsValueProvider.prototype.
    computeInterpolatedColorValues_ = function(colorStops) {
  var COLORS_PER_CHANNEL =
      office.effects.filters.ColorStopsValueProvider.COLORS_PER_CHANNEL_;

  for (var i = 0; i < COLORS_PER_CHANNEL; i++) {
    var positionInColorSpace = i / (COLORS_PER_CHANNEL - 1);
    while (positionInColorSpace > colorStops[1].getPosition()) {
      if (colorStops.length <= 2) {
        throw Error('No more color stop regions');
      }
      colorStops.shift();
    }
    var regionStart = colorStops[0].getPosition();
    var regionWidth = colorStops[1].getPosition() - regionStart;
    var positionInRegion = (positionInColorSpace - regionStart) / regionWidth;
    this.addColorValue_(
        office.effects.filters.ColorStopsValueProvider.interpolateColor_(
            colorStops[0].getColorValue(), colorStops[1].getColorValue(),
            positionInRegion));
  }
};


/**
 * Pushes the RGBA channel values from the given color onto this color value
 * provider's array of each channel value.
 * @param {!office.effects.RgbaColorValue} colorValue
 * @private
 */
office.effects.filters.ColorStopsValueProvider.prototype.addColorValue_ =
    function(colorValue) {
  this.redValues_.push(colorValue.getRed());
  this.greenValues_.push(colorValue.getGreen());
  this.blueValues_.push(colorValue.getBlue());
  this.alphaValues_.push(colorValue.getAlpha());
};


/**
 * Returns a new color interpolated at the given position between the given
 * colors.
 * @param {!office.effects.RgbaColorValue} color1
 * @param {!office.effects.RgbaColorValue} color2
 * @param {number} position A value in the range [0, 1].
 * @return {!office.effects.RgbaColorValue}
 * @private
 */
office.effects.filters.ColorStopsValueProvider.interpolateColor_ =
    function(color1, color2, position) {
  if (position < 0 || position > 1) {
    throw Error('Invalid position ' + position);
  }

  var red = goog.math.lerp(color1.getRed(), color2.getRed(), position);
  var green = goog.math.lerp(color1.getGreen(), color2.getGreen(), position);
  var blue = goog.math.lerp(color1.getBlue(), color2.getBlue(), position);
  var alpha = goog.math.lerp(color1.getAlpha(), color2.getAlpha(), position);

  return new office.effects.RgbaColorValue(red, green, blue, alpha);
};
