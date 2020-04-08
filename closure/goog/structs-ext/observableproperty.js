

/**
 * @fileoverview Interface for a property that can be observed for changes.

 */

goog.provide('office.structs.ObservableProperty');
goog.provide('office.structs.ObservableProperty.Boolean');
goog.provide('office.structs.ObservableProperty.Number');
goog.provide('office.structs.ObservableProperty.String');

goog.require('goog.Disposable');
goog.require('goog.disposable.IDisposable');



/**
 * Interface for a string property that can be observed for changes.
 * NOTE: Implementations are expected to be disposable.
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
office.structs.ObservableProperty = function() {
};


/**
 * Adds a listener that will be called back when this property changes.
 * Listeners are guaranteed to be removed when this object is disposed.
 * @param {function(goog.events.Event=)} listener Function to call when the
 *    property changes.
 * @param {Object=} opt_obj Object in whose scope to call the listener.
 */
office.structs.ObservableProperty.prototype.addChangeListener = function(
    listener, opt_obj) {};



/**
 * Interface for a boolean property that can be observed for changes.
 * NOTE: Implementations are expected to be disposable.
 * @interface
 * @extends {office.structs.ObservableProperty}
 */
office.structs.ObservableProperty.Boolean = function() {
};


/**
 * @return {boolean} The current state of the property.
 */
office.structs.ObservableProperty.Boolean.prototype.getBooleanValue = function() {
};


/**
 * Creates a boolean property for the given immutable value. This property will
 * always return the same value and never fire a change event.
 * @param {boolean} value The immutable value.
 * @return {!office.structs.ObservableProperty.Boolean} The resulting property.
 */
office.structs.ObservableProperty.Boolean.of = function(value) {
  return new office.structs.ObservableProperty.ImmutableBoolean_(value);
};



/**
 * Boolean property that will never change.
 * @param {boolean} value The immutable value.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 * @implements {office.structs.ObservableProperty.Boolean}
 * @private
 */
office.structs.ObservableProperty.ImmutableBoolean_ = function(value) {
  goog.base(this);

  /**
   * The immutable value.
   * @type {boolean}
   * @private
   */
  this.value_ = value;
};
goog.inherits(
    office.structs.ObservableProperty.ImmutableBoolean_, goog.Disposable);


/** @override */
office.structs.ObservableProperty.ImmutableBoolean_.prototype.getBooleanValue =
    function() {
  return this.value_;
};


/** @override */
office.structs.ObservableProperty.ImmutableBoolean_.prototype.addChangeListener =
    function(listener, opt_obj) {};



/**
 * Interface for a string property that can be observed for changes.
 * NOTE: Implementations are expected to be disposable.
 * @interface
 * @extends {office.structs.ObservableProperty}
 */
office.structs.ObservableProperty.String = function() {
};


/**
 * @return {string} The current state of the property.
 */
office.structs.ObservableProperty.String.prototype.getStringValue = function() {};


/**
 * Creates a string property for the given immutable value. This property will
 * always return the same value and never fire a change event.
 * @param {string} value The immutable value.
 * @return {!office.structs.ObservableProperty.String} The resulting property.
 */
office.structs.ObservableProperty.String.of = function(value) {
  return new office.structs.ObservableProperty.ImmutableString_(value);
};



/**
 * String property that will never change.
 * @param {string} value The immutable value.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 * @implements {office.structs.ObservableProperty.String}
 * @private
 */
office.structs.ObservableProperty.ImmutableString_ = function(value) {
  goog.base(this);

  /**
   * The immutable value.
   * @type {string}
   * @private
   */
  this.value_ = value;
};
goog.inherits(
    office.structs.ObservableProperty.ImmutableString_, goog.Disposable);


/** @override */
office.structs.ObservableProperty.ImmutableString_.prototype.getStringValue =
    function() {
  return this.value_;
};


/** @override */
office.structs.ObservableProperty.ImmutableString_.prototype.addChangeListener =
    function(listener, opt_obj) {};



/**
 * Interface for a number property that can be observed for changes.
 * NOTE: Implementations are expected to be disposable.
 * @interface
 * @extends {office.structs.ObservableProperty}
 */
office.structs.ObservableProperty.Number = function() {
};


/**
 * @return {number} The current state of the property.
 */
office.structs.ObservableProperty.Number.prototype.getNumberValue = function() {};


/**
 * Creates a number property for the given immutable value. This property will
 * always return the same value and never fire a change event.
 * @param {number} value The immutable value.
 * @return {!office.structs.ObservableProperty.Number} The resulting property.
 */
office.structs.ObservableProperty.Number.of = function(value) {
  return new office.structs.ObservableProperty.ImmutableNumber_(value);
};



/**
 * Number property that will never change.
 * @param {number} value The immutable value.
 * @constructor
 * @extends {goog.Disposable}
 * @implements {office.structs.ObservableProperty.Number}
 * @private
 */
office.structs.ObservableProperty.ImmutableNumber_ = function(value) {
  goog.base(this);

  /**
   * The immutable value.
   * @type {number}
   * @private
   */
  this.value_ = value;
};
goog.inherits(
    office.structs.ObservableProperty.ImmutableNumber_, goog.Disposable);


/** @override */
office.structs.ObservableProperty.ImmutableNumber_.prototype.getNumberValue =
    function() {
  return this.value_;
};


/** @override */
office.structs.ObservableProperty.ImmutableNumber_.prototype.addChangeListener =
    function(listener, opt_obj) {};
