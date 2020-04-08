
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
 * @fileoverview Common touch events related helpers.
 */

goog.provide('wireless.events.touch');

goog.require('goog.math.Coordinate');
goog.require('wireless.WindowHelper');
goog.require('wireless.device');
goog.require('wireless.events');



/** @define {boolean} Skips client-side touchevents detection. */
wireless.events.touch.ASSUME_SUPPORTS_TOUCHES = false;


/**
 * Tests whether touches are supported. Indirection for testing support.
 * Use wireless.events.touch.SUPPORTS_TOUCHES.
 * @private
 * @return {boolean} Whether the touch api is supported.
 */
wireless.events.touch.supportsTouches_ = function() {
  return wireless.events.touch.ASSUME_SUPPORTS_TOUCHES ||
      wireless.device.isMobileSafari() || wireless.device.isAndroid() ||
      wireless.device.isKindleFireDesktop();
};


/**
 * Tests whether Microsoft's Pointer-based touches are supported. Indirection
 * for testing support.
 * Use wireless.events.touch.SUPPORTS_POINTER.
 * @private
 * @return {boolean} Whether the pointer api is supported.
 */
wireless.events.touch.supportsPointer_ = function() {
  // Use feature detection only, in case IE is running in Compatibility Mode.
  return window.navigator.msPointerEnabled;
};


/**
 * Whether the browser supports Apple-style touches. We don't do feature
 * detection because it doesn't work correctly on certain desktop browsers
 * (Chrome as of now). We also don't use Closure's goog.useragent to avoid code
 * bloat.
 * @type {boolean}
 */
wireless.events.touch.SUPPORTS_TOUCHES =
    wireless.events.touch.supportsTouches_();


/**
 * Whether the browser supports Microsoft's Pointer-based touches.
 * @see http://blogs.msdn.com/b/ie/archive/2011/09/20/touch-input-for-ie10-and-metro-style-apps.aspx
 * @type {boolean}
 */
wireless.events.touch.SUPPORTS_POINTER =
    wireless.events.touch.supportsPointer_();


/**
 * Start event name.
 * @type {string}
 */
wireless.events.touch.START_EVENT = wireless.events.touch.SUPPORTS_TOUCHES ?
    'touchstart' : wireless.events.touch.SUPPORTS_POINTER ?
        'MSPointerDown' : 'mousedown';


/**
 * Move event name.
 * @type {string}
 */
wireless.events.touch.MOVE_EVENT = wireless.events.touch.SUPPORTS_TOUCHES ?
    'touchmove' : wireless.events.touch.SUPPORTS_POINTER ? 'MSPointerMove' :
        'mousemove';


/**
 * End event name.
 * @type {string}
 */
wireless.events.touch.END_EVENT = wireless.events.touch.SUPPORTS_TOUCHES ?
    'touchend' : wireless.events.touch.SUPPORTS_POINTER ? 'MSPointerUp' :
        'mouseup';


/**
 * Cancel event name.
 * @type {string}
 */
wireless.events.touch.CANCEL_EVENT = wireless.events.touch.SUPPORTS_POINTER ?
    'MSPointerCancel' : 'touchcancel';


/**
 * Helper method to attach event listeners to a node.
 * @param {Element} node The node to attach listeners to.
 * @param {function(!Event)|function(!TouchEvent)} onStart The start event
 *     callback.
 * @param {function(!Event)|function(!TouchEvent)} onMove The move event
 *     callback.
 * @param {function(!Event)|function(!TouchEvent)} onEnd The end event callback.
 * @param {function(!Event)|function(!TouchEvent)} onCancel The cancel event
 *     callback.
 * @param {boolean=} opt_capture True if the the listeners should be on the
 *     capture phase.
 * @param {boolean=} opt_removeHandlerOnFocus True if you want the handler to be
 *     removed when there is any focus event, and added back on blur events.
 */
wireless.events.touch.addEventListeners = function(node, onStart, onMove,
    onEnd, onCancel, opt_capture, opt_removeHandlerOnFocus) {
  if (!wireless.events.touch.SUPPORTS_TOUCHES &&
      !wireless.events.touch.SUPPORTS_POINTER) {
    onStart = wireless.events.touch.mouseToTouchCallback(onStart);
    onMove = wireless.events.touch.mouseToTouchCallback(onMove);
    onEnd = wireless.events.touch.mouseToTouchCallback(onEnd);
  }
  var target = /** @type {!EventTarget} */ (node);
  var capture = !!opt_capture;
  wireless.events.observe(target, wireless.events.touch.START_EVENT, onStart,
      capture, opt_removeHandlerOnFocus);
  wireless.events.observe(target, wireless.events.touch.MOVE_EVENT, onMove,
      capture, opt_removeHandlerOnFocus);
  wireless.events.observe(target, wireless.events.touch.END_EVENT, onEnd,
      capture, opt_removeHandlerOnFocus);
  wireless.events.observe(target, wireless.events.touch.CANCEL_EVENT, onCancel,
      capture, opt_removeHandlerOnFocus);
};


/**
 * Wraps a callback with translations of mouse events to touch events. Use this
 * function to invoke your callback that expects touch events after touch events
 * are created from the actual mouse events.
 * @param {function(!TouchEvent)} callback The event callback.
 * @return {function(!Event)} The wrapping callback.
 */
wireless.events.touch.mouseToTouchCallback = function(callback) {
  return function(e) {
    e.touches = [];
    e.targetTouches = [];
    e.changedTouches = [];
    if (e.type == wireless.events.touch.END_EVENT) {
      e.changedTouches[0] = e;
    } else {
      e.touches[0] = e;
      e.targetTouches[0] = e;
      e.changedTouches[0] = e;
    }
    callback(e);
  };
};


/**
 * Gets the coordinates of a touch's location relative to the window's viewport.
 * @param {!Touch|!Event} input The input, either a touch object or an event
 *     object.
 * @return {!goog.math.Coordinate} The touch coordinate relative to the
 *     viewport.
 */
wireless.events.touch.getClientCoordinate = function(input) {
  if (wireless.device.browserHasBrokenTouchStartClientCoords()) {
    return new goog.math.Coordinate(input.clientX,
                                    input.pageY - window.scrollY);
  } else {
    return new goog.math.Coordinate(input.clientX, input.clientY);
  }
};


/**
 * Given a touch or pointer event, return the unified touches lists.
 * On browsers supporting the iOS touch API this is event.touches.  Otherwise
 * it is an array of the event itself.
 * @param {!Event} e The touch or pointer event.
 * @return {!Array.<Event>|!TouchList} The touches list.
 */
wireless.events.touch.getTouches = function(e) {
  // NOTE(mgaiman): As of the Windows 8 release preview, getPointerList() has
  // been removed, so there's now no way to inspect other pointers from a given
  // pointer event.  For now in Windows 8, we're punting and just assuming only
  // one pointer is around.  This isn't great and hopefully MS will provide a
  // better API eventually.
  return e.touches || [e];
};


/**
 * Given a touch or pointer event, return the unified changed touches list.
 * On browsers supporting the iOS touch API this is event.changedTouches.  On
 * browsers supporting MSPointer this is an array of the event itself.
 * See http://msdn.microsoft.com/en-us/library/windows/apps/hh441233.aspx for
 * details on MSPointerEvents.
 * @param {!Event} e The touch or pointer event.
 * @return {!Array.<!Event>|!TouchList} The changed touches list.
 */
wireless.events.touch.getChangedTouches = function(e) {
  return (wireless.events.touch.SUPPORTS_POINTER ?
      [e] : e.changedTouches) || [];
};


/**
 * Given a touch or pointer event, return the unified target touches list.
 * On browsers supporting the iOS touch API this is event.targetTouches.  On
 * browsers supporting MSPointer this is an array of the event itself.
 * See http://msdn.microsoft.com/en-us/library/windows/apps/hh441233.aspx for
 * details on MSPointerEvents.
 * @param {!Event} e The touch or pointer event.
 * @return {!Array.<!Event>|!TouchList} The touches list.
 */
wireless.events.touch.getTargetTouches = function(e) {
  return (wireless.events.touch.SUPPORTS_POINTER ? [e] : e.targetTouches) || [];
};


/**
 * Given a touch or pointer event, return the unique identifier for that event.
 * @param {!Touch|!MSPointerEvent} e The touch or pointer event.
 * @return {number} The identifier.
 */
wireless.events.touch.getTouchId = function(e) {
  return wireless.events.touch.SUPPORTS_POINTER ?
      /** @type {!MSPointerEvent} */ (e).pointerId :
      /** @type {!Touch} */ (e).identifier;
};


/**
 * Given a touch or pointer event, return the number of touches associated with
 * the event.
 * @param {!Event} e The touch or pointer event.
 * @return {number} The touch count.
 */
wireless.events.touch.getTouchCount = function(e) {
  return wireless.events.touch.getTouches(e).length;
};
