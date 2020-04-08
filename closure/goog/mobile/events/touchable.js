
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
 * @fileoverview Touchable Interface.
 */

goog.provide('wireless.events.Touchable');



/**
 * Any touchable object (i.e. objects that want to be notified of touch
 * events).
 * @interface
 */
wireless.events.Touchable = function() {};


/**
 * Provide the HTML element that should respond to touch events.
 * @return {!Element} the HTML element.
 */
wireless.events.Touchable.prototype.getElement = goog.abstractMethod;


/**
 * The object has received a touchstart event.
 * @param {!TouchEvent} e The touchstart event.
 * @return {boolean} Return true if you want to allow a drag sequence to begin,
 *      false you want to disable dragging for the duration of this touch.
 */
wireless.events.Touchable.prototype.onTouchStart = goog.abstractMethod;


/**
 * The object has received a touchend event.
 * @param {TouchEvent} e The touchend event. Null in the case that the touch
 *     has ended but the touchEnd event has not been reported by the browser.
 */
wireless.events.Touchable.prototype.onTouchEnd = goog.abstractMethod;
