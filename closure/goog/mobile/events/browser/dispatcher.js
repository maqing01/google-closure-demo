
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
 * @fileoverview Abstract class that defines the dispatchEvent() function for
 * dispatching events. The standard implementation of this class is HandlerMap,
 * but applications are free to define their own custom dispatchers if they
 * require more complex logic for determining how events should be dispatched.
 */

goog.provide('wireless.events.browser.Dispatcher');

goog.require('goog.array');
goog.require('goog.log');



/**
 * Abstract base class for event dispatchers.
 * @param {string} name The name of the dispatcher.
 * @constructor
 */
wireless.events.browser.Dispatcher = function(name) {
  /**
   * Dispatchers to forward the event to if it cannot be handled by this
   * dispatcher.
   * @type {!Array.<!wireless.events.browser.Dispatcher>}
   * @private
   */
  this.children_ = [];

  // We need the context name if we are logging INFO messages.
  if (goog.DEBUG || this.logger.isLoggable(goog.log.Level.INFO)) {
    /**
     * The name associated with this dispatcher.
     * @type {string|undefined}
     * @protected
     */
    this.name = name;
  }
};


/**
 * The logger for this package.
 * @type {goog.log.Logger}
 * @protected
 */
wireless.events.browser.Dispatcher.prototype.logger =
    goog.log.getLogger('wireless.events.browser.Dispatcher');


/**
 * Tries to handle an event.
 * @param {Event|undefined} nativeEvent The event object from the browser.
 * @param {!wireless.events.browser.ControlType} controlType The controlType
 *     for the event.
 * @param {*} opt_customArg A custom argument to send with the event.
 * @param {string} opt_dispatchPath Parent dispatcher names for logging.
 * @return {boolean|undefined} True iff the event was handled.
 */
wireless.events.browser.Dispatcher.prototype.handleEvent = goog.abstractMethod;


/**
 * Dispatches an incoming browser event.
 * @param {Event|undefined} nativeEvent The event object from the browser.
 * @param {!wireless.events.browser.ControlType} controlType The controlType
 *     for the event.
 * @param {*} opt_customArg A custom argument to send with the event.
 * @param {string} opt_dispatchPath Parent dispatcher names for logging.
 * @return {boolean|undefined} Returns true iff at least one handler was called.
 */
wireless.events.browser.Dispatcher.prototype.dispatchEvent = function(
    nativeEvent, controlType, opt_customArg, opt_dispatchPath) {
  var broadcast =
      wireless.events.browser.ControlType.isControlTypeBroadcastable(
          controlType);
  var wasCalled;
  if (this.handleEvent(nativeEvent, controlType, opt_customArg,
      opt_dispatchPath)) {
    wasCalled = true;
  }

  var dispatchPath;
  if (goog.DEBUG || this.logger.isLoggable(goog.log.Level.INFO)) {
    dispatchPath = (opt_dispatchPath || '') + this.name + '->';
  }
  var i = -1;
  var child;
  // If it is not a broadcast control type, it should return as soon as one of
  // the child handlers handles the event.
  while ((!wasCalled || broadcast) && (child = this.children_[++i])) {
    wasCalled = child.dispatchEvent(
        nativeEvent, controlType, opt_customArg, dispatchPath) || wasCalled;
  }
  if (goog.DEBUG || this.logger.isLoggable(goog.log.Level.INFO)) {
    if (!wasCalled && !opt_dispatchPath) {
      goog.log.warning(this.logger, 'Event not handled: ' + controlType +
          ' type: ' + (nativeEvent ? nativeEvent.type : 'none') +
          ' customArg: ' + opt_customArg);
    }
  }
  return wasCalled;
};


/**
 * @return {!Array.<!wireless.events.browser.Dispatcher>} Child dispatchers.
 */
wireless.events.browser.Dispatcher.prototype.getChildren = function() {
  return this.children_;
};


/**
 * Returns whether this dispatcher already contains the given child dispatcher.
 * @param {!wireless.events.browser.Dispatcher} dispatcher The child dispatcher
 *     to check.
 * @return {boolean} True if this dispatcher already contains the given child
 *     dispatcher, or false otherwise.
 */
wireless.events.browser.Dispatcher.prototype.containsChildDispatcher =
    function(dispatcher) {
  return goog.array.contains(this.children_, dispatcher);
};


/**
 * Adds a child handler function that will be invoked if there is no handler
 * mapped for an incoming event's control type.
 * @param {!wireless.events.browser.Dispatcher} dispatcher The dispatcher.
 */
wireless.events.browser.Dispatcher.prototype.appendChildDispatcher =
    function(dispatcher) {
  this.children_.push(dispatcher);
};


/**
 * Removes a child dispatcher. Has no effect if the given dispatcher is not a
 * child.
 * @param {wireless.events.browser.Dispatcher} dispatcher The dispatcher to
 *     remove.
 */
wireless.events.browser.Dispatcher.prototype.removeChildDispatcher =
    function(dispatcher) {
  goog.array.remove(this.children_, dispatcher);
};


/**
 * Removes all child dispatchers.
 */
wireless.events.browser.Dispatcher.prototype.removeAllChildDispatchers =
    function() {
  goog.array.clear(this.children_);
};
