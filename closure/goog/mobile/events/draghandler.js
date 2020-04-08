
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
 * @fileoverview Drag handler.
 *
 * Use this class to make your elements 'draggable' (see draggable.js). This
 * behavior will handle all of the required events and report the properties
 * of the drag to you while the touches are happening and at the end of
 * the zoom sequence.
 *
 * This class should NEVER be constructed by directly invoking the constructor.
 * Rather, setDraggable method of the wireless.events.GestureManager object
 * should be called.
 *
 * This behavior will NOT perform the actual dragging (redrawing the element)
 * for you, this responsibility is left to the client code.
 *
 * The properties of the drag sequence are the horizontal and vertical drag
 * delta, defined as the horizontal/vertical difference of the start touch
 * position and the last touch position. The class also reports the end velocity
 * of the drag, that can be used to implement momentum animation.
 */

goog.provide('wireless.events.DragHandler');

goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('wireless.events.Draggable');
goog.require('wireless.events.GestureHandler');
goog.require('wireless.events.clickbuster');
goog.require('wireless.fx.DragVelocity');



/**
 * The drag handler. This class should never be constructed by directly
 * invoking the constructor. Rather, setDraggable method of the
 * wireless.events.GestureManager object should be called.
 * @constructor
 * @extends {wireless.events.GestureHandler}
 * @param {!wireless.events.Draggable} draggable The draggable delegate.
 * @param {!Object.<number, number>} idTouchLastX Maps the ID of a touch
 *     to the last x coord of the touch.
 * @param {!Object.<number, number>} idTouchLastY Maps the ID of a touch
 *     to the last y coord of the touch.
 */
wireless.events.DragHandler = function(draggable, idTouchLastX, idTouchLastY) {
  goog.base(this, idTouchLastX, idTouchLastY, 1 /* gestureNumTouches */);

  /**
   * @type {!wireless.events.Draggable}
   * @private
   */
  this.draggable_ = draggable;

  /**
   * @type {!wireless.fx.DragVelocity}
   * @private
   */
  this.dragVelocity_ = new wireless.fx.DragVelocity();
};
goog.inherits(wireless.events.DragHandler, wireless.events.GestureHandler);


/**
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.events.DragHandler.prototype.endVelocity_;


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
wireless.events.DragHandler.prototype.dragStartTouchX_;


/**
 * Same as above, but for coordinate y.
 * @type {number|undefined}
 * @private
 */
wireless.events.DragHandler.prototype.dragStartTouchY_;


/** @override */
wireless.events.DragHandler.prototype.onGestureTouchStart = function(e) {
  this.dragVelocity_.handleStart(
      /** @type {number} */ (this.getStartTouchX()),
      /** @type {number} */ (this.getStartTouchY()),
      e.timeStamp);

  // Save the initial position of the touch.
  this.dragStartTouchX_ = this.getStartTouchX();
  this.dragStartTouchY_ = this.getStartTouchY();
};


/** @override */
wireless.events.DragHandler.prototype.onGestureStart = function(e) {
  return this.draggable_.onDragStart(e);
};


/** @override */
wireless.events.DragHandler.prototype.onGestureMove = function(e) {
  // Update the start position of the touch that will be reported to
  // the delegate.
  //  This needs to be done only once.
  this.dragStartTouchX_ = this.getStartTouchX();
  this.dragStartTouchY_ = this.getStartTouchY();

  this.dragVelocity_.handleMove(
      /** @type {number} */ (this.getCurrentTouchX()),
      /** @type {number} */ (this.getCurrentTouchY()),
      e.timeStamp);
  this.draggable_.onDragMove(e);
  e.preventDefault();
};


/** @override */
wireless.events.DragHandler.prototype.onGestureEnd = function(e) {
  if (e) {
    this.endVelocity_ = this.dragVelocity_.handleEnd(
        this.getLastTouchX(), this.getLastTouchY(), e.timeStamp) || undefined;

    // Calling preventDefault will stop the ghost click from coming on some
    // browsers (E.g. the PlayBook). Hopefully more browsers will also start
    // doing this.
    //  Consider creating an MDL rule for this 'feature' and
    // don't even use clickbuster if it is not required. Needs quite a bit of
    // testing with devices.
    e.preventDefault();
  }

  this.draggable_.onDragEnd(e);

  wireless.events.clickbuster.preventGhostClickWithEvent(
      /** @type {number} */ (this.getStartTouchX()),
      /** @type {number} */ (this.getStartTouchY()), e);
};



/**
 * Get end velocity of the drag.
 * @return {!goog.math.Coordinate|undefined} The x and y velocity.
 */
wireless.events.DragHandler.prototype.getEndVelocity = function() {
  return this.endVelocity_;
};


/**
 * Get the current vertical drag delta. Drag delta is defined as the deltaY of
 * the start touch position and the last touch position.
 * @return {number|undefined} The y distance.
 */
wireless.events.DragHandler.prototype.getDragDeltaY = function() {
  return this.getCurrentTouchY() - this.dragStartTouchY_;
};


/**
 * Get the current horizontal drag delta. Drag delta is defined as the deltaX of
 * the start touch position and the last touch position.
 * @return {number|undefined} The x distance.
 */
wireless.events.DragHandler.prototype.getDragDeltaX = function() {
  return this.getCurrentTouchX() - this.dragStartTouchX_;
};


/**
 * @return {boolean} True if current drag delta is more vertical than
 *     horizontal.
 */
wireless.events.DragHandler.prototype.isDragVertical = function() {
  return Math.abs(this.getDragDeltaY()) > Math.abs(this.getDragDeltaX());
};

/**
 * @param {number} deltaInDegrees How far away the current slide angle is
 *     permitted to be away from vertical for this function to return true.
 * @param {boolean} permitTies return value of this function when the current
 *     drag angle is exactly deltaInDegrees away from vertical.
 * @return {boolean} True if the current drag angle is within deltaInDegrees
 *     from vertical.
 */
wireless.events.DragHandler.prototype.isDragAngleWithinDegreesOfVertical =
    function(deltaInDegrees, permitTies) {
  return (
      this.isDragAngleWithinDegreesOfAngle_(90, deltaInDegrees, permitTies) ||
      this.isDragAngleWithinDegreesOfAngle_(-90, deltaInDegrees, permitTies));
};

/**
 * @param {number} deltaInDegrees How far away the current slide angle is
 *     permitted to be away from horizontal for this function to return true.
 * @param {boolean} permitTies return value of this function when the current
 *     drag angle is exactly deltaInDegrees away from horizontal.
 * @return {boolean} True if the current drag angle is within deltaInDegrees
 *     from horizontal.
 */
wireless.events.DragHandler.prototype.isDragAngleWithinDegreesOfHorizontal =
    function(deltaInDegrees, permitTies) {
  return (
      this.isDragAngleWithinDegreesOfAngle_(0, deltaInDegrees, permitTies) ||
      this.isDragAngleWithinDegreesOfAngle_(180, deltaInDegrees, permitTies));
};

/**
 * Examines the angle of the current drag to determine if it is within
 * 'deltaInDegrees' of 'targetAngle'.
 * Example:
 *   1) this.isDragAngleWithinDegreesOfAngle_(90, 45, false) ||
 *      this.isDragAngleWithinDegreesOfAngle_(-90, 45, false);
 *        is equivilant to isDragVertical.
 *   2) this.isDragAngleWithinDegreesOfAngle_(0, 45, true) ||
 *      this.isDragAngleWithinDegreesOfAngle_(180, 45, true);
 *        determines if the drag is horizontal is more horizontal than vertical.
 *   3) this.isDragAngleWithinDegreesOfAngle_(0, 20, true);
 *        determines if the drag is withing 20 degrees of horizontal right.
 * @param {number} targetAngle An angle where 0 is horizontal and increasing
 *     angles move counter clockwise from there. 90 is vertical. The opposite of
 *     (+180) of this angle is checked too.
 * @param {number} deltaInDegrees How far away the current slide angle is
 *     permitted to be away from targetAngle for this function to return true.
 * @param {boolean} permitTies return value of this function when the current
 *     drag angle is exactly deltaInDegrees away from targetAngle.
 * @return {boolean} True if the current drag angle is within deltaInDegrees
 *     from targetAngle.
 * @private
 */
wireless.events.DragHandler.prototype.isDragAngleWithinDegreesOfAngle_ =
    function(targetAngle, deltaInDegrees, permitTies) {
  var angleOfDrag = goog.math.angle(0, 0,
      this.getDragDeltaX() || 0, this.getDragDeltaY() || 0);
  var actualDeltaFromTarget = Math.abs(goog.math.angleDifference(
      targetAngle, angleOfDrag));
  if (permitTies) {
    return actualDeltaFromTarget <= deltaInDegrees;
  } else {
    return actualDeltaFromTarget < deltaInDegrees;
  }
};
