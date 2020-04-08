/**
 * @fileoverview An object which provides the ability to coalesce event handlers
 * for performance reasons.  Experimentation on iOS7 safari found that adding
 * one event handler that ran for 15 ms resulted in smoother scrolling than 15
 * event handlers which took 1 ms each.  Thus coalescing 15 handlers into one
 * improved scrolling performance and smoothness.
 *
 * @author Daniel Brotherston (danbrotherston@google.com)
 */

goog.provide('wireless.events.ListenerCoalescer');

goog.require('goog.asserts');
goog.require('goog.log');



/**
 * An EventTarget object which provides the ability to coalesce event
 * handlers for performance reasons.
 * @param {!EventTarget} element The event target to coalesce events for.
 * @constructor
 */
wireless.events.ListenerCoalescer = function(element) {
  /**
   * The element which is the event target to coalesce events for.
   * @type {!EventTarget}
   * @private
   */
  this.element_ = element;

  goog.asserts.assert(
      !this.element_[wireless.events.ListenerCoalescer.TARGET_PROPERTY_]);

  // Assign this object to the element.
  this.element_[wireless.events.ListenerCoalescer.TARGET_PROPERTY_] = this;

  /**
   * Mapping to keep track of if there is an event handler running.
   * @private {!Object.<number>}
   */
  this.eventInProgress_ = {};

  /**
   * Mapping to store the subscribers to each event type.
   * @private {!Object.<!Array.<!Function>|undefined>}
   */
  this.eventSubscribers_ = {};

  /**
   * Bound event handlers for each event type, allows handlers to be added and
   * removed from the DOM element.
   * @private {!Object.<!Function>}
   */
  this.boundEventHandlers_ = {};
};



/**
 * Constant property name to store the coalescing event target property for dom
 * elements.
 * @private {string}
 */
wireless.events.ListenerCoalescer.TARGET_PROPERTY_ = '_wect';


/**
 * Logger to log exceptions during event handling.
 * @private {goog.log.Logger}
 */
wireless.events.ListenerCoalescer.prototype.logger_ =
    goog.log.getLogger('wireless.events.ListenerCoalescer');


/**
 * Returns the coalescingEventTarget object associated with the provided event
 * target.
 * @param {!EventTarget} target The event target to get the coalescing event
 *     target for.
 * @return {!wireless.events.ListenerCoalescer} The associated coalescing
 *     event target.
 */
wireless.events.ListenerCoalescer.getListenerCoalescer =
    function(target) {
  var targetProperty = wireless.events.ListenerCoalescer.TARGET_PROPERTY_;
  if (!target[targetProperty]) {
    new wireless.events.ListenerCoalescer(target);
  }

  return target[targetProperty];
};


/**
 * Event handler for an eventType.
 * @param {string} eventType The type of the event to handle.
 * @param {Event} e The Event object.
 * @private
 */
wireless.events.ListenerCoalescer.prototype.handleEvent_ =
    function(eventType, e) {
  if (this.eventInProgress_[eventType] == undefined) {
    this.eventInProgress_[eventType] = 0;
  }

  var oldEventInProgress = this.eventInProgress_[eventType];
  this.eventInProgress_[eventType]++;
  // This is done intentionally, we must copy the array pointer into a local
  // variable so that if one of the event handlers modifies the list of
  // subscribers by adding or removing a handler, it can clone the array without
  // upsetting iteration here.
  var eventSubscribers = this.eventSubscribers_[eventType];
  var numSubscribers = eventSubscribers.length;
  var exception;
  for (var i = 0; i < numSubscribers; i++) {
    /** @preserveTry */
    try {
      eventSubscribers[i](e);
    } catch (ex) {
      goog.log.warning(this.logger_, 'Exception during event processing.', ex);
      exception = exception || ex;
    }
  }
  this.eventInProgress_[eventType]--;

  goog.asserts.assert(this.eventInProgress_[eventType] == oldEventInProgress);
  goog.asserts.assert(this.eventInProgress_[eventType] >= 0);

  if (exception) {
    throw exception;
  }
};


/**
 * Returns a bound event handler for the given type and capture.
 * @param {string} eventType The type of the event to handle.
 * @return {!Function} The event handler for this event type and capture, it
 *     will remain the same so it can be added and removed.
 * @private
 */
wireless.events.ListenerCoalescer.prototype.getOrCreateEventHandler_ =
    function(eventType) {
  if (!this.boundEventHandlers_[eventType]) {
    this.boundEventHandlers_[eventType] =
        goog.bind(this.handleEvent_, this, eventType);
  }

  return this.boundEventHandlers_[eventType];
};


/**
 * Gets the event type key given an event type and capture value.
 * @param {wireless.events.EventType|string} eventType The name of the event to
 *     get the key for.
 * @param {boolean} capture The capture value for this event key.
 * @return {string} The event type key to store event handlers.
 * @private
 */
wireless.events.ListenerCoalescer.prototype.getEventTypeKey_ =
    function(eventType, capture) {
  return eventType + ':' + (capture ? 'capture' : 'bubble');
};


/**
 * Adds a coalesced EventHandler to this target.
 * @param {wireless.events.EventType|string} eventType The event type to listen
 *     for.
 * @param {function(Event)|function(!Event)} handler The event callback.
 * @param {boolean=} opt_capture True if the listener should get events on the
 *     capture phase.
 */
wireless.events.ListenerCoalescer.prototype.subscribeToEvent =
    function(eventType, handler, opt_capture) {
  var capture = !!opt_capture;
  var eventTypeKey = this.getEventTypeKey_(eventType, capture);

  if (!this.eventSubscribers_[eventTypeKey]) {
    this.eventSubscribers_[eventTypeKey] = [];
    this.element_.addEventListener(eventType,
        this.getOrCreateEventHandler_(eventTypeKey), capture);
  }

  // This is currently safe during an event handler, because this will push an
  // event on the end of the list, and thus the event handler loop iteration
  // will never get to it, or the event has already removed a handler and this
  // is pushing onto an entirely new list.
  this.eventSubscribers_[eventTypeKey].push(handler);
};


/**
 * Removes an event handler from the object of the given type and removes the
 * coaleseced handler if there are no sub-handlers remaining.
 * @param {wireless.events.EventType|string} eventType The event type to listen
 *     for.
 * @param {function(Event)|function(!Event)} handler The event callback.
 * @param {boolean=} opt_capture True if the listener should get events on the
 *     capture phase.
 */
wireless.events.ListenerCoalescer.prototype.unsubscribeFromEvent =
    function(eventType, handler, opt_capture) {
  var capture = !!opt_capture;
  var eventTypeKey = this.getEventTypeKey_(eventType, capture);
  if (!this.eventSubscribers_[eventTypeKey]) {
    return;
  }
  if (this.eventInProgress_[eventTypeKey]) {
    // This is done in order to support the case where the an event handler
    // removes an event handler during its execution.  If a remove is called
    // during handling of an event, we clone the array so we can modify it
    // without upsetting the execution of other handlers.
    this.eventSubscribers_[eventTypeKey] =
        this.eventSubscribers_[eventTypeKey].slice(0);
  }

  var index = this.eventSubscribers_[eventTypeKey].indexOf(handler);
  if (index != -1) {
    this.eventSubscribers_[eventTypeKey].splice(index, 1);
  }

  if (this.eventSubscribers_[eventTypeKey].length == 0) {
    this.eventSubscribers_[eventTypeKey] = undefined;
    this.element_.removeEventListener(eventType,
        this.getOrCreateEventHandler_(eventTypeKey), capture);
  }
};
