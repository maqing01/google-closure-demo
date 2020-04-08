
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
 * and timeouts.
 */

goog.provide('wireless.fx.TimeoutMomentum');

goog.require('goog.math.Coordinate');
goog.require('wireless.fx.Momentum');
goog.require('wireless.fx.MomentumDelegate');
goog.require('wireless.fx.TransitionTimingFunction');



/**
 * @constructor
 * @implements {wireless.fx.Momentum}
 */
wireless.fx.TimeoutMomentum = function() {

  /**
   * @type {function()}
   * @private
   */
  this.stepFunction_ = goog.bind(this.step_, this);

  /**
   * The bouncing state for the y direction.
   * @type {wireless.fx.TimeoutMomentum.BouncingState}
   * @private
   */
  this.bouncingStateY_ = wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING;

  /**
   * The bouncing state for the x direction.
   * @type {wireless.fx.TimeoutMomentum.BouncingState}
   * @private
   */
  this.bouncingStateX_ = wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING;
};


/**
 * The bouncing states.
 * @enum {number}
 */
wireless.fx.TimeoutMomentum.BouncingState = {
  // The position is between the min and max range.
  NOT_BOUNCING: 0,
  // The position is outside the allowable range but velocity hasn't change
  // directions.
  BOUNCING_AWAY: 1,
  // The position is outside the allowable range and velocity has changed
  // directions.
  BOUNCING_BACK: 2
};


/**
 * The number of frames per second the animation should run at.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.FRAMES_PER_SECOND_ = 60;


/**
 * The spring coefficient for when the element has passed a boundary and is
 * decelerating to change direction and bounce back. Each frame, the velocity
 * will be changed by x times this coefficient, where x is the current stretch
 * value of the element from its boundary. This will end when velocity reaches
 * zero.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.PRE_BOUNCE_COEFFICIENT_ = 7 /
    wireless.fx.TimeoutMomentum.FRAMES_PER_SECOND_;


/**
 * The spring coefficient for when the element is bouncing back from a stretched
 * offset to a min or max position. Each frame, the velocity will be changed to
 * x times this coefficient, where x is the current stretch value of the element
 * from its boundary. This will end when the stretch value reaches 0.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.POST_BOUNCE_COEFFICIENT_ = 7 /
    wireless.fx.TimeoutMomentum.FRAMES_PER_SECOND_;


/**
 * The number of milliseconds per animation frame.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.MS_PER_FRAME_ = 1000 /
    wireless.fx.TimeoutMomentum.FRAMES_PER_SECOND_;


/**
 * The constant factor applied to velocity at each frame to simulate
 * deceleration.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.DECELERATION_FACTOR_ = 0.97;


/**
 * Minimum velocity required to start or continue deceleration, in pixels/frame.
 * This is equivalent to 0.25 px/ms.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.MIN_VELOCITY_ = 0.25 *
    wireless.fx.TimeoutMomentum.MS_PER_FRAME_;


/**
 * Minimum velocity during a step, in pixels/frame. This is equivalent to 0.01
 * px/ms.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_ = 0.01 *
    wireless.fx.TimeoutMomentum.MS_PER_FRAME_;


/**
 * Boost the initial velocity by a certain factor before applying momentum. This
 * just gives the momentum a better feel.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.INITIAL_VELOCITY_BOOST_FACTOR_ = 1.25;


/**
 * The minimum boundary for the element.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.minCoord_;


/**
 * The maximum boundary for the element.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.maxCoord_;


/**
 * The current offset of the element. These x, y values can be decimal values.
 * It is necessary to store these values for the sake of precision.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.currentOffset_;


/**
 * The previous offset of the element. These x, y values are whole numbers.
 * Their values are derived from rounding of the currentOffset_ member.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.previousOffset_;


/**
 * The next X offset being considered for animation. Will always be a whole
 * number.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.nextX_;


/**
 * The next y offset being considered for animation. Will always be a whole
 * number.
 * @type {number}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.nextY_;


/**
 * Current velocity of the element. In this class velocity is measured as
 * pixels per frame. That is, the number of pixels to move the element in the
 * next frame.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.velocity_;


/**
 * The pending queue of moves to execute. Each move consumes 3 spots in this
 * array. For each move, we push Time, X and Y, all of type number.
 * @type {!Array.<number>|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.moves_;


/**
 * The momentum delegate.
 * @type {!wireless.fx.MomentumDelegate|undefined}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.delegate_;


/**
 * Whether or not deceleration is currently in progress.
 * @type {boolean}
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.decelerating_;


/** @override */
wireless.fx.TimeoutMomentum.prototype.getStrategy = function() {
  return wireless.fx.Momentum.Strategy.TIMEOUTS;
};


/** @override */
wireless.fx.TimeoutMomentum.prototype.start = function(velocity,
    minCoord, maxCoord, initialOffset) {
  goog.asserts.assert(minCoord.x <= maxCoord.x,
      'Min should not be greater than max for minCoord.x: ' + minCoord.x +
      ' and maxCoord.x: ' + maxCoord.x);
  goog.asserts.assert(minCoord.y <= maxCoord.y,
      'Min should not be greater than max for minCoord.y: ' + minCoord.y +
      ' and maxCoord.y: ' + maxCoord.y);
  this.minCoord_ = minCoord;
  this.maxCoord_ = maxCoord;
  this.currentOffset_ = initialOffset.clone();
  this.previousOffset_ = initialOffset.clone();
  this.velocity_ = this.adjustInitialVelocityAndBouncingState_(velocity);

  // First check if velocity is above start threshold.
  if (this.isVelocityAboveThreshold_(
      wireless.fx.TimeoutMomentum.MIN_VELOCITY_) ||
      this.bouncingStateX_ || this.bouncingStateY_) {
    this.moves_ = this.calculateMoves_();

    // Check if there are actually moves to process.
    if (this.moves_.length) {
      var firstTime = this.moves_[0];
      this.stepTimeout_ = window.setTimeout(this.stepFunction_,
          firstTime - goog.now());
      this.decelerating_ = true;
      return true;
    }
  }
};


/** @override */
wireless.fx.TimeoutMomentum.prototype.onTransitionEnd =
    goog.nullFunction;


/** @override */
wireless.fx.TimeoutMomentum.prototype.stop = function() {
  this.decelerating_ = false;
  this.moves_ = [];
  window.clearTimeout(this.stepTimeout_);
  this.delegate_.onDecelerationEnd();
};


/** @override */
wireless.fx.TimeoutMomentum.prototype.isDecelerating = function() {
  return this.decelerating_;
};


/** @override */
wireless.fx.TimeoutMomentum.prototype.setMomentumDelegate =
    function(delegate) {
  this.delegate_ = delegate;
};


/**
 * Calculate the moves for the deceleration motion.
 * @return {!Array.<number>} The moves.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.calculateMoves_ = function() {
  var moves = [];
  var time = goog.now();

  // This loop will iterate once for each move that is generated.
  while (true) {
    // This loop iterates once for each frame. It is not necessary for a move to
    // be generated for each frame.
    do {
      this.stepWithoutAnimation_();
      time += wireless.fx.TimeoutMomentum.MS_PER_FRAME_;
    } while (!this.isStepNecessary_() && this.isVelocityAboveThreshold_(
        wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_))

    // This condition checks if deceleration is over.
    if (this.bouncingStateX_ ==
            wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING &&
        this.bouncingStateY_ ==
            wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING &&
        !this.isStepNecessary_()) {
      break;
    }

    // Add new move to the queue.
    moves.push(time, this.nextX_, this.nextY_);

    goog.asserts.assert(moves.length < 1000000,
        'Too many moves created, probably in an infinite loop.');

    this.previousOffset_.y = this.nextY_;
    this.previousOffset_.x = this.nextX_;
  }

  return moves;
};


/**
 * Helper method to calculate the initial velocity for a specific direction.
 * @param {number} originalVelocity The velocity we are adjusting.
 * @param {number} offset The offset for this direction.
 * @param {number} min The min coordinate for this direction.
 * @param {number} max The max coordinate for this direction.
 * @return {number} The calculated velocity.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.
    adjustInitialVelocityForDirection_ = function(originalVelocity, offset, min,
        max) {
  // Convert from pixels/ms to pixels/frame
  var velocity = originalVelocity *
      wireless.fx.TimeoutMomentum.MS_PER_FRAME_ *
      wireless.fx.TimeoutMomentum.INITIAL_VELOCITY_BOOST_FACTOR_;

  // If the initial velocity is below the minimum threshold, it is possible
  // that we need to bounce back depending on where the element is.
  if (Math.abs(velocity) < wireless.fx.TimeoutMomentum.MIN_VELOCITY_) {
    // If either of these cases are true, then the element is outside of its
    // allowable region and we need to apply a bounce back acceleration to bring
    // it back to rest in its defined area.
    if (offset < min) {
      velocity = (min - offset) *
          wireless.fx.TimeoutMomentum.POST_BOUNCE_COEFFICIENT_;
      velocity = Math.max(velocity,
          wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_);
    } else if (offset > max) {
      velocity = (offset - max) *
          wireless.fx.TimeoutMomentum.POST_BOUNCE_COEFFICIENT_;
      velocity = -Math.max(velocity,
          wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_);
    }
  }

  return velocity;
};


/**
 * Helper method to calculate initial velocity.
 * @param {!goog.math.Coordinate} velocity The initial velocity. The velocity
 *     passed here should be in terms of number of pixels / millisecond.
 * @return {!goog.math.Coordinate} The adjusted x and y velocities.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.adjustInitialVelocityAndBouncingState_ =
    function(velocity) {
  var newVelocityX = this.adjustInitialVelocityForDirection_(velocity.x,
      this.currentOffset_.x, this.minCoord_.x, this.maxCoord_.x);
  if (newVelocityX * velocity.x < 0 || (!velocity.x && newVelocityX)) {
    this.bouncingStateX_ =
        wireless.fx.TimeoutMomentum.BouncingState.BOUNCING_BACK;
  }
  var newVelocityY = this.adjustInitialVelocityForDirection_(velocity.y,
      this.currentOffset_.y, this.minCoord_.y, this.maxCoord_.y);
  if (newVelocityY * velocity.y < 0 || (!velocity.y && newVelocityY)) {
    this.bouncingStateY_ =
        wireless.fx.TimeoutMomentum.BouncingState.BOUNCING_BACK;
  }

  return new goog.math.Coordinate(newVelocityX, newVelocityY);
};


/**
 * Checks whether or not an animation step is necessary or not. Animations steps
 * are not necessary when the velocity gets so low that in several frames the
 * offset is the same.
 * @return {boolean} True if there is movement to be done in the next frame.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.isStepNecessary_ = function() {
  return this.nextY_ != this.previousOffset_.y ||
      this.nextX_ != this.previousOffset_.x;
};


/**
 * Apply deceleration to a specifc direction.
 * @param {number} offset The offset for this direction.
 * @param {number} min The min coordinate for this direction.
 * @param {number} max The max coordinate for this direction.
 * @param {number} velocity The velocity for this direction.
 * @param {wireless.fx.TimeoutMomentum.BouncingState} bouncingState The bouncing
 *     state for this direction.
 * @param {boolean} vertical Whether or not the direction is vertical.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.adjustVelocityComponent_ =
    function(offset, min, max, velocity, bouncingState, vertical) {
  // It is common for either horizontal or vertical scrolling to be disabled so
  // in these cases we want to avoid needless calculations.
  if (!velocity) {
    return;
  }

  var speed = Math.abs(velocity);

  // Apply the deceleration factor.
  velocity *= wireless.fx.TimeoutMomentum.DECELERATION_FACTOR_;

  // We make special adjustments to the velocity if the element is outside of
  // its region.
  if (offset < min) {
    var stretchDistance = min - offset;
  } else if (offset > max) {
    stretchDistance = max - offset;
  }

  // If stretchDistance has a value then we are either bouncing or bouncing
  // back.
  if (stretchDistance) {
    // If our adjustment is in the opposite direction of our velocity then we
    // are still trying to turn around. Else we are bouncing back.
    if (stretchDistance * velocity < 0) {
      bouncingState = bouncingState ==
          wireless.fx.TimeoutMomentum.BouncingState.BOUNCING_BACK ?
              wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING :
          wireless.fx.TimeoutMomentum.BouncingState.BOUNCING_AWAY;
      velocity += stretchDistance *
          wireless.fx.TimeoutMomentum.PRE_BOUNCE_COEFFICIENT_;
    } else {
      bouncingState = wireless.fx.TimeoutMomentum.BouncingState.BOUNCING_BACK;
      velocity = stretchDistance > 0 ? Math.max(stretchDistance *
          wireless.fx.TimeoutMomentum.POST_BOUNCE_COEFFICIENT_,
          wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_) :
              Math.min(stretchDistance *
                  wireless.fx.TimeoutMomentum.POST_BOUNCE_COEFFICIENT_,
                  -wireless.fx.TimeoutMomentum.MIN_STEP_VELOCITY_);
    }
  } else {
    bouncingState = wireless.fx.TimeoutMomentum.BouncingState.NOT_BOUNCING;
  }

  if (vertical) {
    this.velocity_.y = velocity;
    this.bouncingStateY_ = bouncingState;
  } else {
    this.velocity_.x = velocity;
    this.bouncingStateX_ = bouncingState;
  }
};


/**
 * Decelerate the current velocity.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.adjustVelocity_ = function() {
  this.adjustVelocityComponent_(this.currentOffset_.x, this.minCoord_.x,
      this.maxCoord_.x, this.velocity_.x, this.bouncingStateX_,
      false /** vertical */);
  this.adjustVelocityComponent_(this.currentOffset_.y, this.minCoord_.y,
      this.maxCoord_.y, this.velocity_.y, this.bouncingStateY_,
      true /** vertical */);
};


/**
 * Update the x, y values of the element offset without actually moving the
 * element. This is done because we store decimal values for x, y for precision,
 * but moving is only required when the offset is changed by at least a whole
 * integer.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.stepWithoutAnimation_ =
    function() {
  this.currentOffset_.y += this.velocity_.y;
  this.currentOffset_.x += this.velocity_.x;
  this.nextY_ = Math.round(this.currentOffset_.y);
  this.nextX_ = Math.round(this.currentOffset_.x);

  this.adjustVelocity_();
};


/**
 * Calculate the next offset of the element and animate it to that position.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.step_ = function() {
  if (this.moves_.length) {
    var step = this.moves_.splice(0, 3);
    var time = step[0];
    var x = step[1];
    var y = step[2];
    this.delegate_.onDecelerate(x, y);

    if (this.moves_.length) {
      var nextTime = this.moves_[0];
      var duration = nextTime - goog.now();
      this.stepTimeout_ = window.setTimeout(this.stepFunction_, duration);
    } else {
      this.stop();
    }
  }
};


/**
 * Whether or not the current velocity is above the threshold required to
 * continue decelerating. Once both the x and y velocity fall below the
 * threshold, the element should stop moving entirely.
 * @param {number} threshold The velocity threshold.
 * @return {boolean} True if the x or y velocity is still above the threshold.
 * @private
 */
wireless.fx.TimeoutMomentum.prototype.isVelocityAboveThreshold_ =
    function(threshold) {
  return Math.abs(this.velocity_.y) >= threshold ||
      Math.abs(this.velocity_.x) >= threshold;
};
