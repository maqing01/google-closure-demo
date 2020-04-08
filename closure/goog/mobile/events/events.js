
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
 * @fileoverview Common events related helpers.
 */

goog.provide('wireless.events');

goog.require('wireless.events.EventType');
goog.require('wireless.events.ListenerCoalescer');


/**
 * Removes an event listener from an element.  Events which were listened to
 * with opt_removeHandlerOnFocus cannot be unobserved.
 * @param {!EventTarget} element The element to add the listener to.
 * @param {wireless.events.EventType|string} eventType The event type to listen
 *     for.
 * @param {function(Event)|function(!Event)} handler The event callback.
 * @param {boolean=} opt_capture True if the listener should get events on the
 *     capture phase.
 */
wireless.events.unobserve = function(element, eventType, handler, opt_capture) {
  var listenerCoalescer =
      wireless.events.ListenerCoalescer.getListenerCoalescer(element);
  listenerCoalescer.unsubscribeFromEvent(eventType, handler, opt_capture);
};


/**
 * Add an event listener to an element.
 * @param {!EventTarget} element The element to add the listener to.
 * @param {wireless.events.EventType|string} eventType The event type to listen
 *     for.
 * @param {function(Event)|function(!Event)} handler The event callback.
 * @param {boolean=} opt_capture True if the listener should get events on the
 *     capture phase.
 * @param {boolean=} opt_removeHandlerOnFocus True if you want the handler to be
 *     removed when there is any focus event, and added back on blur events.
 */
wireless.events.observe = function(element, eventType, handler, opt_capture,
                                   opt_removeHandlerOnFocus) {
  // Event listening functions require actual boolean values.
  var listenerCoalescer =
      wireless.events.ListenerCoalescer.getListenerCoalescer(element);
  listenerCoalescer.subscribeToEvent(eventType, handler, opt_capture);

  if (opt_removeHandlerOnFocus) {
    var addFunction = function() {
      listenerCoalescer.subscribeToEvent(eventType, handler, opt_capture);
    };

    var removeFunction = function() {
      listenerCoalescer.unsubscribeFromEvent(eventType, handler, opt_capture);
    };

    wireless.events.addRemoveOnFocusHandlers_(
        element, addFunction, removeFunction);
  }
};


/**
 * Adds handlers which will remove the handler when the  DOM element recieves
 * focus.
 * @param {!EventTarget} element The element to add the listener to.
 * @param {Function} addFunction The function to use to add the listener.
 * @param {Function} removeFunction The function to use to remove the listener.
 * @private
 */
wireless.events.addRemoveOnFocusHandlers_ =
    function(element, addFunction, removeFunction) {
  // This allows you to remove event handlers when any child element gains
  // focus. This is necessary for touch event handlers on iOS 4.2, as we see
  // that native textarea behavior (such as dismissing spelling corrections) are
  // buggy when there exists a parent element with a touch event handler. If
  // this events file were to offer a stopObserving function, then this logic
  // below will need to be modified to stop adding/removing the event handler on
  // focus/blur.
  // 'DOMFocusIn' is the same as 'focus' except it is propagated up the DOM.
  element.addEventListener('DOMFocusIn', function(e) {
    // Remove event listener for TEXTAREA only. Input fields and any elements
    // with a tabindex set can also gain focus. Elements with tabindex can
    // gain focus and never blur, causing the touchstart listener to be
    // removed but never added back. See wireless.events.clickbuster and
    // b/5415375.
    if (e.target && e.target.tagName == 'TEXTAREA') {
      addFunction();
    }
  }, false /* capture */);
  // 'DOMFocusOut' is the same as 'blur' except it is propagated up the DOM.
  element.addEventListener('DOMFocusOut', function(e) {
    if (e.target && e.target.tagName == 'TEXTAREA') {
      removeFunction();
    }
  }, false /* capture */);
};


/**
 * Fire an event at an element. This should not be used if you want any special
 * event details included, like mouse coordinates. For those kind of events you
 * should use a more specific event initialization function like initMouseEvent.
 * This function can be used to fire custom events. For example:
 * - var eventType = wireless.events.createEventType('custom:event');
 * - wireless.events.fire(element, eventType);
 * This example would fire an event with type == 'custom:event'. This can be
 * useful for decoupling your objects and sending events through the DOM rather
 * than implementing callbacks or publish/subscribe models.
 * @param {!EventTarget} element The element to fire the event at.
 * @param {wireless.events.EventType} eventType The type of event that should
 *      be fired.
 * @param {!Object} sender The context responsible for sending the event.
 * @param {*=} opt_extraArg The event can carry one optional argument.
 */
wireless.events.fire = function(element, eventType, sender, opt_extraArg) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(eventType, true, true);
  event.sender = sender;
  event.extraArg = opt_extraArg;
  element.dispatchEvent(event);
};


/**
 * Clear the keyboard focus of the currently focused element (if there is one).
 * If there is no currently focused element then this function will do nothing.
 * For most browsers this will cause the keyboard to be dismissed.
 */
wireless.events.blurFocusedElement = function() {
  var focusedEl = document.querySelector('*:focus');
  if (!focusedEl) {
    return;
  }
  focusedEl.blur();
};


/**
 * Forces a blur on a dummy textarea in hopes of more reliably dismissing the
 * keyboard. Use this function to workaround cases where blur does not naturally
 * dismiss the on screen keyboard. An example of this is in iOS 5 where blurring
 * while focus is on contentEditable divs does not cause the keyboard to hide.
 * This function provides a workaround for this bug. rjfioravanti has filed a
 * bug with Apple about this. See b/5644027 for more details.
 */
wireless.events.forceBlur = function() {
  var dummy = document.createElement('textarea');

  // This textarea needs to be positioned at the current window scroll value
  // so that no scrolling happens when focus is called on the dummy.
  var topPos = window.scrollY;
  // Positioning at the current x-value is required to fix b/12193002. Without
  // this, iOS attempts to refocus the screen when the next textarea is
  // selected, but it doesn't refocus properly and ends up positioning the
  // cursor off-screen.
  var leftPos = window.scrollX;
  dummy.style.cssText =
      'position:absolute;left:' + leftPos + 'px;top:' + topPos + 'px;';
  document.body.appendChild(dummy);
  dummy.focus();
  document.body.removeChild(dummy);
};
