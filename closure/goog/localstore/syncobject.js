goog.provide('office.localstore.SyncObject');

goog.require('office.localstore.Record');



/**
 * A {@code Record} type that stores {@code SyncObject}s, common types that are
 * synchronized between the client and the server.
 * @param {boolean} isNew Whether this is a new object, with no presence in
 *      local storage.
 * @param {!Array.<string>} keyPath The key of the object. This is unique for
 *     each {@code SyncObject}.
 * @param {!Object} state The state of the object. Is a map from state
 *     name to a value representing the string. The value can either be
 *     a primitive, a simple object, or an array of simple objects and
 *     primitives.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.SyncObject = function(isNew, keyPath, state) {
  goog.base(this, office.localstore.Record.Type.SYNC_OBJECT, isNew);
  this.setProperty(office.localstore.SyncObject.Property.KEYPATH, keyPath);
  this.setProperty(office.localstore.SyncObject.Property.STATE, state);
};
goog.inherits(office.localstore.SyncObject, office.localstore.Record);


/**
 * Properties for the SyncObject schema.
 * @enum {string}
 */
office.localstore.SyncObject.Property = {
  DATA: '11',
  KEYPATH: '12',
  STATE: '13'
};


/**
 * Sets a value in the data map of the {@code SyncObject}.
 * @param {*} data The data to be written.
 */
office.localstore.SyncObject.prototype.setData = function(data) {
  this.setProperty(office.localstore.SyncObject.Property.DATA, data);
};


/**
 * Gets all values in the {@code SyncObject}'s data map.
 * @return {*} All key/value pairs stored in the data map.
 */
office.localstore.SyncObject.prototype.getData = function() {
  return this.getProperty(office.localstore.SyncObject.Property.DATA);
};


/** @return {!Array.<string>} The key path. */
office.localstore.SyncObject.prototype.getKeyPath = function() {
  return this.getArrayProperty(office.localstore.SyncObject.Property.KEYPATH);
};


/** @return {!Object} The SyncObject's state. */
office.localstore.SyncObject.prototype.getState = function() {
  var state = this.getNullableObjectProperty(
      office.localstore.SyncObject.Property.STATE);
  if (!state) {
    throw Error('SyncObject not allowed to have null state.');
  }
  return state;
};
