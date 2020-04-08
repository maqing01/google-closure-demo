
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
 * @fileoverview Implementation of a momentum strategy using webkit-transforms
 * and webkit-transition timing functions.
 */

goog.provide('wireless.fx.TransitionMomentum');

goog.require('goog.math');
goog.require('wireless.fx');
goog.require('wireless.fx.BezierPhysics')
goog.require('wireless.fx.Momentum');
goog.require('wireless.fx.MomentumDelegate');



/**
 * @constructor
 * @implements {wireless.fx.Momentum}
 */
wireless.fx.TransitionMomentum = function() {

  /**
   * Holds animation information. Each animation will take 4 spots in the array.
   * The spots will be for: x, y, duration, timingFunction.
   * @type {!Array}
   * @private
   */
  this.animations_ = [];
};


/**
 * Minimum velocity required to start deceleration.
 * Units are px/ms.
 * @type {number}
 * @private
 */
wireless.fx.TransitionMomentum.MIN_START_VELOCITY_ = 0.25;


/**
 * The time it takes to bounce back into place when the content's offset is out
 * of bounds. Units are in ms.
 * @type {number}
 */
wireless.fx.TransitionMomentum.BOUNCE_BACK_TIME = 500;


/**
 * The rate at which acceleration is applied to the element.
 * Units are (px/ms)/ms.
 * @type {number}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.acceleration_ = -0.0005;


/**
 * The momentum delegate.
 * @type {!wireless.fx.MomentumDelegate|undefined}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.delegate_;


/**
 * Whether or not deceleration is currently in progress.
 * @type {boolean}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.decelerating_;


/**
 * The last calculated time that an animation will take.
 * @type {number}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.calculatedTime_;


/**
 * The last calculated displacement of an animation.
 * @type {number}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.calculatedDisplacement_;


/**
 * The last calculated final velocity of an animation.
 * @type {number}
 * @private
 */
wireless.fx.TransitionMomentum.prototype.calculatedFinalVelocity_;


/** @override */
wireless.fx.TransitionMomentum.prototype.getStrategy = function() {
  return wireless.fx.Momentum.Strategy.TRANSITIONS;
};


/**
 * Sets the rate at which acceleration is applied to the element.
 * @param {number} acc Acceleration in (px/ms)/ms.
 */
wireless.fx.TransitionMomentum.prototype.setAcceleration = function(acc) {
  this.acceleration_ = acc;
};


/** @override */
wireless.fx.TransitionMomentum.prototype.start = function(velocity,
    minCoord, maxCoord, initialOffset) {
  goog.asserts.assert(minCoord.x <= maxCoord.x,
      'Min should not be greater than max for minCoord.x: ' + minCoord.x +
      ' and maxCoord.x: ' + maxCoord.x);
  goog.asserts.assert(minCoord.y <= maxCoord.y,
      'Min should not be greater than max for minCoord.y: ' + minCoord.y +
      ' and maxCoord.y: ' + maxCoord.y);
  // Determine if we should go vertically or horizontally.
  var vertical = Math.abs(velocity.y) >= Math.abs(velocity.x);
  // Store the velocity of the direction we will be animating.
  var vel = vertical ? velocity.y : velocity.x;

  // Get the min/max bounds for the direction we are scrolling.
  var min = vertical ? minCoord.y : minCoord.x;
  var max = vertical ? maxCoord.y : maxCoord.x;
  // Get the min/max bounds for the direction we are not scrolling in. We may
  // need to bring the element back within those bounds if they pulled out of
  // the scrollable region for that direction.
  var otherMin = vertical ? minCoord.x : minCoord.y;
  var otherMax = vertical ? maxCoord.x : maxCoord.y;

  var offset = vertical ? initialOffset.y : initialOffset.x;
  // Adjust the other offset if it is out of bounds.
  var otherOffset = goog.math.clamp(
      vertical ? initialOffset.x : initialOffset.y,
      otherMin, otherMax);

  if (offset < min || offset > max) {
    // Do a simple navigation of the element back into its boundaries.
    var boundaryValue = offset < min ? min : max;
    this.pushAnimation_(vertical, boundaryValue, otherOffset,
        wireless.fx.TransitionMomentum.BOUNCE_BACK_TIME,
        wireless.fx.TransitionTimingFunction.EASE_OUT);
  } else if (Math.abs(vel) >=
      wireless.fx.TransitionMomentum.MIN_START_VELOCITY_) {
    // Perform deceleration, and possible bounce out/back.
    var negative = vel < 0;
    var accelerationVector = negative ?
        -this.acceleration_ : this.acceleration_;
    var maximumDisplacement = negative ? (min - offset) : (max - offset);

    var finalVelocity = vel;
    if (maximumDisplacement) {
      // Calculate time, displacement, and final velocity given initial
      // velocity, acceleration, and max displacement.
      this.calculateMovement_(vel, accelerationVector,
          maximumDisplacement);

      // Compute timing function for the first animation.
      var timingFunction = this.getBezierHelper_(vel,
          this.calculatedFinalVelocity_, this.calculatedTime_,
          this.calculatedDisplacement_);

      this.pushAnimation_(vertical, offset + this.calculatedDisplacement_,
          otherOffset, this.calculatedTime_, timingFunction);

      finalVelocity = this.calculatedFinalVelocity_;
    }

    // If there is still velocity at the end of the first animation then this
    // means that we will be bouncing out and that we need to calculate two more
    // animations, the bounce out and the bounce back.
    if (finalVelocity != 0) {
      // The final position will either be the max boundary or the min.
      var finalPos = negative ? min : max;
      // Do a simple calculation of how far the bounce out should be based on
      // the final velocity.
      var displacement = finalVelocity * 50;
      var intermediatePos = finalPos + displacement;

      // Calculate the time required to come to rest given displacement and
      // initial velocity. Initial velocity here is the end velocity of the last
      // animation.
      this.calculateTimeFromVelocityAndDisplacement_(displacement,
          finalVelocity, 0);

      // Compute a new timing function for the bounce out.
      timingFunction = this.getBezierHelper_(finalVelocity, 0,
          this.calculatedTime_, displacement);
      this.pushAnimation_(vertical, intermediatePos, otherOffset,
          this.calculatedTime_, timingFunction);

      // Use a simple ease out transition for the third animation.
      this.pushAnimation_(vertical, finalPos, otherOffset,
          wireless.fx.TransitionMomentum.BOUNCE_BACK_TIME,
          wireless.fx.TransitionTimingFunction.EASE_OUT);
    }
  }

  if (this.animations_.length) {
    this.decelerating_ = true;
    this.doAnimation_();
    return true;
  }
};


/**
 * Get a cubic-bezier timing function in CSS string format.
 * See http://www.w3.org/TR/css3-transitions/#transition-timing-function .
 * @param {number} initialVelocity The initial velocity.
 * @param {number} finalVelocity The final velocity.
 * @param {number} totalTime The total time.
 * @param {number} totalDisplacement The total displacement.
 * @return {string} The string representation of the timing function.
 * @private
 */
wireless.fx.TransitionMomentum.prototype.getBezierHelper_ =
    function(initialVelocity, finalVelocity, totalTime, totalDisplacement) {
  var cubicBezier =
      wireless.fx.BezierPhysics.calculateCubicBezierFromKinematics(
      initialVelocity, finalVelocity, totalTime, totalDisplacement);
  return 'cubic-bezier(' + cubicBezier.join(',') + ')';
};


/**
 * Push an animation into the queue of animations.
 * @param {boolean} isVertical True if the animation is vertical.
 * @param {number} displacement Distance to animate in px.
 * @param {number} otherOffset Fixed offset of the element on the axes that we
 *      are not animating.
 * @param {number} duration Time to animate over in ms.
 * @param {string} timingFunction Timing function to use.
 * @private
 */
wireless.fx.TransitionMomentum.prototype.pushAnimation_ =
    function(isVertical, displacement, otherOffset, duration, timingFunction) {
  var x = isVertical ? otherOffset : displacement;
  var y = isVertical ? displacement : otherOffset;

  this.animations_.push(x, y, duration, timingFunction);
};


/**
 * Execute one animation.
 * @private
 */
wireless.fx.TransitionMomentum.prototype.doAnimation_ = function() {
  var animations = this.animations_;
  var x = animations.shift();
  var y = animations.shift();
  var duration = animations.shift();
  var timingFunction = animations.shift();
  this.delegate_.onDecelerate(x, y, duration, timingFunction);
};


/** @override */
wireless.fx.TransitionMomentum.prototype.onTransitionEnd = function() {
  if (!this.decelerating_) {
    return;
  }
  if (this.animations_.length) {
    this.doAnimation_();
  } else {
    this.decelerating_ = false;
    this.delegate_.onDecelerationEnd();
  }
};


/** @override */
wireless.fx.TransitionMomentum.prototype.stop = function() {
  this.decelerating_ = false;
  this.animations_ = [];

  this.delegate_.onDecelerationEnd();
};


/** @override */
wireless.fx.TransitionMomentum.prototype.isDecelerating = function() {
  return this.decelerating_;
};


/** @override */
wireless.fx.TransitionMomentum.prototype.setMomentumDelegate =
    function(delegate) {
  this.delegate_ = delegate;
};


/**
 * Calculate time and displacement of decelerating the element to rest.
 * If the element would reach the maximum displacement before coming to rest,
 * then we also calculate the final velocity at the maximum displacement.
 * @param {number} initialVelocity The initial signed velocity.
 * @param {number} acceleration The signed acceleration.
 * @param {number} maximumDisplacement The maximum allowable displacement.
 * @private
 */
wireless.fx.TransitionMomentum.prototype.calculateMovement_ =
    function(initialVelocity, acceleration, maximumDisplacement) {
  goog.asserts.assert(maximumDisplacement * initialVelocity > 0,
        'Displacement and initialVelocity must have same sign.');
  goog.asserts.assert(initialVelocity * acceleration < 0, 'Initial velocity' +
      ' must have the opposite sign of acceleration, and neither can be 0.');

  var velocitySquared = initialVelocity * initialVelocity;
  var accelerationDoubled = 2 * acceleration;
  var displacementToRest = -velocitySquared / accelerationDoubled;
  if (Math.abs(displacementToRest) < Math.abs(maximumDisplacement)) {
    var totalDisplacement = displacementToRest;
    var finalVelocity = 0;
  } else {
    totalDisplacement = maximumDisplacement;
    finalVelocity = Math.sqrt(
        velocitySquared + accelerationDoubled * totalDisplacement);
    finalVelocity *= initialVelocity < 0 ? -1 : 1;
  }

  var totalTime = (finalVelocity - initialVelocity) / acceleration;
  this.calculatedFinalVelocity_ = finalVelocity;
  this.calculatedTime_ = totalTime;
  this.calculatedDisplacement_ = totalDisplacement;
};


/**
 * Calculate time given displacement and delta velocity.
 * @param {number} displacement .
 * @param {number} initialVelocity .
 * @param {number} finalVelocity .
 * @private
 */
wireless.fx.TransitionMomentum.prototype.
    calculateTimeFromVelocityAndDisplacement_ = function(displacement,
        initialVelocity, finalVelocity) {
  this.calculatedTime_ = (displacement * 2) / (initialVelocity + finalVelocity);
};
