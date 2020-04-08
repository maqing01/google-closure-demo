

goog.provide('office.structs.ValueHolder');

goog.require('goog.events');
goog.require('goog.events.EventTarget');



/**
 * An object that holds a reference to a value.
 *
 * TODO (krejci): Replace all instances of ObservableProperty and
 * MutableProperty with this class.
 * @param {T} initialValue The initial value to hold.
 * @extends {goog.events.EventTarget}
 * @constructor
 * @template T
 */
office.structs.ValueHolder = function(initialValue) {
  goog.base(this);

  /**
   * The value held by this object.
   * @private {T}
   */
  this.value_ = initialValue;
};
goog.inherits(office.structs.ValueHolder, goog.events.EventTarget);


/**
 * The events dispatched by the value holder.
 * @enum {string}
 */
office.structs.ValueHolder.EventType = {
  VALUE_UPDATED: goog.events.getUniqueId('valueUpdated')
};


/**
 * @return {T} The value held by this object.
 */
office.structs.ValueHolder.prototype.getValue = function() {
  return this.value_;
};


/**
 * Updates the value held by this holder.
 * @param {T} value The value to be held by this object.
 */
office.structs.ValueHolder.prototype.setValue = function(value) {
  this.value_ = value;
  this.dispatchEvent(office.structs.ValueHolder.EventType.VALUE_UPDATED);
};
