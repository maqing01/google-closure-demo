/** @fileoverview Utilities to work with the DOM. */

goog.provide('office.dom');

goog.require('goog.math');
goog.require('goog.style');


/**
 * CSS angle units as per the spec: http://dev.w3.org/csswg/css-values/#angles
 * @enum {string}
 * @private
 */
office.dom.AngleUnit_ = {
  DEGREE: 'deg',
  GRADIAN: 'grad',
  RADIAN: 'rad',
  TURN: 'turn'
};


/**
 * Sets the rotation of the element using a CSS transform.
 * @param {!Element} element
 * @param {number} rotation The rotation angle, in radians.
 */
office.dom.setRotation = function(element, rotation) {
  // Rotation can be a floating point number, so we round it.
  var precision = 100000;
  rotation = Math.round(rotation * precision) / precision;

  // Force GPU accelerated rendering in chrome by adding a z-index
  // translation of 0 to work around http://crbug/36902.
  var transform = 'rotate(' + rotation + 'rad) translateZ(0px)';
  element.style.transform = transform;
  element.style.webkitTransform = transform;
};


/**
 * Gets the rotation of the specified element in radians.
 * @param {!Element} element The element to measure.
 * @return {number} The rotation in radians.
 */
office.dom.getRotation = function(element) {
  var rotation = 0;
  var transformStyle = goog.style.getStyle(element, 'transform');
  var matches = transformStyle.match(/rotate\(([0-9.\-]+)(\D+)\)/);
  if (matches) {
    var value = parseFloat(matches[1]);
    var unit = matches[2];
    switch (unit) {
      case office.dom.AngleUnit_.DEGREE:
        rotation = goog.math.toRadians(value);
        break;
      case office.dom.AngleUnit_.RADIAN:
        rotation = value;
        break;
      case office.dom.AngleUnit_.TURN:
        rotation = goog.math.toRadians(value * 360);
        break;
      case office.dom.AngleUnit_.GRADIAN:
        rotation = goog.math.toRadians(value * (9 / 10));
    }
  }
  return rotation;
};
