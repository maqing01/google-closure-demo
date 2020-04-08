
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
 * @fileoverview Calculates the velocity associated with user drag events.
 *
 * This behavior will NOT perform the actual dragging (redrawing the element)
 * for you, this responsibility is left to the client code.
 *
 * The properties of the drag sequence are the horizontal and vertical drag
 * delta, defined as the horizontal/vertical difference of the start touch
 * position and the last touch position. The class also reports the end velocity
 * of the drag, that can be used to implement momentum animation.
 *
 * @see wireless.events.DragHandler for a usage example.
 */

goog.provide('wireless.fx.DragVelocity');

goog.require('goog.math.Coordinate');


/**
 * Calculates the velocity based on user drag actions. This class simply
 * provides the velocity, it does not update any on screen elements.
 * @constructor
 */
wireless.fx.DragVelocity = function() {
  /**
   * An array of tuples where the first item is the horizontal component of a
   * recent relevant move and the second item is the move's time stamp. Old
   * moves are removed based on the max tracking time and when direction
   * changes. Used to determine the end velocity of a drag.
   * @type {!Array.<number>}
   * @private
   */
  this.recentMovesX_ = [];

  /**
   * An array of tuples where the first item is the vertical component of a
   * recent relevant move and the second item is the move's time stamp. Old
   * moves are removed based on the max tracking time and when direction
   * changes. Used to determine the end velocity of a drag.
   * @type {!Array.<number>}
   * @private
   */
  this.recentMovesY_ = [];
};


/**
 * The maximum number of ms to track a drag move. After a move is older than
 * this value, it will be ignored in velocity calculations.
 * @type {number}
 * @private
 */
wireless.fx.DragVelocity.MAX_RECENT_TIME_ = 250;


/**
 * The maximum number of recent moves to track.
 * @type {number}
 * @private
 */
wireless.fx.DragVelocity.MAX_RECENT_LENGTH_ = 5;


/**
 * The maximum velocity to return, in pixels per millisecond, that is used to
 * guard against errors in calculating end velocity of a drag. This is a very
 * fast drag velocity.
 * @type {number}
 * @private
 */
wireless.fx.DragVelocity.MAXIMUM_VELOCITY_ = 5;


/**
 * The velocity to return, in pixel per millisecond, when the time stamps on the
 * events are erroneous. The browser can return bad time stamps if the thread
 * is blocked for the duration of the drag. This is a low velocity to prevent
 * the content from moving quickly after a slow drag. It is less jarring if the
 * content moves slowly after a fast drag.
 * @type {number}
 * @private
 */
wireless.fx.DragVelocity.VELOCITY_FOR_INCORRECT_EVENTS_ = 1;


/**
 * The last touch x delta. Used to determine the end velocity of a drag.
 * @type {number|undefined}
 * @private
 */
wireless.fx.DragVelocity.prototype.lastMoveX_;


/**
 * The last touch y delta. Used to determine the end velocity of a drag.
 * @type {number|undefined}
 * @private
 */
wireless.fx.DragVelocity.prototype.lastMoveY_;


/**
 * Start touch is recorded when the gesture is started. For drag, however, we
 * need to know the inital start touch position (i.e., the position when the
 * touch has been placed), in order to give the delegate the information about
 * the initial drag (the drag occured before the gesture has actually started).
 * This variable at first holds the x coordinate of the initial touch position,
 * and only after the delegate is called it is updated to the touch position
 * at the moment the gesture is started.
 * @type {number|undefined}
 * @private
 */
wireless.fx.DragVelocity.prototype.dragStartTouchX_;


/**
 * Same as above, but for coordinate y.
 * @type {number|undefined}
 * @private
 */
wireless.fx.DragVelocity.prototype.dragStartTouchY_;


/**
 * Prepares for a new round of drag velocity calculations.
 * @param {number} x The x coordinate of the start.
 * @param {number} y The y coordinate of the start.
 * @param {number} timeStamp The time stamp in milliseconds.
 */
wireless.fx.DragVelocity.prototype.handleStart = function(x, y, timeStamp) {
  this.recentMovesX_.length = this.recentMovesY_.length = 0;
  this.recentMovesX_.push(x, timeStamp);
  this.recentMovesY_.push(y, timeStamp);

  // Save the initial position of the touch.
  this.dragStartTouchX_ = x;
  this.dragStartTouchY_ = y;
};


/**
 * Updates the velocity based on movement.
 * @param {number} x The x coordinate of the movement.
 * @param {number} y The y coordinate of the movement.
 * @param {number} timeStamp The time stamp associated with the movement, in
 *     milliseconds.
 * @return {goog.math.Coordinate} The velocity of this move. Velocity is
 *     defined as deltaXY / deltaTime where deltaXY is the difference between
 *     current position and the oldest recent position, and deltaTime is the
 *     difference between current time stamp and the oldest recent time stamp.
 */
wireless.fx.DragVelocity.prototype.handleMove = function(x, y, timeStamp) {
  var lastX = this.recentMovesX_[this.recentMovesX_.length - 2];
  var lastY = this.recentMovesY_[this.recentMovesY_.length - 2];
  var moveX = lastX - x;
  var moveY = lastY - y;

  this.removeMovesInWrongDirection_(
      /** @type {!Array.<number>} */ (this.recentMovesX_), this.lastMoveX_,
      moveX);
  this.removeMovesInWrongDirection_(
      /** @type {!Array.<number>} */ (this.recentMovesY_), this.lastMoveY_,
      moveY);
  this.removeOldMoves_(
      /** @type {!Array.<number>} */ (this.recentMovesX_), timeStamp);
  this.removeOldMoves_(
      /** @type {!Array.<number>} */ (this.recentMovesY_), timeStamp);
  this.recentMovesX_.push(x, timeStamp);
  this.recentMovesY_.push(y, timeStamp);

  this.lastMoveX_ = moveX;
  this.lastMoveY_ = moveY;

  return this.calculateVelocity_(x, y, timeStamp);
};


/**
 * Filters the provided recent moves array to remove all moves except the
 * last if the move direction has changed.
 * @param {!Array.<number>} recentMoves An array of tuples where the first
 *     item is the x or y component of the recent touch and the second item
 *     is the touch time stamp.
 * @param {number|undefined} lastMove The x or y component of the preceding
 *     move.
 * @param {number} recentMove The x or y component of the most recent move.
 * @private
 */
wireless.fx.DragVelocity.prototype.removeMovesInWrongDirection_ =
    function(recentMoves, lastMove, recentMove) {
  if (lastMove && recentMove && recentMoves.length > 2 &&
      (lastMove > 0 ^ recentMove > 0)) {
    recentMoves.splice(0, recentMoves.length - 2);
  }
};


/**
 * Filters the provided recent moves array to remove all moves older than
 * the max tracking time or the 5th most recent touch.
 * @param {!Array.<number>} recentMoves An array of tuples where the first
 *     item is the start x or y component of the recent move and the second item
 *     is the touch time stamp.
 * @param {number} recentTime The time of the most recent event.
 * @private
 */
wireless.fx.DragVelocity.prototype.removeOldMoves_ =
    function(recentMoves, recentTime) {
  while (recentMoves.length && recentTime - recentMoves[1] >
      wireless.fx.DragVelocity.MAX_RECENT_TIME_ ||
      recentMoves.length >
          wireless.fx.DragVelocity.MAX_RECENT_LENGTH_ * 2) {
    recentMoves.splice(0, 2);
  }
};

/**
* Updates the velocity based on the end of movement.
* @param {number=} opt_x The x coordinate of the movement, if available.
* @param {number=} opt_y The y coordinate of the movement, if available.
* @param {number=} opt_timeStamp The time stamp associated with the movement, in
*     milliseconds, if available.
* @return {!goog.math.Coordinate|undefined} The velocity of this move. Velocity
*     is defined as deltaXY / deltaTime where deltaXY is the difference between
*     current position and the oldest recent position, and deltaTime is the
*     difference between current time stamp and the oldest recent time stamp.
*/
wireless.fx.DragVelocity.prototype.handleEnd = function(
      opt_x, opt_y, opt_timeStamp) {
  if (goog.isDef(opt_x) && goog.isDef(opt_y) && opt_timeStamp) {
    this.removeOldMoves_(/** @type {!Array.<number>} */ (this.recentMovesX_),
                         opt_timeStamp);
    this.removeOldMoves_(/** @type {!Array.<number>} */ (this.recentMovesY_),
                         opt_timeStamp);
    return this.calculateVelocity_(/** @type {number} */ (opt_x),
        /** @type {number} */ (opt_y), opt_timeStamp);
  }
};


/**
 * Calculates and returns the velocity of the drag. Velocity is defined as
 * deltaXY / deltaTime where deltaXY is the difference between current position
 * and the oldest recent position, and deltaTime is the difference between
 * current time stamp and the oldest recent time stamp.
 * @param {number} x The end x coordinate of the touch.
 * @param {number} y The end y coordinate of the touch.
 * @param {number} time The end time of the touch.
 * @return {!goog.math.Coordinate} The velocity as a coordinate.
 * @private
 */
wireless.fx.DragVelocity.prototype.calculateVelocity_ =
    function(x, y, time) {
  var velocityX = this.recentMovesX_.length ?
      (x - this.recentMovesX_[0]) /
      (time - this.recentMovesX_[1]) : 0;
  var velocityY = this.recentMovesY_.length ?
      (y - this.recentMovesY_[0]) /
      (time - this.recentMovesY_[1]) : 0;

  velocityX = this.correctVelocity_(velocityX);
  velocityY = this.correctVelocity_(velocityY);

  return new goog.math.Coordinate(velocityX, velocityY);
};


/**
 * Correct erroneous velocities by capping the velocity if we think it's too
 * high, or setting it to a default velocity if know that the event data is bad.
 * @param {number} velocity The x or y velocity component.
 * @return {number} The corrected velocity.
 * @private
 */
wireless.fx.DragVelocity.prototype.correctVelocity_ = function(velocity) {
  var absVelocity = Math.abs(velocity);

  // We add to recent touches for each touchstart and touchmove. If we have
  // fewer than 3 touches (6 entries), we assume that the thread was blocked for
  // the duration of the drag and we received events in quick succession with
  // the wrong time stamps.
  if (absVelocity > wireless.fx.DragVelocity.MAXIMUM_VELOCITY_) {
    absVelocity = this.recentMovesY_.length < 6 ?
        wireless.fx.DragVelocity.VELOCITY_FOR_INCORRECT_EVENTS_ :
            wireless.fx.DragVelocity.MAXIMUM_VELOCITY_;
  }
  return absVelocity * (velocity < 0 ? -1 : 1);
};
