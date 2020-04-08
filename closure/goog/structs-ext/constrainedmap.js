

/**
 * @fileoverview Contains the definition of ConstrainedMap.

 */

goog.provide('office.structs.ConstrainedMap');



/**
 * A map that throws when trying to get a key that is not present.
 * @param {!Object.<!V>=} opt_map A map of key-value pairs to add to this map.
 * @constructor
 * @struct
 * @template V
 */
office.structs.ConstrainedMap = function(opt_map) {
  /**
   * The map.
   * @type {!Object.<!V>}
   * @private
   */
  this.map_ = {};

  if (opt_map) {
    this.setAll(opt_map);
  }
};


/**
 * Whether the map contains the given key.
 * @param {string} key The key to check for.
 * @return {boolean} Whether the map contains the key.
 */
office.structs.ConstrainedMap.prototype.containsKey = function(key) {
  return key in this.map_;
};


/**
 * Returns the value for the given key.  If the key is not found then an error
 * is thrown.
 * @param {string} key The key to get the value for.
 * @return {!V} The value for the given key.
 * @throws {Error} If the key is not found.
 */
office.structs.ConstrainedMap.prototype.get = function(key) {
  if (!this.containsKey(key)) {
    throw Error('No value for key ' + key);
  }
  return this.map_[key];
};


/**
 * Adds a key-value pair to the map.
 * @param {string} key The key.
 * @param {!V} value The value to add.
 */
office.structs.ConstrainedMap.prototype.set = function(key, value) {
  this.map_[key] = value;
};


/**
 * Adds all specified key-value pairs to the map.
 * @param {!Object.<!V>} map The map of values to add.
 */
office.structs.ConstrainedMap.prototype.setAll = function(map) {
  for (var key in map) {
    this.set(key, map[key]);
  }
};

