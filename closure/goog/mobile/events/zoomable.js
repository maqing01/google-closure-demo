
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
 * @fileoverview Zoomable Interface.
 *
 * An interface that enables objects to be informed of zoom/pinch actions.
 * An object that implements this interface and calls setZoomable method of
 * the Gesture Manager (see gesturemanager.js), will be notified on the start,
 * move, and end of the zooming action. Once notified, the object can retrive
 * information about the zooming action from the Zoom Handler (zoomhandler.js).
 */

goog.provide('wireless.events.Zoomable');



/**
 * Any zoomable object (i.e. objects that want to be notified about the
 * progress of their zooming).
 * @extends {wireless.events.Touchable}
 * @interface
 */
wireless.events.Zoomable = function() {};


/**
 * The object has started zooming.
 * @param {!TouchEvent} e The touchmove event.
 * @return {boolean} True to allow a zoom sequence to begin (custom behavior),
 *      false to disable zooming for this touch duration (allow native
 *      zooming).
 */
wireless.events.Zoomable.prototype.onZoomStart = goog.abstractMethod;


/**
 * The object has been zoomed to a new scale.
 * @param {!TouchEvent} e The touchmove event.
 */
wireless.events.Zoomable.prototype.onZoomMove = goog.abstractMethod;


/**
 * The object's zoom sequence is now complete.
 * @param {TouchEvent} e The touchend event. Null in the case that the touch
 *     has ended but the touchEnd event has not been reported by the browser.
 */
wireless.events.Zoomable.prototype.onZoomEnd = goog.abstractMethod;
