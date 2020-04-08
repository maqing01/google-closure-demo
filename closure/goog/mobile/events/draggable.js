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
 * @fileoverview Draggable Interface.
 *
 * An interface that enables objects to be informed of dragging actions.
 * An object that implements this interface and calls setDraggable method of
 * the Gesture Manager (see gesturemanager.js), will be notified on the start,
 * move, and end of the dragging action. Once notified, the object can retrive
 * information about the dragging action from the Drag Handler (draghandler.js).
 */

goog.provide('wireless.events.Draggable');

goog.require('wireless.events.Touchable');



/**
 * Any draggable object (i.e. objects that want to be notified about the
 * progress of their dragging).
 * @extends {wireless.events.Touchable}
 * @interface
 */
wireless.events.Draggable = function() {};


/**
 * The object has started dragging.
 * @param {!TouchEvent} e The touchmove event.
 * @return {boolean} True to allow a drag sequence to begin (custom behavior),
 *      false to disable dragging for this touch duration (allow native
 *      scrolling)
 */
wireless.events.Draggable.prototype.onDragStart = goog.abstractMethod;


/**
 * The object has been dragged to a new position.
 * @param {!TouchEvent} e The touchmove event.
 */
wireless.events.Draggable.prototype.onDragMove = goog.abstractMethod;


/**
 * The object's drag sequence is now complete.
 * @param {TouchEvent} e The touchend event. Null in the case that the touch
 *     has ended but the touchEnd event has not been reported by the browser.
 */
wireless.events.Draggable.prototype.onDragEnd = goog.abstractMethod;
