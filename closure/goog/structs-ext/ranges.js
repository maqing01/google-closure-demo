

/**
 * @fileoverview Utilities for manipulating ranges.
 *

 */

goog.provide('office.structs.Ranges');

goog.require('office.structs.EmptyRange');
goog.require('office.structs.RangeClosed');
goog.require('goog.array');


/**
 * Comparison function for two ranges. The comparison is based on only the
 * start number for the ranges.
 *
 * @param {!office.structs.Range} first The first range.
 * @param {!office.structs.Range} second The second range.
 * @return {number} A negative number if the first range is smaller than the
 *     second range, zero if the ranges are equal and a positive number
 *     otherwise.
 * @private
 */
office.structs.Ranges.rangeComparator_ = function(first, second) {
  return goog.array.defaultCompare(first.min(), second.min());
};


/**
   * Returns an object that implements the <tt>Range</tt> interface.
   * This method returns an empty Range if <tt>min</tt> is greater than
   * <tt>max</tt> using the natural number comparison, else it returns a closed
   * range from <tt>min</tt> to <tt>max</tt>.
   *
   * @param {number} min The minimum value in the range.
   * @param {number} max The maximum value in the range.
   * @return {!office.structs.Range} The range.
   */
office.structs.Ranges.newRange = function(min, max) {
  if (min <= max) {
    return new office.structs.RangeClosed(min, max);
  }
  return office.structs.EmptyRange.getInstance();
};


/**
 * Returns the length of the given range that occurs to the left of the given
 * position. For ranges that come before the position but do not intersect it,
 * this will be the length of the range. For ranges that come after the
 * position and do not intersect it, this will be zero. For ranges that
 * intersect the position, this will be position - range.min() + 1.
 *
 * @param {number} position The position.
 * @param {!office.structs.Range} range The range.
 * @return {number} The length of the range that occurs to the left of the
 *     given position.
 */
office.structs.Ranges.getLeadingLength = function(position, range) {
  var leadEnd = Math.min(position - 1, range.max());
  var leadingLength = leadEnd - range.min() + 1;
  return Math.max(0, leadingLength);
};


/**
 * Transforms a coordinate by shifting all coordinates at or after the given
 * shift position by the given offset.
 *
 * @param {number} index The index to transform.
 * @param {number} shiftPosition The position where indices begin to shift.
 * @param {number} offset The amount to shift.
 * @return {number} The transformed value of the index.
 */
office.structs.Ranges.shiftIndex = function(index, shiftPosition, offset) {
  return index >= shiftPosition ? index + offset : index;
};


/**
 * Transforms a coordinate by shifting all coordinates after the given shift
 * position by the given offset.
 *
 * @param {number} index The index to transform.
 * @param {number} shiftPosition The position after which indices begin to
 *     shift.
 * @param {number} offset The amount to shift.
 * @return {number} The transformed value of the index.
 */
office.structs.Ranges.shiftIndexExclusive = function(
    index, shiftPosition, offset) {
  return index == shiftPosition ? index :
      office.structs.Ranges.shiftIndex(index, shiftPosition, offset);
};


/**
 * Transforms a range by shifting all coordinates at or after the given
 * shift position by the given offset.
 *
 * @param {!office.structs.Range} range The range to transform.
 * @param {number} shiftPosition The position where indices begin to shift.
 * @param {number} offset The amount to shift.
 * @return {!office.structs.Range} The transformed value of the range.
 */
office.structs.Ranges.shiftRange = function(range, shiftPosition, offset) {
  if (range.isEmpty()) {
    return range;
  }
  return office.structs.Ranges.encloseNumbers(
      [office.structs.Ranges.shiftIndex(range.min(), shiftPosition, offset),
       office.structs.Ranges.shiftIndex(range.max(), shiftPosition, offset)]);
};


/**
 * Transforms a range by shifting all coordinates after the given shift position
 * by the given offset.
 *
 * @param {!office.structs.Range} range The range to transform.
 * @param {number} shiftPosition The position after which indices begin to
 *     shift.
 * @param {number} offset The amount to shift.
 * @return {!office.structs.Range} The transformed value of the range.
 */
office.structs.Ranges.shiftRangeExclusive = function(
    range, shiftPosition, offset) {
  if (range.isEmpty()) {
    return range;
  }
  return office.structs.Ranges.encloseNumbers(
      [office.structs.Ranges.shiftIndexExclusive(
          range.min(), shiftPosition, offset),
       office.structs.Ranges.shiftIndex(
           range.max(), shiftPosition, offset)]);
};


/**
 * Returns the smallest ranges enclosing all the numbers in the given array.
 *
 * @param {!Array.<number>} nums The numbers.
 * @return {!office.structs.Range} The smallest range enclosing all the numbers or
 *     an empty range if the array is empty.
 */
office.structs.Ranges.encloseNumbers = function(nums) {
  if (nums.length == 0) {
    return office.structs.EmptyRange.getInstance();
  }
  var min = nums[0];
  var max = nums[0];
  for (var i = 0; i < nums.length; i++) {
    var value = nums[i];
    if (min > value) {
      min = value;
    }
    if (max < value) {
      max = value;
    }
  }
  return office.structs.Ranges.newRange(min, max);
};


/**
 * Returns whether the first range entirely encloses the second range.
 * @param {!office.structs.Range} first The first range.
 * @param {!office.structs.Range} second The second range.
 * @return {boolean} Whether the first range entirely encloses the second range.
 */
office.structs.Ranges.encloses = function(first, second) {
  return first.intersection(second).equals(second);
};


/**
 * Returns the smallest possible <tt>Range</tt> that includes
 * every value in the original <tt>Range</tt> and <tt>value</tt>.
 * Returns the original <tt>Range</tt> if
 * the passed <tt>value</tt> is null.
 * @param {!office.structs.Range} range The original range.
 * @param {?number} value The value that must be in the new <tt>Range</tt>.
 * @return {!office.structs.Range} The minimal <tt>Range</tt> that encloses the
 *     original <tt>Range</tt> and the new <tt>value</tt>.
 */
office.structs.Ranges.enclose = function(range, value) {
  if (value == null) {
    return range;
  }
  if (range.isEmpty()) {
    return office.structs.Ranges.newRange(value, value);
  }
  return range.min() > value ?
      office.structs.Ranges.newRange(value, range.max()) : (range.max() < value) ?
          office.structs.Ranges.newRange(range.min(), value) : range;
};


/**
 * Transforms a coordinate as if the given range were deleted from the
 * coordinate space, shifting all downstream coordinates accordingly.
 *
 * @param {number} position The position to transform.
 * @param {!office.structs.Range} deletedRange The range to delete.
 * @return {number} The transformed value of the given position.
 */
office.structs.Ranges.transformCoordinateAgainstDeletedRange = function(
    position, deletedRange) {
  return position -
      office.structs.Ranges.getLeadingLength(position, deletedRange);
};


/**
 * Transforms a range as if the given range were deleted from the coordinate
 * space, shifting all downstream coordinates accordingly. If the range is
 * entirely deleted, an empty range is returned.
 *
 * @param {!office.structs.Range} range The range to transform.
 * @param {!office.structs.Range} deletedRange The range to delete.
 * @return {!office.structs.Range} The transformed value of the given range.
 */
office.structs.Ranges.transformRangeAgainstDeletedRange = function(
    range, deletedRange) {
  var newStart = office.structs.Ranges.transformCoordinateAgainstDeletedRange(
      range.min(), deletedRange);
  // Normally we can accomplish a deletion by simply shifting range
  // coordinates - we just shift the coordinates by the length of deleted
  // range that occurs before each coordinate. The one exception is if the
  // endpoint is deleted. Our normal method of coordinate shifting will not
  // properly shift the deleted endpoint, so we must manually shorten the
  // range by one additional unit.
  var endpointDeleted = deletedRange.contains(range.max());
  var newEnd = office.structs.Ranges.transformCoordinateAgainstDeletedRange(
      range.max(), deletedRange) - (endpointDeleted ? 1 : 0);
  return office.structs.Ranges.newRange(newStart, newEnd);
};


/**
 * Subtracts one range from another range. The result is the part of the first
 * range that is not in the intersection of the two ranges. Because subtraction
 * can split a range in two, this method returns a pair of ranges. The first is
 * the range that lies to the left of the subtracted range, the second is the
 * range that lies to the right. Either member maybe an empty range.
 *
 * @param {!office.structs.Range} first The first range.
 * @param {!office.structs.Range} second The second range.
 * @return {!Array.<!office.structs.Range>} An array with the two ranges. Either
 *     one maybe empty.
 */
office.structs.Ranges.subtract = function(first, second) {
  var firstRange = office.structs.Ranges.intersect(
      first, [office.structs.Ranges.newRange(first.min(), second.min() - 1)]);
  var secondRange = office.structs.Ranges.intersect(
      first, [office.structs.Ranges.newRange(second.max() + 1, first.max())]);
  return [firstRange, secondRange];
};


/**
 * Returns the intersection of a sequence of <tt>Ranges</tt> of the given
 * type. Specifically, this method returns a <tt>Range</tt> representing all
 * values <tt>v</tt> such that <tt>contains(v)</tt> returns <tt>true</tt> for
 * all <tt>Ranges</tt> in the parameter list.
 *
 * @param {!office.structs.Range} aRange The first range.
 * @param {!Array.<!office.structs.Range>} moreRanges More ranges.
 * @return {!office.structs.Range} The intersecting range.
 */
office.structs.Ranges.intersect = function(aRange, moreRanges) {
  var result = aRange;
  for (var i = 0; i < moreRanges.length; i++) {
    var range = moreRanges[i];
    result = result.intersection(range);
  }
  return result;
};


/**
 * Returns whether the first and second ranges are adjacent to each other.
 * The order of the first and second ranges does not matter.
 *
 * @param {!office.structs.Range} first The first range.
 * @param {!office.structs.Range} second The second range.
 * @return {boolean} Whether the first and second ranges are adjacent.
 */
office.structs.Ranges.isAdjacent = function(first, second) {
  return (first.max() == second.min() - 1) || (second.max() == first.min() - 1);
};


/**
 * Returns whether the first and second ranges can be merged. Ranges can be
 * merged when they intersect or are immediately adjacent to one another.
 *
 * @param {!office.structs.Range} first The first range.
 * @param {!office.structs.Range} second The second range.
 * @return {boolean} Whether the ranges can be merged.
 */
office.structs.Ranges.canMerge = function(first, second) {
  return first.intersects(second) ||
      office.structs.Ranges.isAdjacent(first, second);
};


/**
 * Shift the ranges in the list after the shift position by the offset. This
 * method mutates the incoming list and will perform well only on random
 * access lists.
 *
 * @param {!Array.<!office.structs.Range>} sortedRanges The sorted ranges.
 * @param {number} shiftPosition The shift position.
 * @param {number} offset The offset of the shift.
 */
office.structs.Ranges.shiftRanges = function(
    sortedRanges, shiftPosition, offset) {
  var index = goog.array.binarySearch(
      sortedRanges,
      office.structs.Ranges.newRange(shiftPosition, shiftPosition),
      office.structs.Ranges.rangeComparator_);
  if (index < 0) {
    index = -index - 1;
  }
  // For all ranges which start beyond the shift position, shift them by the
  // offset. Start with the range just before the shift position in case the
  // end index of the range includes the shift position.
  for (var i = Math.max(0, index - 1); i < sortedRanges.length; i++) {
    var shiftedRange = office.structs.Ranges.shiftRange(
        sortedRanges[i], shiftPosition, offset);
    sortedRanges[i] = shiftedRange;
  }
};


/**
 * Merge the specified range if it is adjacent to any of the ranges in the
 * list. This method mutates the incoming list and will perform well only on
 * random access lists.
 *
 * <p> NOTE: This does not handle the case where the incoming range
 * encompasses more than one range. The incoming range is then merged with
 * only one of the ranges and the other overlapping ranges also remain in the
 * sorted ranges.</p>
 *
 * @param {!Array.<!office.structs.Range>} sortedRanges The sorted ranges.
 * @param {!office.structs.Range} range The range to merge.
 * @return {boolean} True if the range was merged and false if it was only
 *      appended to the sorted ranges.
 */
office.structs.Ranges.mergeOrAppendRange = function(sortedRanges, range) {
  var index = goog.array.binarySearch(
      sortedRanges, range, office.structs.Ranges.rangeComparator_);
  if (index < 0) {
    index = -index - 1;
  }

  var insertRange = true;
  for (var i = Math.max(0, index - 1); i < sortedRanges.length; i++) {
    var currentRange = sortedRanges[i];
    // Check to see if the new range can be merged with any of the current
    // ranges.
    if (office.structs.Ranges.canMerge(currentRange, range)) {
      insertRange = false;
      currentRange = currentRange.enclosure(range);
      sortedRanges[i] = currentRange;
      break;
    }
  }
  if (insertRange) {
    sortedRanges.splice(index, 0, range);
  }

  return !insertRange;
};
