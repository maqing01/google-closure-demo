/**
 * @fileoverview Utility classes for mutable observable properties.
 */

goog.provide('office.structs.MutableProperty');
goog.provide('office.structs.MutableProperty.Boolean');
goog.provide('office.structs.MutableProperty.Number');
goog.provide('office.structs.MutableProperty.String');

goog.require('office.structs.ObservableProperty');
goog.require('goog.Disposable');
goog.require('goog.events.Event');



/**
 * Abstract wrapper to allow a client property to be observable.
 * @extends {goog.Disposable}
 * @implements {office.structs.ObservableProperty}
 * @constructor
 * @struct
 */
office.structs.MutableProperty = function() {
  goog.base(this);

  /**
   * @type {!Array.<function(goog.events.Event=)>}
   * @private
   */
  this.changeListeners_ = [];
};
goog.inherits(office.structs.MutableProperty, goog.Disposable);


/** @override */
office.structs.MutableProperty.prototype.addChangeListener =
    function(listener, opt_obj) {
  this.changeListeners_.push(goog.bind(listener, opt_obj || goog.global));
};


/**
 * This function sends update notification to all change listeners for this
 * property.
 *
 * Subclasses should call this method whenever the value changes.
 * @protected
 */
office.structs.MutableProperty.prototype.sendUpdateNotification =
    function() {
  for (var i = 0; i < this.changeListeners_.length; i++) {
    this.changeListeners_[i](new goog.events.Event('Changed', this));
  }
};


/** @override */
office.structs.MutableProperty.prototype.disposeInternal = function() {
  this.changeListeners_ = [];

  goog.base(this, 'disposeInternal');
};



/**
 * Wrapper around mutable number properties.
 * @param {number} initValue The initial value of the property.
 * @extends {office.structs.MutableProperty}
 * @implements {office.structs.ObservableProperty.Number}
 * @constructor
 * @struct
 */
office.structs.MutableProperty.Number = function(initValue) {
  goog.base(this);

  /**
   * @type {number}
   * @private
   */
  this.value_ = initValue;
};
goog.inherits(
    office.structs.MutableProperty.Number, office.structs.MutableProperty);


/** @override */
office.structs.MutableProperty.Number.prototype.getNumberValue =
    function() {
  return this.value_;
};


/**
 * Updates the number value for this property.
 * @param {number} value The number value to set.
 */
office.structs.MutableProperty.Number.prototype.setNumberValue = function(value) {
  if (this.value_ != value) {
    this.value_ = value;
    this.sendUpdateNotification();
  }
};



/**
 * Wrapper around mutable string properties.
 * @param {string} initValue The initial value of the property.
 * @extends {office.structs.MutableProperty}
 * @implements {office.structs.ObservableProperty.String}
 * @constructor
 * @struct
 */
office.structs.MutableProperty.String = function(initValue) {
  goog.base(this);

  /**
   * @type {string}
   * @private
   */
  this.value_ = initValue;
};
goog.inherits(
    office.structs.MutableProperty.String, office.structs.MutableProperty);


/** @override */
office.structs.MutableProperty.String.prototype.getStringValue =
    function() {
  return this.value_;
};


/**
 * Updates the string value for this property.
 * @param {string} value The string value to set.
 */
office.structs.MutableProperty.String.prototype.setStringValue = function(value) {
  if (this.value_ != value) {
    this.value_ = value;
    this.sendUpdateNotification();
  }
};



/**
 * Wrapper around mutable boolean properties.
 * @param {boolean} initValue The initial value of the property.
 * @extends {office.structs.MutableProperty}
 * @implements {office.structs.ObservableProperty.Boolean}
 * @constructor
 * @struct
 */
office.structs.MutableProperty.Boolean = function(initValue) {
  goog.base(this);

  /**
   * @type {boolean}
   * @private
   */
  this.value_ = initValue;
};
goog.inherits(
    office.structs.MutableProperty.Boolean, office.structs.MutableProperty);


/** @override */
office.structs.MutableProperty.Boolean.prototype.getBooleanValue =
    function() {
  return this.value_;
};


/**
 * Updates the boolean value for this property.
 * @param {boolean} value The boolean value to set.
 */
office.structs.MutableProperty.Boolean.prototype.setBooleanValue =
    function(value) {
  if (this.value_ != value) {
    this.value_ = value;
    this.sendUpdateNotification();
  }
};
