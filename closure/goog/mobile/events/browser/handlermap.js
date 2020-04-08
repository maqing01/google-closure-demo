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
 * @fileoverview Dispatches events to a collection of callbacks based on control
 * type. Also defines a global root handler that receives events from handlers
 * hardcoded in Soy and ClearSilver templates via an exported function _x().
 */

goog.provide('wireless.events.browser.HandlerMap');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.log');
goog.require('wireless.events.browser.ControlType');
goog.require('wireless.events.browser.Dispatcher');



/**
 * Manages a collection of callbacks.
 * @param {*} defaultContext The default context to use for the callback
 *     functions.
 * @param {string} contextName The name associated with this handler map (used
 *     for logging).
 * @constructor
 * @extends {wireless.events.browser.Dispatcher}
 */
wireless.events.browser.HandlerMap = function(defaultContext, contextName) {
  goog.base(this, contextName);

  /**
   * The default context to use for the callback functions.
   * @type {*}
   * @private
   */
  this.defaultContext_ = defaultContext;

  /**
   * An array containing registered callbacks and their associated contexts.
   * @type {!Array}
   * @private
   */
  this.callbacks_ = [];

  /**
   * The map of registered callbacks. Maps control types to indices into the
   * callbacks array.
   * @type {!Object.<wireless.events.browser.ControlType, number>}
   * @private
   */
  this.handlerMap_ = {};
};
goog.inherits(wireless.events.browser.HandlerMap,
    wireless.events.browser.Dispatcher);


/**
 * Whether to enable the resetForTests() functionality. This can be turned on by
 * unit tests.
 * @type {boolean}
 */
wireless.events.browser.HandlerMap.ENABLE_RESET_FOR_TESTS = false;


/**
 * Triplets of Node, Function, EventName of handlers registered using
 * attachEventHandler. This is used only when ENABLE_RESET_FOR_TESTS is true.
 * @type {!Array.<*>}
 * @private
 */
wireless.events.browser.HandlerMap.attachedEventHanders_ = [];


/**
 * The event entry point.
 * @type {string}
 */
wireless.events.browser.HandlerMap.EVENT_ENTRY_POINT = '_x';


/**
 * The root handler map.
 * @type {!wireless.events.browser.HandlerMap}
 * @private
 */
wireless.events.browser.HandlerMap.root_ =
    new wireless.events.browser.HandlerMap(undefined, 'root');


/**
 * Gets the root handler map.
 * @return {!wireless.events.browser.HandlerMap} The root handler map.
 */
wireless.events.browser.HandlerMap.getRoot = function() {
  return wireless.events.browser.HandlerMap.root_;
};


/**
 * Dispatches an incoming browser event to the root handler map.
 * @param {Event|undefined} nativeEvent The event object from the browser.
 * @param {!wireless.events.browser.ControlType} controlType The controlType
 *     for the event.
 * @param {*} opt_customArg A custom argument to send with the event.
 * @return {boolean|undefined} True iff the event was successfully dispatched.
 */
wireless.events.browser.HandlerMap.dispatchEventToRoot = function(
    nativeEvent, controlType, opt_customArg) {
  return wireless.events.browser.HandlerMap.getRoot().dispatchEvent(
      nativeEvent, controlType, opt_customArg);
};

goog.exportSymbol(wireless.events.browser.HandlerMap.EVENT_ENTRY_POINT,
    wireless.events.browser.HandlerMap.dispatchEventToRoot);


/**
 * Installs an error handler for the event entry point.
 * @param {!goog.debug.ErrorHandler} errorHandler Error handler.
 */
wireless.events.browser.HandlerMap.setErrorHandler = function(errorHandler) {
  var fn = errorHandler.protectEntryPoint(
      wireless.events.browser.HandlerMap.dispatchEventToRoot);
  goog.exportSymbol(wireless.events.browser.HandlerMap.EVENT_ENTRY_POINT, fn);
};


/**
 * Register an event handler on the given node. The given node must not
 * already have an event handler of the given type.
 * @param {Node|Window|Document} node The node to register the event handler on.
 * @param {string} eventName The name of the event. eg: "click".
 * @param {!wireless.events.browser.ControlType} controlType The controlType for
 *     the event.
 * @param {*} opt_customArg A custom argument to send with the event.
 */
wireless.events.browser.HandlerMap.attachEventHandler =
    function(node, eventName, controlType, opt_customArg) {
  goog.asserts.assert(node, 'attachEventHandler: node missing');
  goog.asserts.assert(eventName, 'attachEventHandler: eventName missing');
  goog.asserts.assert(controlType, 'attachEventHandler: controlType missing');
  // Make sure this isn't clobbering an already registered handler.
  if (goog.DEBUG) {
    var eventProperty = 'on' + eventName.toLowerCase();
    goog.asserts.assert(!node[eventProperty],
        'attachEventHandler: event already registered: ' + eventName);
    node[eventProperty] = goog.nullFunction;
  }
  function handler(event) {
    wireless.events.browser.HandlerMap.dispatchEventToRoot(event, controlType,
        opt_customArg);
  }
  node.addEventListener(eventName, handler, /* capture */ false);

  if (wireless.events.browser.HandlerMap.ENABLE_RESET_FOR_TESTS) {
    wireless.events.browser.HandlerMap.attachedEventHanders_.push(node, handler,
        eventName);
  }
};


/**
 * @param {!Event} e The native event.
 * @return {string} A string to log that describes the event.
 * @private
 */
wireless.events.browser.HandlerMap.createNativeEventLoggingText_ = function(e) {
  var ret = 'BrowserType=' + e.type;
  if (e.which) {
    ret += ' key=' + e.which;
  }
  return ret;
};


/**
 * Resets the root handler and removes all listeners added by
 * attachEventHandler.
 */
wireless.events.browser.HandlerMap.resetForTests = function() {
  goog.asserts.assert(wireless.events.browser.HandlerMap.ENABLE_RESET_FOR_TESTS,
      'resetForTests is only for tests.');
  var handlers = wireless.events.browser.HandlerMap.attachedEventHanders_;
  for (var i = 0; i < handlers.length; i += 3) {
    var node = handlers[i];
    var func = handlers[i + 1];
    var eventName = handlers[i + 2];
    node.removeEventListener(eventName, func);
    node['on' + eventName.toLowerCase()] = null;
  }
  handlers.length = 0;
  wireless.events.browser.HandlerMap.root_ =
      new wireless.events.browser.HandlerMap(undefined, 'root');
};


/**
 * Registers the given function as a handler for the given control type.
 * @param {wireless.events.browser.ControlType} controlType The control type.
 * @param {Function} handlerFunc The callback. This function will be invoked
 *     with three parameters: the native browser event, the control type, and
 *     the optional custom argument.
 * @param {*=} opt_context Context for handlerFunc. If unspecified, the default
 *     context for this handler map will be used.
 * @return {!wireless.events.browser.HandlerMap} This handler map, for chaining.
 */
wireless.events.browser.HandlerMap.prototype.registerHandler =
    function(controlType, handlerFunc, opt_context) {
  goog.asserts.assert(controlType, this.name + ' - registerHandler: ' +
      'Missing controlType.');
  goog.asserts.assert(handlerFunc, this.name + ' - registerHandler: ' +
      'Missing handlerFunc. controlType: ' + controlType);
  goog.asserts.assert(!this.handlerMap_[controlType],
      this.name + ' - registerHandler: ' +
      'Handler already defined. controlType: ' + controlType);
  var callbackSlot = this.callbacks_.push(handlerFunc,
      opt_context || this.defaultContext_) - 2;
  this.handlerMap_[controlType] = callbackSlot;
  return this;
};


/** @override */
wireless.events.browser.HandlerMap.prototype.handleEvent = function(nativeEvent,
    controlType, opt_customArg, opt_dispatchPath) {
  var callbackSlot = this.handlerMap_[controlType];

  // We cannot just check if (callbackSlot) because this will fail for slot 0.
  if (goog.isDef(callbackSlot)) {
    this.logEvent_(nativeEvent, controlType, opt_customArg, opt_dispatchPath);
    var callback = this.callbacks_[callbackSlot];
    var context = this.callbacks_[callbackSlot + 1];
    callback.call(context, nativeEvent, controlType, opt_customArg);
    return true;
  }
};


/**
 * Logs that the event is being handled.
 * @param {Event|undefined} nativeEvent The event object from the browser.
 * @param {!wireless.events.browser.ControlType} controlType The controlType
 *     for the event.
 * @param {*} opt_customArg A custom argument to send with the event.
 * @param {string} opt_dispatchPath Parent dispatcher names for logging.
 * @private
 */
wireless.events.browser.HandlerMap.prototype.logEvent_ =
    function(nativeEvent, controlType, opt_customArg, opt_dispatchPath) {
  if (this.logger.isLoggable(goog.log.Level.INFO) &&
      !wireless.events.browser.ControlType.isControlTypeSilenced(controlType)) {
    var nativeEventPart = '';
    if (nativeEvent) {
      nativeEventPart = ' (' +
          wireless.events.browser.HandlerMap.createNativeEventLoggingText_(
              nativeEvent) + ')';
    }
    var customArgPart = '';
    if (goog.isDef(opt_customArg)) {
      customArgPart = ' customArg: ' + opt_customArg;
    }
    goog.log.info(this.logger, (opt_dispatchPath || '') + this.name +
        ' handling event: ' + controlType + customArgPart + nativeEventPart);
  }
};
