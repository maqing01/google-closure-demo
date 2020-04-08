goog.provide('office.localstore.Record');

goog.require('office.util.ArrayUtil');
goog.require('office.util.ObjectUtil');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * Package-protected
 * @param {office.localstore.Record.Type} recordType The record type.
 * @param {boolean=} opt_isNew Whether this is a new object, not yet persisted
 *     in any form in local storage.
 * @constructor
 * @extends {goog.Disposable}
 */
office.localstore.Record = function(recordType, opt_isNew) {
  goog.base(this);

  /**
   * @type {office.localstore.Record.Type}
   * @private
   */
  this.recordType_ = recordType;

  /**
   * Current values of all the record's properties.
   * @type {!Object.<*>}
   * @private
   */
  this.properties_ = {};

  /**
   * Property values which have not yet been saved.
   * @type {!Object.<*>}
   * @private
   */
  this.propertyModifications_ = {};

  /**
   * Whether this record has not yet been saved to local storage for the first
   * time.  While this is true, no trace of this record will exist in local
   * storage.
   * @type {boolean}
   * @private
   */
  this.isNew_ = opt_isNew || false;

  /**
   * Whether the object is still being initialized.  While this is true,
   * property changes will not be stored in propertyModifications_.
   * @type {boolean}
   * @private
   */
  this.initializing_ = !this.isNew_;
};
goog.inherits(office.localstore.Record, goog.Disposable);


/**
 * @enum {number}
 */
office.localstore.Record.Type = {
  APPLICATION_METADATA: 0,
  COMMENT: 1,
  DOCUMENT: 2,
  DOCUMENT_ENTITY: 3,
  FONT_METADATA: 4,
  IMPRESSION_BATCH: 5,
  PENDING_QUEUE: 6,
  SYNC_OBJECT: 7,
  SYNC_STATS: 8,
  USER: 9
};


/**
 * Whether this record should be deleted on the next write.
 * @type {boolean}
 * @private
 */
office.localstore.Record.prototype.toBeDeleted_ = false;


/**
 * @return {office.localstore.Record.Type} The record type.
 */
office.localstore.Record.prototype.getRecordType = function() {
  return this.recordType_;
};


/**
 * Copy all the properties from the given record to this one, clearing any
 * current properties or modifications this record might have.  This does a very
 * shallow copy, and the old object should be discarded after its use.
 * @param {!office.localstore.Record} record The record whose properties should
 *     be copied.
 */
office.localstore.Record.prototype.usePropertiesOf = function(record) {
  this.propertyModifications_ = {};
  this.properties_ = record.properties_;
};


/**
 * @return {boolean} Whether this object contains any locally created
 *     modifications. NB: If this record has been marked for deletion or has
 *     been deleted, it will still return false.
 */
office.localstore.Record.prototype.isModified = function() {
  return this.isNew_ || !goog.object.isEmpty(this.propertyModifications_);
};


/**
 * @return {boolean} Whether this object has not yet been persisted to local
 *     storage.
 */
office.localstore.Record.prototype.isNew = function() {
  return this.isNew_;
};


/**
 * @return {boolean} Whether this object is marked for deletion.
 */
office.localstore.Record.prototype.isToBeDeleted = function() {
  return this.toBeDeleted_;
};


/**
 * @return {boolean} Whether this record should be persisted to local storage
 *     even if it has no unmodified properties.
 */
office.localstore.Record.prototype.shouldWriteIfClean = function() {
  return false;
};


/**
 * Package-protected
 * @return {!Object} A map of modified properties and their new
 *     values.
 */
office.localstore.Record.prototype.getModifications = function() {
  return this.propertyModifications_;
};


/**
 * Package-protected.  Marks the object as initialized - after this call, all
 * property changes will be tracked, and returned by getModifications.
 */
office.localstore.Record.prototype.markAsInitialized = function() {
  this.initializing_ = false;
};


/**
 * Marks this record to be deleted. This does not actually delete the record,
 * it has to be written for the delete to become effective.
 */
office.localstore.Record.prototype.deleteRecord = function() {
  goog.asserts.assert(!this.isModified(), 'Can\'t delete record with changes');
  this.toBeDeleted_ = true;
};


/**
 * Fetches a single-valued property's value, asserting that it is an Object or
 * null (if it was not set or set to null).
 * @param {string} propertyName The property's name.
 * @return {Object} A deep copy of the property's value.
 * @protected
 */
office.localstore.Record.prototype.getNullableObjectProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return null;
  }
  goog.asserts.assertObject(value,
      'Property %s was expected to be an object, but had the value %s',
      propertyName, value);
  return /** @type {!Object} */ (goog.object.unsafeClone(value));
};


/**
 * @param {string} propertyName The property to retrieve.
 * @return {?number} The property of the given name if it's a number other
 *     than 0 (presumed to be the default), otherwise null.
 * @protected
 */
office.localstore.Record.prototype.getTimestampPropertyOrNull = function(
    propertyName) {
  var value = this.getNullableNumberProperty(propertyName);
  if (value == null || value == 0) {
    return null;
  }
  return value;
};


/**
 * Fetches a single-valued property's value, asserting that it is a number or
 * null (if it was not set or set to null).
 * @param {string} propertyName The property's name.
 * @return {?number} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getNullableNumberProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return null;
  }
  return goog.asserts.assertNumber(value,
      'Property %s was expected to be a number, but had the value %s',
      propertyName, value);
};


/**
 * Fetches a single-valued property's value, asserting that it is a number.
 * @param {string} propertyName The property's name.
 * @return {number} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getNumberProperty = function(propertyName) {
  var value = this.getProperty(propertyName);
  return goog.asserts.assertNumber(value,
      'Property %s was expected to be a number, but had the value %s',
      propertyName, value);
};


/**
 * Fetches a single-valued property's value, asserting that it is a string or
 * null (if it was not set or set to null).
 * @param {string} propertyName The property's name.
 * @return {?string} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getNullableStringProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return null;
  }
  return goog.asserts.assertString(value,
      'Property %s was expected to be a string, but had the value %s',
      propertyName, value);
};


/**
 * Fetches a single-valued property's value, asserting that it is a string.
 * @param {string} propertyName The property's name.
 * @return {string} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getStringProperty = function(propertyName) {
  var value = this.getProperty(propertyName);
  return goog.asserts.assertString(value,
      'Property %s was expected to be a string, but had the value %s',
      propertyName, value);
};


/**
 * Fetches a single-valued string property's value, converting it to a boolean,
 * False if the property is the empty string, true for any other string, or null
 * (if it was not set or set to null).
 * @param {string} propertyName The property's name.
 * @return {?boolean} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getNullableBooleanProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return null;
  }
  return this.getBooleanProperty(propertyName);
};


/**
 * Fetches a single-valued string property's value, converting it to a boolean,
 * False if the property the empty string, true for any other string.
 * @param {string} propertyName The property's name.
 * @return {boolean} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getBooleanProperty = function(propertyName) {
  var value = this.getProperty(propertyName);
  goog.asserts.assertString(value,
      'Property %s was expected to be a string, but had the value %s',
      propertyName, value);
  return value != '';
};


/**
 * Fetches a single-valued string property's value, converting it to a boolean,
 * False if the property is null or the empty string, true for any other values.
 * @param {string} propertyName The property's name.
 * @return {boolean} The property's value.
 * @protected
 */
office.localstore.Record.prototype.getLegacyBooleanProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return false;
  }
  return this.getBooleanProperty(propertyName);
};


/**
 * Gives a boolean property a single value.
 * @param {string} propertyName The property's name.
 * @param {boolean} propertyValue The property's value.
 * @return {!office.localstore.Record} The current object, for chaining.
 * @protected
 */
office.localstore.Record.prototype.setBooleanProperty = function(propertyName,
    propertyValue) {
  goog.asserts.assert(goog.isBoolean(propertyValue),
      'Can\'t set property %s to non-boolean value %s', propertyName,
      propertyValue);
  return this.setProperty(propertyName, propertyValue ? 'true' : '');
};


/**
 * Fetches a property's value, asserting that it is an array or null (if it was
 * not set or set to null).
 * @param {string} propertyName The property's name.
 * @return {Array} A deep copy of the property's value.
 * @protected
 */
office.localstore.Record.prototype.getNullableArrayProperty = function(
    propertyName) {
  var value = this.getNullableProperty(propertyName);
  if (value == null) {
    return null;
  }
  goog.asserts.assertArray(value,
      'Property %s was expected to be an array, but had the value %s',
      propertyName, value);
  return /** @type {!Array} */ (goog.object.unsafeClone(value));
};


/**
 * Fetches a property's value, asserting that it is an array.
 * @param {string} propertyName The property's name.
 * @return {!Array} A deep copy of the property's value.
 * @protected
 */
office.localstore.Record.prototype.getArrayProperty = function(propertyName) {
  var value = this.getProperty(propertyName);
  goog.asserts.assertArray(value,
      'Property %s was expected to be an array, but had the value %s',
      propertyName, value);
  return /** @type {!Array} */ (goog.object.unsafeClone(value));
};


/**
 * Package-protected.  Fetches a single-valued property's value.
 * @param {string} propertyName The property's name.
 * @return {*} The property's value, which may not be null.
 */
office.localstore.Record.prototype.getProperty = function(propertyName) {
  var value = this.properties_[propertyName];
  goog.asserts.assert(goog.isDefAndNotNull(value),
      'Property %s was unexpectedly null or undefined', propertyName);
  return value;
};


/**
 * Package-protected.  Fetches a single-valued property's value.
 * @param {string} propertyName The property's name.
 * @return {*} The property's value, or null if it either has never been set, or
 *     was set to null.
 */
office.localstore.Record.prototype.getNullableProperty = function(propertyName) {
  var value = this.properties_[propertyName];
  return goog.isDefAndNotNull(value) ? value : null;
};


/**
 * Gives a property a single value. If it is an array, then all elements should
 * be either simple scalar types or nested arrays. Circular references are
 * forbidden and will cause an exception.
 * @param {string} propertyName The name of the property.
 * @param {*} propertyValue The value of the property.
 * @return {!office.localstore.Record} The current object, for chaining.
 * @protected
 */
office.localstore.Record.prototype.setProperty = function(propertyName,
    propertyValue) {
  goog.asserts.assert(!this.toBeDeleted_,
      'Can\'t modify record marked for deletion');

  if (goog.isObject(propertyValue) && !goog.isArray(propertyValue)) {
    return this.setObjectProperty_(
        propertyName, /** @type {!Object} */ (propertyValue));
  }

  if (goog.isArray(propertyValue)) {
    return this.setArrayProperty_(
        propertyName, /** @type {!Array} */ (propertyValue));
  }

  if (this.properties_[propertyName] != propertyValue) {
    this.properties_[propertyName] = propertyValue;
    if (!this.initializing_) {
      this.propertyModifications_[propertyName] = propertyValue;
    }
  }
  return this;
};


/**
 * Gives a property an object as value, performing additional validation.
 * @param {string} propertyName The name of the property.
 * @param {!Object} propertyValue The value of the property.
 * @return {!office.localstore.Record} The current object, for chaining.
 * @private
 */
office.localstore.Record.prototype.setObjectProperty_ = function(propertyName,
    propertyValue) {
  // It is important that this check comes fairly early, since most functions
  // are not safe when applied to arrays containing circular references
  office.util.ObjectUtil.throwIfObjectContainsCycle(propertyValue);
  office.localstore.Record.assertValidObjectPropertyValue_(propertyValue);

  if (!goog.isDefAndNotNull(this.properties_[propertyName]) ||
      !office.util.ObjectUtil.deepEquals(
          /** @type {!Object} */ (this.properties_[propertyName]),
          propertyValue)) {

    var propertyValueClone = goog.object.unsafeClone(propertyValue);
    this.properties_[propertyName] = propertyValueClone;
    if (!this.initializing_) {
      this.propertyModifications_[propertyName] = propertyValueClone;
    }
  }
  return this;
};


/**
 * Assert that an object is a valid object property value, i.e. does not contain
 * any complex objects.
 * @param {!Object} object The object to examine.
 * @private
 */
office.localstore.Record.assertValidObjectPropertyValue_ = function(object) {
  if (goog.asserts.ENABLE_ASSERTS) {
    office.localstore.Record.assertSimpleObject_(object);
  }
};


/**
 * Gives a property an array as value, performing additional validation.
 * @param {string} propertyName The name of the property.
 * @param {!Array} propertyValue The value of the property.
 * @return {!office.localstore.Record} The current object, for chaining.
 * @private
 */
office.localstore.Record.prototype.setArrayProperty_ = function(propertyName,
    propertyValue) {
  // It is important that this check comes fairly early, since most functions
  // are not safe when applied to arrays containing circular references
  office.util.ArrayUtil.throwIfArrayContainsCycle(propertyValue);
  office.util.ObjectUtil.throwIfObjectContainsCycle(propertyValue);
  office.localstore.Record.assertValidArrayPropertyValue_(propertyValue);

  if (!goog.isDefAndNotNull(this.properties_[propertyName]) ||
      !office.util.ArrayUtil.deepArrayEquals(
          /** @type {!Array} */ (this.properties_[propertyName]),
          propertyValue)) {

    var propertyValueClone = goog.object.unsafeClone(propertyValue);
    this.properties_[propertyName] = propertyValueClone;
    if (!this.initializing_) {
      this.propertyModifications_[propertyName] = propertyValueClone;
    }
  }
  return this;
};


/**
 * Assert that an array is a valid array property value, i.e. does not contain
 * any complex objects.
 * @param {!Array} array The array to examine.
 * @private
 */
office.localstore.Record.assertValidArrayPropertyValue_ = function(array) {
  if (!goog.asserts.ENABLE_ASSERTS) {
    return;
  }
  for (var i = 0; i < array.length; i++) {
    // goog.isObject returns true for arrays, so we have to check if it's an
    // array separately
    if (goog.isObject(array[i]) && !goog.isArray(array[i])) {
      office.localstore.Record.assertSimpleObject_(array[i]);
    }
    if (goog.isArray(array[i])) {
      office.localstore.Record.assertValidArrayPropertyValue_(array[i]);
    }
  }
};


/**
 * Recursively examines an object to determine if it is simple, i.e. has only
 * basic types or simple objects as values.
 * @param {!Object} object The object to examine.
 * @private
 */
office.localstore.Record.assertSimpleObject_ = function(object) {
  for (var key in object) {
    goog.asserts.assert(
        object.hasOwnProperty(key) && !goog.isFunction(key),
        'Complex objects are not supported');
    var property = object[key];
    if (goog.isObject(property) && !goog.isArray(property)) {
      office.localstore.Record.assertSimpleObject_(property);
    } else if (goog.isArray(property)) {
      office.localstore.Record.assertValidArrayPropertyValue_(property);
    }
  }
};


/**
 * Sets a key-value on a property which is a map.  To remove a map entry, set
 * its value to null.
 * @param {string} propertyName The name of the mapped property.
 * @param {string} key The key of the map entry to set.
 * @param {*} value The value of the map entry to set.
 * @return {!office.localstore.Record} The current object, for chaining.
 * @protected
 */
office.localstore.Record.prototype.setMappedProperty = function(propertyName, key,
    value) {
  goog.asserts.assert(!this.toBeDeleted_,
      'Can\'t modify record marked for deletion');
  this.mapOfMapsSet_(this.properties_, propertyName, key, value);
  if (!this.initializing_) {
    this.mapOfMapsSet_(this.propertyModifications_, propertyName, key, value);
  }
  return this;
};


/**
 * Package-protected.  Fetches a value of from a mapped property.
 * @param {string} propertyName The property's name.
 * @param {string} key The value's key in the mapped property.
 * @return {string|number|Object} The value, or null if it either has never been
 *     set, or was set to null.
 */
office.localstore.Record.prototype.getMappedPropertyValue = function(propertyName,
    key) {
  var map = this.getNullableProperty(propertyName);
  if (map) {
    return map[key] || null;
  }
  return null;
};


/**
 * Sets a value in a map, contained in another map.  Implements this, basically,
 * although checks that the parentMap entry wasn't already set to something
 * other than a map, and creates the child map if it doesn't yet exist.
 *
 * parentMap[parentKey][key] = value
 *
 * @param {!Object} parentMap The map containing the map to set the value on.
 * @param {string} parentKey The key into the parent map which identifies the
 *     child map to set the value on.
 * @param {string} key The key into the child map.
 * @param {*} value The value to set.
 * @private
 */
office.localstore.Record.prototype.mapOfMapsSet_ = function(parentMap, parentKey,
    key, value) {
  var map = parentMap[parentKey];
  if (map == null) {
    parentMap[parentKey] = map = {};
  }
  goog.asserts.assertObject(map,
      'Tried to treat a non-mapped property as mapped.');
  map[key] = value;
};


/**
 * Package-private. Commits all pending modifications on the record.
 */
office.localstore.Record.prototype.commit = function() {
  this.commitInternal();
  goog.asserts.assert(!this.isModified(), 'Object still showed as modified ' +
      'after being committed');
};


/**
 * Commits all pending modifications on the current object.  Should be
 * overridden by subclasses which store state outside the record property
 * system.
 * @protected
 */
office.localstore.Record.prototype.commitInternal = function() {
  goog.asserts.assert(!this.initializing_, 'Wrote a record while it was ' +
      'still being initialized.');
  this.propertyModifications_ = {};
  this.isNew_ = false;
};


/**
 * @return {office.localstore.DocumentLockRequirement} The document lock
 *     requirement, or null if no document lock is required.
 */
office.localstore.Record.prototype.getDocumentLockRequirement = function() {
  return null;
};


/** @override */
office.localstore.Record.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  delete this.properties_;
  delete this.propertyModifications_;
};
