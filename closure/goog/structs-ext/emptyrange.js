

/**
 * @fileoverview Contains the definition of the EmptyRange class.

 */

goog.provide('office.structs.EmptyRange');

goog.require('office.structs.Range');



/**
 * An empty range. Calling min or max on this will throw an Error.
 * @constructor
 * @struct
 * @implements {office.structs.Range}
 */
office.structs.EmptyRange = function() {};
goog.addSingletonGetter(office.structs.EmptyRange);


/** @override */
office.structs.EmptyRange.prototype.contains = function(value) {
  return false;
};


/** @override */
office.structs.EmptyRange.prototype.enclosure = function(range) {
  return range;
};


/** @override */
office.structs.EmptyRange.prototype.max = function() {
  throw Error('Empty Range has no max.');
};


/** @override */
office.structs.EmptyRange.prototype.equals = function(other) {
  return other.isEmpty();
};


/** @override */
office.structs.EmptyRange.prototype.intersection = function(range) {
  return this;
};


/** @override */
office.structs.EmptyRange.prototype.intersects = function(range) {
  return false;
};


/** @override */
office.structs.EmptyRange.prototype.isEmpty = function() {
  return true;
};


/** @override */
office.structs.EmptyRange.prototype.min = function() {
  throw Error('Empty ranges has no min.');
};


/** @override */
office.structs.EmptyRange.prototype.toString = function() {
  return '[Empty Range]';
};
