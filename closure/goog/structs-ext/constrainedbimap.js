goog.provide('office.structs.ConstrainedBimap');

goog.require('office.structs.Bimap');
goog.require('goog.asserts');



/**
 * @param {!Object=} opt_map A map. This class makes a deep copy
 *     of the passed in map.
 * @constructor
 * @extends {office.structs.Bimap}
 */
office.structs.ConstrainedBimap = function(opt_map) {
  goog.base(this, opt_map);
};
goog.inherits(office.structs.ConstrainedBimap, office.structs.Bimap);


/** @override */
office.structs.ConstrainedBimap.prototype.get = function(key) {
  var value = goog.base(this, 'get', key);
  goog.asserts.assert(goog.isDef(value));
  return value;
};

