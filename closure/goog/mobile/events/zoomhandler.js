
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
 * @fileoverview Zoom handler.
 *
 * Use this class to make your elements 'zoomable' (see zoomable.js). This
 * behavior will handle all of the required events and report the properties
 * of the zoom to you while the touches are happening and at the end of
 * the zoom sequence.
 *
 * This class should NEVER be constructed by directly invoking the constructor.
 * Rather, setZoomable method of the wireless.events.GestureManager object
 * should be called.
 *
 * This behavior will NOT perform the actual zooming (redrawing the element)
 * for you, this responsibility is left to the client code.
 *
 * The properties of the zoom sequence are as follows. First, there is
 * the "start zoom anchor" which is the center of the two zooming touches, at
 * the moment zooming begins. This information can be used in the client code to
 * perform zooming so that the center of the zoom is anchored at the start zoom
 * anchor (hence the name).
 *
 * Second, there is the "current zoom anchor" which is the current center of
 * the two zooming touches. The difference between the start and the current
 * zoom anchors can be used to determine how much to scroll the element being
 * zoomed so that the center of the zoom always correspond to the center of
 * the two zoom touches.
 *
 * Lastly, this class reports the start and the current distance between two
 * zooming touches. This can be used to determine the zooming factor, e.g.,
 * zooming factor = current distance / start distance.
 */

goog.provide('wireless.events.ZoomHandler');

goog.require('goog.math');
goog.require('wireless.events.GestureHandler');
goog.require('wireless.events.Zoomable');



/**
 * @constructor
 * @extends {wireless.events.GestureHandler}
 * @param {!wireless.events.Zoomable} zoomable The zoomable delegate.
 * @param {!Object.<number, number>} idTouchLastX Maps the ID of a touch
 *     to the last x coord of the touch.
 * @param {!Object.<number, number>} idTouchLastY Maps the ID of a touch
 *     to the last y coord of the touch.
 */
wireless.events.ZoomHandler = function(zoomable, idTouchLastX, idTouchLastY) {
  goog.base(this, idTouchLastX, idTouchLastY, 2 /* gestureNumTouches */);

  /**
   * @type {wireless.events.Zoomable|undefined}
   * @private
   */
  this.zoomable_ = zoomable;
};
goog.inherits(wireless.events.ZoomHandler, wireless.events.GestureHandler);


/** @override */
wireless.events.ZoomHandler.prototype.onGestureTouchStart = goog.nullFunction;


/** @override */
wireless.events.ZoomHandler.prototype.onGestureStart = function(e) {
  return this.zoomable_.onZoomStart(e);
};


/** @override */
wireless.events.ZoomHandler.prototype.onGestureMove = function(e) {
  this.zoomable_.onZoomMove(e);
  e.preventDefault();
};


/** @override */
wireless.events.ZoomHandler.prototype.onGestureEnd = function(e) {
  this.zoomable_.onZoomEnd(e);
  if (e) {
    e.preventDefault();
  }
};


/**
 * Get the start zoom anchor x coordinate.
 * @return {number} The start anchor x coordinate.
 */
wireless.events.ZoomHandler.prototype.getStartAnchorX = function() {
  return goog.math.average(this.getStartTouchX(0), this.getStartTouchX(1));
};


/**
 * Get the start zoom anchor y coordinate.
 * @return {number} The start anchor y coordinate.
 */
wireless.events.ZoomHandler.prototype.getStartAnchorY = function() {
  return goog.math.average(this.getStartTouchY(0), this.getStartTouchY(1));
};


/**
 * Get the current zoom anchor x coordinates.
 * @return {!number} The current anchor x coordinate.
 */
wireless.events.ZoomHandler.prototype.getCurrentAnchorX = function() {
  return goog.math.average(this.getCurrentTouchX(0), this.getCurrentTouchX(1));
};


/**
 * Get the current zoom anchor y coordinates.
 * @return {!number} The current anchor y coordinate.
 */
wireless.events.ZoomHandler.prototype.getCurrentAnchorY = function() {
  return goog.math.average(this.getCurrentTouchY(0), this.getCurrentTouchY(1));
};


/**
 * Get the start distance between the two zoom touches.
 * @return {number} The distance.
 */
wireless.events.ZoomHandler.prototype.getStartDistance = function() {
  var dx = this.getStartTouchX(0) - this.getStartTouchX(1);
  var dy = this.getStartTouchY(0) - this.getStartTouchY(1);
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Get the current distance between the two zoom touches.
 * @return {number|undefined} The distance.
 */
wireless.events.ZoomHandler.prototype.getCurrentDistance = function() {
  var dx = this.getCurrentTouchX(0) - this.getCurrentTouchX(1);
  var dy = this.getCurrentTouchY(0) - this.getCurrentTouchY(1);
  return Math.sqrt(dx * dx + dy * dy);
};
