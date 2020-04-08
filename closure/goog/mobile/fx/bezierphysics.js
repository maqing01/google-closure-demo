
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Functions to model constant acceleration as a cubic Bezier
 * curve (http://en.wikipedia.org/wiki/Bezier_curve). These functions are
 * intended to generate the transition timing function for CSS transitions.
 * Please see
 * http://www.w3.org/TR/css3-transitions/#transition-timing-function_tag .
 *
 * The main operation of computing a cubic Bezier is split up into multiple
 * functions so that, should it be required, more operations and cases can be
 * supported in the future.
 *
 *  Type up a doc for derivation of the math in this file.
 */

goog.provide('wireless.fx.BezierPhysics');

goog.require('goog.asserts');
goog.require('goog.math');



/**
 * @type {number}
 * @private
 */
wireless.fx.BezierPhysics.ONE_THIRD_ = 1 / 3;


/**
 * @type {number}
 * @private
 */
wireless.fx.BezierPhysics.TWO_THIRDS_ = 2 / 3;


/**
 * An array [x1, y1, x2, y2] of the intermediate control points of a cubic
 * bezier when the final velocity is zero. This is a special case for which
 * these control points are constants.
 *  Type up doc with proof/derivation.
 * @type {!Array.<number>}
 * @private
 */
wireless.fx.BezierPhysics.FINAL_VELOCITY_ZERO_BEZIER_ =
    [wireless.fx.BezierPhysics.ONE_THIRD_,
    wireless.fx.BezierPhysics.TWO_THIRDS_,
    wireless.fx.BezierPhysics.TWO_THIRDS_, 1];


/**
 * Given consistent kinematics parameters for constant acceleration, returns
 * the intermediate control points of the cubic Bezier curve that models the
 * motion. All input values must have correct signs.
 * @param {number} initialVelocity The initial velocity.
 * @param {number} finalVelocity The final velocity.
 * @param {number} totalTime The total time.
 * @param {number} totalDisplacement The total displacement.
 * @return {!Array.<number>} An array [x1, y1, x2, y2] representing the
 *     intermediate control points of the cubic Bezier.
 */
wireless.fx.BezierPhysics.calculateCubicBezierFromKinematics =
    function(initialVelocity, finalVelocity, totalTime, totalDisplacement) {
  goog.asserts.assert(!goog.math.nearlyEquals(totalTime, 0) && totalTime > 0,
      'Total time must be greater than 0');
  goog.asserts.assert(!goog.math.nearlyEquals(totalDisplacement, 0),
      'Total displacement must not be 0.');
  goog.asserts.assert(goog.math.nearlyEquals(
      totalDisplacement, (initialVelocity + finalVelocity) / 2.0 * totalTime),
      'Parameters must form a consistent constant acceleration model in ' +
      'Newtonian kinematics.');

  // Easy special case when final velocity is 0.
  if (goog.math.nearlyEquals(finalVelocity, 0)) {
    return wireless.fx.BezierPhysics.FINAL_VELOCITY_ZERO_BEZIER_;
  }

  var controlPoint = wireless.fx.BezierPhysics.tangentLinesToQuadraticBezier_(
      initialVelocity, finalVelocity, totalTime, totalDisplacement);
  controlPoint = wireless.fx.BezierPhysics.normalizeQuadraticBezier_(
      controlPoint[0], controlPoint[1], totalTime, totalDisplacement);
  return wireless.fx.BezierPhysics.quadraticToCubic_(
      controlPoint[0], controlPoint[1]);
};


/**
 * Given a quadratic curve crossing points (0, 0) and (x2, y2), calculates the
 * intermediate control point (x1, y1) of the equivalent quadratic Bezier
 * curve with starting point (0, 0) and ending point (x2, y2).
 * @param {number} m0 The slope of the line tangent to the curve at (0, 0).
 * @param {number} m2 The slope of the line tangent to the curve at a different
 *     point (x2, y2).
 * @param {number} x2 The x-coordinate of the other point on the curve.
 * @param {number} y2 The y-coordinate of the other point on the curve.
 * @return {!Array.<number>} An array [x1, y1] representing the intermediate
 *     control point of the quadratic Bezier.
 * @private
 */
wireless.fx.BezierPhysics.tangentLinesToQuadraticBezier_ =
    function(m0, m2, x2, y2) {
  // The intermediate control point (x1, y1) is found by calculating the point
  // of intersection of the lines tangent to the start and end points. See
  // http://en.wikipedia.org/wiki/Bezier_curve#Quadratic_B.C3.A9zier_curves

  if (goog.math.nearlyEquals(m0, m2)) {
    // The control points are collinear, so the curve is a straight line
    // segment. Return an arbitrary point on that curve.
    return [0, 0];
  }

  var x1 = (y2 - x2 * m2) / (m0 - m2);
  var y1 = x1 * m0;
  return [x1, y1];
};


/**
 * Normalizes a quadratic Bezier curve to have end point at (1, 1).
 * @param {number} x1 The x-coordinate of the intermediate control point.
 * @param {number} y1 The y-coordinate of the intermediate control point.
 * @param {number} x2 The x-coordinate of the end point.
 * @param {number} y2 The y-coordinate of the end point.
 * @return {!Array.<number>} An array [x1, y1] representing the intermediate
 *     control point.
 * @private
 */
wireless.fx.BezierPhysics.normalizeQuadraticBezier_ = function(x1, y1, x2, y2) {
  goog.asserts.assert(!goog.math.nearlyEquals(x2, 0) &&
      !goog.math.nearlyEquals(y2, 0),
      'The end point must not lie on any axes. x2 == ' + x2 + ' y2 == ' + y2);
  return [x1 / x2, y1 / y2];
};


/**
 * Converts a quadratic Bezier curve defined by the control points
 * (x0, y0) = (0, 0), (x1, y1) = (x, y), and (x2, y2) = (1, 1) into an
 * equivalent cubic Bezier curve with four control points. Note that the start
 * and end points will be unchanged.
 * @param {number} x The x-coordinate of the intermediate control point.
 * @param {number} y The y-coordinate of the intermediate control point.
 * @return {!Array.<number>} An array [x1, y1, x2, y2] containing the two
 *     intermediate points of the equivalent cubic Bezier curve.
 * @private
 */
wireless.fx.BezierPhysics.quadraticToCubic_ = function(x, y) {
  goog.asserts.assert(x >= 0 && x <= 1 && y >= 0 && y <= 1,
      'The intermediate control point must have coordinates within the ' +
      'interval [0,1].');

  //  Type up doc for derivation.
  var x1 = x * wireless.fx.BezierPhysics.TWO_THIRDS_;
  var y1 = y * wireless.fx.BezierPhysics.TWO_THIRDS_;
  var x2 = x1 + wireless.fx.BezierPhysics.ONE_THIRD_;
  var y2 = y1 + wireless.fx.BezierPhysics.ONE_THIRD_;
  return [x1, y1, x2, y2];
};
