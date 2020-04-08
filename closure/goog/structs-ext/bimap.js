

/**
 * @fileoverview A bimap (or "bidirectional map") is a map that supports
 * an "inverse view", which is another map containing the same entries
 * with reversed keys and values. This implementation is taken from
 * gcal.base.Bimap.
 *

 */

goog.provide('office.structs.Bimap');

goog.require('goog.asserts');
goog.require('goog.object');



/**
 * A map that supports an inverse view for looking up keys from values. Asserts
 * that values are unique.
 * @param {!Object.<K, V>=} opt_map A map. This class makes a deep copy
 *     of the passed in map.
 * @constructor
 * @struct
 * @template K, V
 */
office.structs.Bimap = function(opt_map) {
  /**
   * A map of keys to value.
   * @type {!Object.<K, V>}.
   * @private
   */
  this.map_ = {};

  /**
   * A map of value to keys.
   * @type {!Object.<V, K>}.
   * @private
   */
  this.inverseMap_ = {};

  // Make a deep copy.
  if (opt_map) {
    this.putAll(opt_map);
  }
};


/**
 * The inverse view of this map, built on demand.
 * @type {office.structs.Bimap.<K, V>}.
 * @private
 */
office.structs.Bimap.prototype.inverse_ = null;


/**
 * Associates the specified set of values with the specified keys in this map,
 * and vice versa. Asserts that each key and value do not currently exist.
 * @param {!Object.<K, V>} map The map.
 */
office.structs.Bimap.prototype.putAll = function(map) {
  for (var key in map) {
    this.put(key, map[key]);
  }
};


/**
 * Associates the specified value with the specified key, and vice
 * versa. Asserts that the key and value do not currently exist.
 * @param {K} key The key.
 * @param {V} value The value.
 */
office.structs.Bimap.prototype.put = function(key, value) {
  goog.asserts.assert(!goog.isDef(this.map_[key]));
  goog.asserts.assert(!goog.isDef(this.inverseMap_[value]));
  this.map_[key] = value;
  this.inverseMap_[value] = key;
};


/**
 * Returns the value for this key.
 * @param {K} key The key.
 * @return {V|undefined} The value.
 */
office.structs.Bimap.prototype.get = function(key) {
  return this.map_[key];
};


/**
 * Returns the keys in the map.
 * @return {!Array.<K>} The array of keys.
 */
office.structs.Bimap.prototype.getKeys = function() {
  return goog.object.getKeys(this.map_);
};


/**
 * Returns the inverse view of this bimap.
 * @return {!office.structs.Bimap.<V, K>} The inverse view of this bimap, which
 *     maps each of this bimap's values to its associated key. The two maps are
 *     backed by the same data, so changing one will change the other.
 */
office.structs.Bimap.prototype.inverseBimap = function() {
  if (!this.inverse_) {
    // This is so that each subclass does not need to explicitly create a new
    // instance of itself.
    var inverse = new this.constructor();

    inverse.map_ = this.inverseMap_;
    inverse.inverseMap_ = this.map_;
    inverse.inverse_ = this;
    this.inverse_ = inverse;
  }
  return this.inverse_;
};
