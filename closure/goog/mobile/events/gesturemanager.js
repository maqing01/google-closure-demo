
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
 * @fileoverview Gesture Manager. Class that handles all touch events and
 * uses them to interpret higher level gestures and behaviors. TouchEvent is a
 * built in mobile safari type:
 * http://developer.apple.com/safari/library/documentation/UserExperience/Reference/TouchEventClassReference/TouchEvent/TouchEvent.html.
 *
 * This class behaves like a dispatcher of events to the gesture-specific
 * handlers. These handlers implements a gesture-specific logic
 * (see draghandler.js) and extend the same base class (see gesturehandler.js)
 * so they can be handled uniformly. Besides that, the class also records
 * the last known position of touches that are bing tracked, and provides
 * that information to gesture handlers.
 *
 * This class contains a work around for a mobile safari bug where
 * the 'touchend' events are not properly dispatched.
 *
 * Examples of higher level gestures this class is intended to support
 * - dragging, zooming (Implemented.)
 * - click double click, long click (Not yet implemented.)
 * - swiping (Not yet implemented.)
 *
 * Besides these high-level gestures, the class will also raise events when
 * touches are started/ended, but only if you requested to track some gesture,
 * and not all the requested gestures are already active (e.g., if only tracking
 * zooming, while zooming, third touch will not be reported). The intention is
 * to inform of touches which potentially lead to gesture (see touchable.js).
 */

goog.provide('wireless.events.GestureManager');

goog.require('goog.asserts');
goog.require('goog.structs.Set');
goog.require('wireless.WindowHelper');
goog.require('wireless.events.DragHandler');
goog.require('wireless.events.GestureHandler');
goog.require('wireless.events.Touchable');
goog.require('wireless.events.ZoomHandler');
goog.require('wireless.events.touch');



/**
 * @constructor
 * @param {!wireless.events.Touchable} touchable The delegate for touch events.
 */
wireless.events.GestureManager = function(touchable) {
  /**
   * @type {!wireless.events.Touchable}
   * @private
   */
  this.touchable_ = touchable;

  /**
   * @type {Element}
   * @private
   */
  this.element_ = this.touchable_.getElement();

  /**
   * Maps the ID of a tracked touch to the last known x coord of the touch.
   * We also use this to establish if a touch is being tracked or not.
   * @type {!Object.<number, number>}
   * @private
   */
  this.idTouchLastX_ = {};

  /**
   * Maps the ID of a touch to the last known y coord of the touch.
   * @type {!Object.<number, number>}
   * @private
   */
  this.idTouchLastY_ = {};

  /**
   * The array of registered gesture handlers which will be notified when
   * touches start, move, or end. The handlers are ordered by the
   * wireless.events.GestureHandler.GestureType, and there can be undefined
   * elements in this array.
   * @type {!Array.<!wireless.events.GestureHandler|undefined>}
   * @private
   */
  this.handlers_ = [];
};


/**
 * Gesture handler types.
 * @enum {number}
 * @private
 */
wireless.events.GestureManager.GestureType_ = {
  DRAG: 0,
  ZOOM: 1
};


/**
 * Gesture handler constructors, in the same order as geture types.
 * @type {!Array.<function(new:Object, !Object, !Object.<number, number>,
 *     !Object.<number, number>)>}
 * @private
 */
wireless.events.GestureManager.GestureConstructor_ = [
  wireless.events.DragHandler,
  wireless.events.ZoomHandler
];


/**
 * Gets an existing handler if such  exists.
 * @param {wireless.events.GestureManager.GestureType_} gestureType
 *     The type of the gesture.
 * @return {!wireless.events.GestureHandler|undefined} The handler.
 * @private
 */
wireless.events.GestureManager.prototype.getHandler_ =
    function(gestureType) {
 return this.handlers_[gestureType];
};


/**
 * Creates a new handler if one does not already exist.
 * @param {wireless.events.GestureManager.GestureType_} gestureType
 *     The type of the gesture.
 * @param {!Object} gesturable The gesturable delegate.
 * @return {!wireless.events.GestureHandler|undefined} The created or existing
 *     handler.
 * @private
 */
wireless.events.GestureManager.prototype.createHandler_ =
    function(gestureType, gesturable) {
  var handler = this.handlers_[gestureType];
  if (handler) {
    return handler;
  }
  handler = /** @type {!wireless.events.GestureHandler} */ (
      new wireless.events.GestureManager.GestureConstructor_[gestureType]
      (gesturable, this.idTouchLastX_, this.idTouchLastY_));

  return this.handlers_[gestureType] = handler;
};


/**
 * Handle unreliable end events.
 * Sometimes a touch ends without browser reporting the touchEnd event. To
 * detect this situation, we check if a touch that is being tracked is no longer
 * present in the list of touches obtained from the browser, or did the touch
 * with the same id just started. In those cases, we raise call onLostEnd_ for
 * the touch whose onTouchEnd event has been lost.
 * @param {!TouchEvent} e The touchstart event.
 * @private
 */
wireless.events.GestureManager.prototype.checkLostTouchEnd_ =
    function(e) {
  goog.asserts.assert(e.type == wireless.events.touch.START_EVENT,
      'GestureManager: checkLostTouchEnd called in ' + e.type + ' event.');

  // If a touch that we are tracking is no longer in e.touches, the touchEnd
  // of that touch was not recieved.
  var touches = wireless.events.touch.getTouches(e);
  var touchesLength = touches.length;
  for (var trackedTouchId in this.idTouchLastX_) {
    for (var i = 0; i < touchesLength; i++) {
      var touchId = wireless.events.touch.getTouchId(touches[i]);
      if (trackedTouchId == touchId) {
        var touchFound = true;
        break;
      }
    }
    if (!touchFound) {
      this.onLostEnd_(+trackedTouchId);
    }
  }

  // If a just-started touch has the same id as the touch that we are tracking,
  // the touchEnd for the tracked touch was not recieved.
  var startedTouches = wireless.events.touch.getChangedTouches(e);
  var startedTouchesLength = startedTouches.length;
  for (var i = 0; i < startedTouchesLength; i++) {
    var startedTouchId = wireless.events.touch.getTouchId(startedTouches[i]);
    if (goog.isDef(this.idTouchLastX_[startedTouchId])) {
      this.onLostEnd_(+startedTouchId);
    }
  }
};


/**
 * Touch start handler.
 * @param {!TouchEvent} e The touchstart event.
 * @private
 */
wireless.events.GestureManager.prototype.onStart_ = function(e) {
  // Check for lost touchEnd events.
  this.checkLostTouchEnd_(e);

  var allHandlersAreTrackingAll = true;
  var handlerCount = this.handlers_.length;
  for (var i = 0; i < handlerCount; i++) {
    var handler = this.handlers_[i];
    if (handler && !handler.isTrackingAll()) {
      allHandlersAreTrackingAll = false;
      break;
    }
  }

  // Do not act for this event if...
  // - all the gesture handler are already tracking all their touches, or
  // - the touchable delegate refuses to accept the event at this time.
  if (allHandlersAreTrackingAll || !this.touchable_.onTouchStart(e)) {
    return;
  }

  // Add new touches.
  var newTouches = wireless.events.touch.getChangedTouches(e);
  var newTouchesLength = newTouches.length;
  for (var i = 0; i < newTouchesLength; i++) {
    var newTouch = newTouches[i];
    var newTouchId = wireless.events.touch.getTouchId(newTouch);
    goog.asserts.assert(!this.idTouchLastX_[newTouchId],
      'GestureManager: onStart, trying to add a touch that is already tracked');
    this.idTouchLastX_[newTouchId] = newTouch.clientX;
    this.idTouchLastY_[newTouchId] = newTouch.clientY;
  }

  // Invoke gesture handlers.
  for (var i = 0; i < handlerCount; i++) {
    var handler = this.handlers_[i];
    if (handler) {
      handler.onTouchStart(e);
    }
  }
};


/**
 * Touch move handler.
 * @param {!TouchEvent} e The touchmove event.
 * @private
 */
wireless.events.GestureManager.prototype.onMove_ = function(e) {
  // TODO(seguljac) : On touch start we ignore touches if all actions are
  // active. To prevent having these 'dead' touches, we should send touches
  // that are currently not being tracked back to the onStart. To do this,
  // we need to clone event e, remove all tracked touches and call onStart.

  var noHandlerIsTracking = true;
  var handlerCount = this.handlers_.length;
  for (var i = 0; i < handlerCount; i++) {
    var handler = this.handlers_[i];
    if (handler && handler.isTracking()) {
      noHandlerIsTracking = false;
      break;
    }
  }

  // Do not act for this event if no handler is tracking any touch.
  if (noHandlerIsTracking) {
    return;
  }

  // Invoke gesture handlers.
  for (var i = 0; i < handlerCount; i++) {
  var handler = this.handlers_[i];
    if (handler) {
      handler.onTouchMove(e);
    }
  }

  // Update the last position of the tracked touches.
  var movedTouches = wireless.events.touch.getChangedTouches(e);
  var movedTouchesLength = movedTouches.length;
  for (var i = 0; i < movedTouchesLength; i++) {
    var movedTouch = movedTouches[i];
    var movedTouchId = wireless.events.touch.getTouchId(movedTouch);
    if (goog.isDef(this.idTouchLastX_[movedTouchId])) {
      this.idTouchLastX_[movedTouchId] = movedTouch.clientX;
      this.idTouchLastY_[movedTouchId] = movedTouch.clientY;
    }
  }
};


/**
 * Touch end handler.
 * @param {!TouchEvent} e The touchend event.
 * @private
 */
wireless.events.GestureManager.prototype.onEnd_ = function(e) {
  // Touches that ended in this event.
  var endedTouches = wireless.events.touch.getChangedTouches(e);
  var endedTouchesLength = endedTouches.length;

  // Raise onTouchEnd only for the touches that we are tracking
  // (i.e., that onTouchStart returned true).
  var shouldAct;
  for (var i = 0; i < endedTouchesLength; i++) {
    var endedTouch = endedTouches[i];
    var endedTouchId = wireless.events.touch.getTouchId(endedTouch);
    if (goog.isDef(this.idTouchLastX_[endedTouchId])) {
      this.touchable_.onTouchEnd(e);
      shouldAct = true;
    }
  }

  // Do not act for this event we are not tracking any touch that just ended.
  if (!shouldAct) {
    return;
  }

  // Invoke gesture handlers.
  var handlerCount = this.handlers_.length;
  for (var i = 0; i < handlerCount; i++) {
    var handler = this.handlers_[i];
    if (handler) {
      handler.onTouchEnd(e);
    }
  }

  // Delete tracked touches that just ended.
  for (var i = 0; i < endedTouchesLength; i++) {
    var endedTouch = endedTouches[i];
    var endedTouchId = wireless.events.touch.getTouchId(endedTouch);
    if (goog.isDef(this.idTouchLastX_[endedTouchId])) {
      delete this.idTouchLastX_[endedTouchId];
      delete this.idTouchLastY_[endedTouchId];
    }
  }
};


/**
 * Handle the case where a touch that we were tracking ended without browser
 * reporting onTouchEnd event. In those situation, we still must notification the
 * delegates, but we send them null event.
 * @param {number} touchId The identifier of the touch that ended.
 * @private
 */
wireless.events.GestureManager.prototype.onLostEnd_ = function(touchId) {
  this.touchable_.onTouchEnd(null);

  // Invoke gesture handlers.
  var handlerCount = this.handlers_.length;
  for (var i = 0; i < handlerCount; i++) {
    var handler = this.handlers_[i];
    if (handler) {
      handler.onLostTouchEnd(touchId);
    }
  }

  delete this.idTouchLastX_[touchId];
  delete this.idTouchLastY_[touchId];
};


/**
 * Start listening for events.
 * @param {boolean=} opt_capture True if the GestureManager should listen to
 *      during the capture phase.
 * @param {boolean=} opt_removeHandlerOnFocus True if you want the handler to be
 *     removed when there is any focus event, and added back on blur events.
 */
wireless.events.GestureManager.prototype.enable = function(opt_capture,
    opt_removeHandlerOnFocus) {
  var onEnd = goog.bind(this.onEnd_, this);
  wireless.events.touch.addEventListeners(this.element_,
      goog.bind(this.onStart_, this),
      goog.bind(this.onMove_, this),
      onEnd, onEnd, opt_capture, opt_removeHandlerOnFocus);
};


/**
 * Reset the touchable element state.
 */
wireless.events.GestureManager.prototype.reset = function() {
  // Have to delete element by element instead of just creating a new object,
  // since gesture handlers maintain a reference to these two maps.
  for (var id in this.idTouchLastX_) {
    delete this.idTouchLastX_[Number(id)];
    delete this.idTouchLastY_[Number(id)];
  }
  for (var i = 0; i < this.handlers_.length; i++) {
    var handler = this.handlers_[i];
    if (handler) {
      handler.reset();
    }
  }
};


/**
 * Creates a new drag handler, if one does not already exist.
 * @param {!wireless.events.Draggable} draggable The draggable delegate.
 * @return {!wireless.events.DragHandler} The created drag handler.
 */
wireless.events.GestureManager.prototype.setDraggable = function(draggable) {
  return /** @type !wireless.events.DragHandler */ (this.createHandler_(
      wireless.events.GestureManager.GestureType_.DRAG, draggable));
};


/**
 * Gets the drag handler, if such exist.
 * @return {!wireless.events.DragHandler} The drag handler.
 */
wireless.events.GestureManager.prototype.getDragHandler = function() {
  return /** @type !wireless.events.DragHandler */ (this.getHandler_(
      wireless.events.GestureManager.GestureType_.DRAG));
};


/**
 * Creates a new zoom handler, if one does not already exist.
 * @param {!wireless.events.Zoomable} zoomable The zoomable delegate.
 * @return {!wireless.events.ZoomHandler} The created zoom handler.
 */
wireless.events.GestureManager.prototype.setZoomable = function(zoomable) {
  return /** @type !wireless.events.ZoomHandler */ (this.createHandler_(
      wireless.events.GestureManager.GestureType_.ZOOM, zoomable));
};


/**
 * Gets the zoom handler, if such exist.
 * @return {!wireless.events.ZoomHandler} The zoom handler.
 */
wireless.events.GestureManager.prototype.getZoomHandler = function() {
  return /** @type !wireless.events.ZoomHandler */ (this.getHandler_(
      wireless.events.GestureManager.GestureType_.ZOOM));
};
