

/**
 * @fileoverview Contains the definition of the RangeClosed class.

 */

goog.provide('office.structs.RangeClosed');

goog.require('office.structs.EmptyRange');
goog.require('office.structs.Range');



/**
 * A closed {@link office.structs.Range} (having a min and a max). Instances of
 * this class are guaranteed not to be empty.
 *
 * @param {number} min The min value.
 * @param {number} max The max value.
 * @throws Error if the min value is greater than the max value.
 *     the max value.
 * @constructor
 * @struct
 * @implements {office.structs.Range}
 */
office.structs.RangeClosed = function(min, max) {
  if (min > max) {
    throw Error('Parameter min cannot be greater than Parameter max.');
  }

  /**
   * The minimum value of the range.
   * @type {number}
   * @private
   */
  this.min_ = min;

  /**
   * The maximum value of the range.
   * @type {number}
   * @private
   */
  this.max_ = max;
};


/** @override */
office.structs.RangeClosed.prototype.contains = function(value) {
  return (this.min_ <= value) && (this.max_ >= value);
};


/** @override */
office.structs.RangeClosed.prototype.enclosure = function(range) {
  if (range.isEmpty()) {
    return this;
  }
  var oMin = range.min();
  var oMax = range.max();
  return new office.structs.RangeClosed(
      (oMin < this.min_) ? oMin : this.min_,
      (oMax > this.max_) ? oMax : this.max_);
};


/** @override */
office.structs.RangeClosed.prototype.max = function() {
  return this.max_;
};


/** @override */
office.structs.RangeClosed.prototype.equals = function(other) {
  if (other.isEmpty()) {
    return false;
  }
  return other.min() === this.min_ && other.max() === this.max_;
};


/** @override */
office.structs.RangeClosed.prototype.intersection = function(range) {
  if (!this.intersects(range)) {
    return office.structs.EmptyRange.getInstance();
  } else {
    var oMin = range.min();
    var oMax = range.max();
    return new office.structs.RangeClosed(
        (oMin > this.min_) ? oMin : this.min_,
        (oMax < this.max_) ? oMax : this.max_);
  }
};


/** @override */
office.structs.RangeClosed.prototype.intersects = function(range) {
  if (range.isEmpty()) {
    return false;
  } else {
    return (this.max_ >= range.min()) && (this.min_ <= range.max());
  }
};


/** @override */
office.structs.RangeClosed.prototype.isEmpty = function() {
  return false;
};


/** @override */
office.structs.RangeClosed.prototype.min = function() {
  return this.min_;
};


/** @override */
office.structs.RangeClosed.prototype.toString = function() {
  return '[Range:' + this.min_ + ', ' + this.max_ + ']';
};
