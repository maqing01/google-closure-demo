
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
 * @fileoverview Gesture handler.
 *
 * A base abstract class for gesture handling. Its supports gestures with
 * parameterized number of touches which confirm to the following logic.
 *
 * A "N-gesture" is an action which starts when there are N-touches placed
 * on the screen and at least one of them moves a sufficient amount (measured
 * from the time all N touches are present). A gesture stops when any of
 * gesture touches leaves the screen.
 *
 * For a subsequent gesture to start, if there are M gesture touches still
 * present from a previous gesture, then it is sufficient to place only N-M
 * touches on the screen.
 *
 * The example gestures that confirm to this logic are drag (N=1), zoom (N=2).
 *
 * This class should never be instantiated, rather it should be extended. Please
 * see draghandler.js and zoomhandler.js for examples of how to extend this
 * class.
 */

goog.provide('wireless.events.GestureHandler');
goog.require('wireless.events');



/**
 * The base gesture handler class. This class should never be instantiated,
 * rather it should be extended (e.g., see draghandler.js).
 * @constructor
 * @param {!Object.<number, number>} idTouchLastX Maps the ID of a touch
 *     to the last x coord of the touch.
 * @param {!Object.<number, number>} idTouchLastY Maps the ID of a touch
 *     to the last y coord of the touch.
 * @param {number} gestureNumTouches The number of touches that the gesture
 *     consists of.
 */
wireless.events.GestureHandler =
    function(idTouchLastX, idTouchLastY, gestureNumTouches) {
  /**
   * Maps the ID of a touch to the last known x coord of the touch.
   * @type {!Object.<number, number>}
   * @private
   */
  this.idTouchLastX_ = idTouchLastX;

  /**
   * Maps the ID of a touch to the last known y coord of the touch.
   * @type {!Object.<number, number>}
   * @private
   */
  this.idTouchLastY_ = idTouchLastY;

  /**
   * The number of touches that the gesture consists of (1 for drag, 2 for zoom,
   * 3 for swipe, etc.). This determines the maximum number of elements of
   * the arrays below.
   * @type {number}
   * @private
   */
  this.gestureNumTouches_ = gestureNumTouches;

  /**
   * Array of ids of gesture touches. The gesture touches are ordered in the way
   * that they appear, both in this array and all the arrays below.
   * @type {!Array.<number>}
   * @private
   */
  this.touchIds_ = [];

  /**
   * Array of changed gesture touches, that is, references to Touch objects from
   * the TouchList of the last event. If a touch has not changed in the last
   * event, its entry will be undefined.
   * @type {!Array.<!Touch|undefined>}
   * @private
   */
  this.changedGestureTouches_ = [];

  /**
   * Array of absolute sum of all touch x deltas, one sum for each touch.
   * @type {!Array.<number>}
   * @private_
   */
  this.totalMoveX_ = [];

  /**
   * Array of absolute sum of all touch y deltas, one sum for each touch.
   * @type {!Array.<number>}
   * @private
   */
  this.totalMoveY_ = [];

  /**
   * Array of start x coordinates of gesture touches.
   * @type {!Array.<number>}
   * @private
   */
  this.startTouchX_ = [];

  /**
   * Array of start y coordinates of gesture touches.
   * @type {!Array.<number>}
   * @private
   */
  this.startTouchY_ = [];
};


/**
 * Minimum movement of touch required to be considered a gesture.
 *  make customizable by passing optional parameters to the
 * TouchHandler constructor.
 * @type {number}
 * @private
 */
wireless.events.GestureHandler.MIN_MOVEMENT_FOR_GESTURE_ = 2;


/**
 * Whether or not is the handler currently suspended (i.e., it will not react to
 * any events).
 * @type {boolean|undefined}
 * @private
 */
wireless.events.GestureHandler.prototype.suspended_;


/**
 * How many touches the gesture handler is currently tracking.
 * @type {number}
 * @private
 */
wireless.events.GestureHandler.prototype.tracking_ = 0;


/**
 * Whether or not is there a gesture in progress.
 * @type {boolean|undefined}
 * @private
 */
wireless.events.GestureHandler.prototype.gesturing_;


/**
 * End tracking a touch. (i) Removes the touch from the map of gesture touches,
 * (ii) decreases the tracking_ variable, and (iii) set gesturing to false.
 * @param {number} touchIndex The index of the touch that has ended.
 * @private
 */
wireless.events.GestureHandler.prototype.endTracking_ = function(touchIndex) {
  this.touchIds_.splice(touchIndex, 1);
  this.tracking_--;
  this.gesturing_ = false;
};


/**
 * Scans the list of changed touches from a TouchEvent looking for the gesture
 * touches, and updates the changedGestureTouches elements to refer to proper
 * elements of the touchList.
 * @param {!TouchEvent} e The event The list of touches from an event.
 * @return {boolean|undefined} True if a gesture touch has changed.
 * @private
 */
wireless.events.GestureHandler.prototype.updateChangedTouches_ = function(e) {
  var gestureTouchChanged;
  var touchList = wireless.events.touch.getChangedTouches(e);
  var touchListLength = touchList.length;
  for (var i = 0; i < this.tracking_; i++) {
    // Assume that a gesture touch has not changed
    this.changedGestureTouches_[i] = undefined;
    for (var j = 0; j < touchListLength; j++) {
      if (this.touchIds_[i] == wireless.events.touch.getTouchId(touchList[j])) {
        // A gesture touch has changed, so update its reference
        this.changedGestureTouches_[i] = touchList[j];
        gestureTouchChanged = true;
        break;
      }
    }
  }
  return gestureTouchChanged;
};


/**
 * Checks if a touch has moved enough to start a gesture.
 * @param {number} x The x coordinate of the move.
 * @param {number} y The y coordinate of the move.
 * @return {boolean} Whether a touch has moved enough.
 * @private
 */
wireless.events.GestureHandler.prototype.minMoveForGesture_ = function(x, y) {
  return (x > wireless.events.GestureHandler.MIN_MOVEMENT_FOR_GESTURE_ ||
          y > wireless.events.GestureHandler.MIN_MOVEMENT_FOR_GESTURE_);
};


/**
 * A touch (or touches) has started. If not tracking all the gesture touches,
 * add it/them, and, if all the gesture touches are now present, reset the total
 * move of all gesture touches.
 * @param {!TouchEvent} e The touchstart event.
 */
wireless.events.GestureHandler.prototype.onTouchStart = function(e) {
  // Do not act for this event if...
  // - suspended, or
  // - already tracking all touches.
  if (this.suspended_ || this.isTrackingAll()) {
    return;
  }

  var newTouches = wireless.events.touch.getChangedTouches(e);
  var newTouchesLength = newTouches.length;
  var numTouchesYetToTrack = this.gestureNumTouches_ - this.tracking_;
  // The number of new touches to add from this event is the minimum between
  // the num of touches from the event and the number of touches that we are
  // missing to a full gesture.
  var numTouchesToAdd = Math.min(newTouchesLength, numTouchesYetToTrack);
  for (var i = 0; i < numTouchesToAdd; i++) {
    var newTouch = newTouches[i];
    this.touchIds_[this.tracking_] = wireless.events.touch.getTouchId(newTouch);
    // Set the initial position.
    this.startTouchX_[this.tracking_] = newTouch.clientX;
    this.startTouchY_[this.tracking_] = newTouch.clientY;
    this.tracking_++;
  }
  this.updateChangedTouches_(e);

  // If we now have all gesture touches, set total move to 0.
  if (this.isTrackingAll()) {
    for (var i = 0; i < this.gestureNumTouches_; i++) {
      this.totalMoveX_[i] = this.totalMoveY_[i] = 0;
    }
  }

  this.onGestureTouchStart(e);
};


/**
 * A touch has moved. If it is a gesture touch, check if the gesture be started.
 * @param {!TouchEvent} e The touchmove event.
 */
wireless.events.GestureHandler.prototype.onTouchMove = function(e) {
  // Do not act for this event if...
  // - suspended, or
  // - not tracking all the touches of this gesture, or
  // - a gesture touch has not moved.
  if (this.suspended_ || !this.isTrackingAll() ||
      !this.updateChangedTouches_(e)) {
    return;
  }

  // If a gesture is in progress, notification and you are done.
  if (this.gesturing_) {
    this.onGestureMove(e);
    return;
  }

  // If a gesure not in progress, see if it should be started.
  var shouldStartGesture;
  for (var i = 0; i < this.gestureNumTouches_; i++) {
    var touch = this.changedGestureTouches_[i];
    if (!touch) {
      continue;
    }

    // This touch has moved, so update its total move.
    var touchId = this.touchIds_[i];
    var lastX = this.idTouchLastX_[touchId];
    var lastY = this.idTouchLastY_[touchId];
    var currentX = touch.clientX;
    var currentY = touch.clientY;
    var moveX = lastX - currentX;
    var moveY = lastY - currentY;
    this.totalMoveX_[i] += Math.abs(moveX);
    this.totalMoveY_[i] += Math.abs(moveY);
    // If any of the touches moved sufficiently, start gesture.
    shouldStartGesture = shouldStartGesture ||
        this.minMoveForGesture_(this.totalMoveX_[i], this.totalMoveY_[i]);
  }

  if (!shouldStartGesture) {
    return;
  }

  // If a gesture needs to be started, update the start positions before
  // calling the delegate, so the delegate can access this information.
  for (var i = 0; i < this.gestureNumTouches_; i++) {
    var touchId = this.touchIds_[i];
    this.startTouchX_[i] = /** @type {number} */ (this.getCurrentTouchX(i));
    this.startTouchY_[i] = /** @type {number} */ (this.getCurrentTouchY(i));
  }
  // Let the delegate decide whether to allow this gesture or not.
  this.gesturing_ = this.onGestureStart(e);
  if (!this.gesturing_) {
    this.reset();
    return;
  }

  this.onGestureMove(e);
};


/**
 * A touch has ended.
 * @param {!TouchEvent} e The touchend event.
 */
wireless.events.GestureHandler.prototype.onTouchEnd = function(e) {
 // Do not act for this event if...
  // - suspended, or
  // - not tracking any touch of this gesture, or
  // - a gesture touch has not moved.
  if (this.suspended_ || !this.isTracking() || !this.updateChangedTouches_(e)) {
    return;
  }

  if (this.isGesturing()) {
    this.onGestureEnd(e);
  }

  // End tracking touches that ended.
  // Cache this.tracking_ since endTracking modifies it, and properly decrease
  // the index od the touch that needs to be removed.
  var tracking = this.tracking_;
  var removed = 0;
  for (var i = 0; i < tracking; i++) {
    var touch = this.changedGestureTouches_[i];
    if (touch) {
      this.endTracking_(i - removed);
      removed++;
    }
  }
};


/**
 * A touch ended without browser reporting onTouchEnd event.
 * @param {number} touchId The identifier of the touch that ended.
 */
wireless.events.GestureHandler.prototype.onLostTouchEnd = function(touchId) {
  // Do not act for this event if...
  // - suspended, or
  // - not tracking any touch of this gesture, or
  if (this.suspended_ || !this.isTracking()) {
    return;
  }

  // Find the index of this touch.
  var touchIndex;
  for (var i = 0; i < this.tracking_; i++) {
    if (this.touchIds_[i] == touchId) {
      touchIndex = i;
      break;
    }
  }

  // Do not act for this event if we are not traking this touch.
  if (!goog.isDef(touchIndex)) {
    return;
  }

  if (this.isGesturing()) {
    this.onGestureEnd(null);
  }

  this.endTracking_(touchIndex);
};


/**
 * A touch that can lead to a gesture has started.
 * @param {!TouchEvent} e The touchend event.
 */
wireless.events.GestureHandler.prototype.onGestureTouchStart =
    goog.abstractMethod;


/**
 * A gesture is about to start. Return false if do not want to accept this
 * gesture.
 * @param {!TouchEvent} e The touchstart event.
 * @return {boolean} True if the gesture should be started.
 */
wireless.events.GestureHandler.prototype.onGestureStart =
    goog.abstractMethod;


/**
 * A gesture has moved.
 * @param {!TouchEvent} e The touchmove event.
 */
wireless.events.GestureHandler.prototype.onGestureMove =
    goog.abstractMethod;


/**
 * A gesture has ended.
 * @param {TouchEvent} e The touchend event. Null in the case that the touch
 *     has ended but the touchEnd event has not been reported by the browser.
 */
wireless.events.GestureHandler.prototype.onGestureEnd =
    goog.abstractMethod;


/** Reset the gesture handler state. */
wireless.events.GestureHandler.prototype.reset = function() {
  this.tracking_ = 0;
  this.gesturing_ = false;
  this.suspended_ = false;
};


/** Prevent the gesture handler from reacting on events. */
wireless.events.GestureHandler.prototype.suspend = function() {
  this.suspended_ = true;
};


/**
 * Whether or not is the gesture handler tracking any touch.
 * @return {boolean|undefined} Are we tracking touch.
 */
wireless.events.GestureHandler.prototype.isTracking = function() {
  return this.tracking_ > 0;
};


/**
 * Whether or not is the gesture handler tracking all gesture touches.
 * @return {boolean|undefined} True if tracking all gesture touches.
 */
wireless.events.GestureHandler.prototype.isTrackingAll = function() {
  return this.tracking_ == this.gestureNumTouches_;
};

/**
 * Whether or not is there a gesture in progress.
 * @return {boolean|undefined} Is gesture in progress.
 */
wireless.events.GestureHandler.prototype.isGesturing = function() {
  return this.gesturing_;
};


/**
 * Get the start x coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Start x coordinate of the requested touch.
 */
wireless.events.GestureHandler.prototype.getStartTouchX =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  return this.startTouchX_[opt_touchIndex || 0];
};


/**
 * Get the start y coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Start y coordinate of the requested touch.
 */
wireless.events.GestureHandler.prototype.getStartTouchY =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  return this.startTouchY_[opt_touchIndex || 0];
};


/**
 * Get the current x coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Current x coordinate of the requested touch.
 * @protected
 */
wireless.events.GestureHandler.prototype.getCurrentTouchX =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  var touchIndex = opt_touchIndex || 0;
  var changedTouch = this.changedGestureTouches_[touchIndex];
  if (changedTouch) {
    return changedTouch.clientX;
  }
  return this.getLastTouchX(touchIndex);
};


/**
 * Get the current y coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Current y coordinate of the requested touch.
 * @protected
 */
wireless.events.GestureHandler.prototype.getCurrentTouchY =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  var touchIndex = opt_touchIndex || 0;
  var changedTouch = this.changedGestureTouches_[touchIndex];
  if (changedTouch) {
    return changedTouch.clientY;
  }
  return this.getLastTouchY(touchIndex);
};


/**
 * Get the last x coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Last x coordinate of the requested touch.
 * @protected
 */
wireless.events.GestureHandler.prototype.getLastTouchX =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  var touchId = this.touchIds_[opt_touchIndex || 0];
  return this.idTouchLastX_[touchId];
};


/**
 * Get the last y coordinate of a touch.
 * @param {number} opt_touchIndex The index of the touch (0 being the first
 *     touch that was placed on the screen). Not needed only if the gesture
 *     consists of only 1 touch.
 * @return {number|undefined} Last y coordinate of the requested touch.
 * @protected
 */
wireless.events.GestureHandler.prototype.getLastTouchY =
    function(opt_touchIndex) {
  goog.asserts.assert(this.gestureNumTouches_ == 1 ||
                      goog.isDef(opt_touchIndex),
                      'touchIndex not specified in a multi-touch gesture');
  var touchId = this.touchIds_[opt_touchIndex || 0];
  return this.idTouchLastY_[touchId];
};
