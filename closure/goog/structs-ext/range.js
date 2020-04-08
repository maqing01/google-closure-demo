

/**
 * @fileoverview Contains the definition of the Range interface. The existing
 * implementation in goog.math.Range is not used because that does not support
 * creation of empty ranges and requires min and max values to be supplied in
 * the constructor.

 */

goog.provide('office.structs.Range');



/**
 * <p>A range of numbers.
 *
 * <p>Specifically, <Tt>Range r</Tt> has a min and max value such that every
 * value <tt>v</tt> is considered to be within the range if
 * <tt>r.min() <= v <= r.max()</tt>. Non-empty <tt>Range</tt> instances are
 * closed on both ends.  Empty <tt>Range</tt> instances are a special case with
 * no minimum or maximum values; a call to <tt>min()</tt> or
 * <tt>max()</tt> on an empty <Tt>Range</Tt> throws an Error.
 *
 * <p>The {@link office.structs.Ranges} factory class should be used to create
 * all ranges.
 * @interface
 */
office.structs.Range = function() {};


/**
 * Returns true if <tt>value</tt> is not less than <tt>min()</tt> and
 * is not greater than <tt>max()</tt>.  Returns false
 * if <tt>value</tt> is <tt>null</tt> or if the <tt>Range</tt> is empty.
 *
 * @param {number} value The value.
 * @return {boolean} Whether the value is contained in the range.
 */
office.structs.Range.prototype.contains = goog.abstractMethod;


/**
 * Returns the smallest possible <tt>Range</tt> containing both
 * <tt>Range</tt> instances. If either <tt>Range</tt> is empty, returns the
 * other <tt>Range</tt>. Returns an empty <tt>Range</tt> if both
 * <tt>Range</tt> instances are empty.
 *
 * @param {!office.structs.Range} range The range to check.
 * @return {!office.structs.Range} The enclosure of this <tt>Range</tt> and the
 *     given <tt>Range</tt>.
 */
office.structs.Range.prototype.enclosure = goog.abstractMethod;


/**
 * Returns the upper bound of this <tt>Range</tt>. The upper bound is considered
 * to be part of the <tt>Range</tt>.
 *
 * @return {number} The upper bound of the range.
 * @throws {Error} If the range is empty.
 */
office.structs.Range.prototype.max = goog.abstractMethod;


/**
 * Returns true if both <tt>Range</tt> instances are empty or their
 * <tt>min()</tt> and <tt>max()</tt> values are equal.
 *
 * @param {office.structs.Range} other The other range.
 * @return {boolean} Whether the ranges are equal.
 */
office.structs.Range.prototype.equals = goog.abstractMethod;


/**
 * Returns the intersection of this <tt>Range</tt> and the given
 * <tt>Range</tt>. Returns an empty <tt>Range</tt> if either <tt>Range</tt>
 * is empty.
 *
 * @param {!office.structs.Range} range The <tt>Range</tt> to intersect.
 * @return {!office.structs.Range} The intersection of this <tt>Range</tt> and
 *     the given <tt>Range</tt>.
 */
office.structs.Range.prototype.intersection = goog.abstractMethod;


/**
 * Returns true if there is at least one value which is contained in both
 * <tt>Range</tt> objects. Returns false if either <tt>Range</tt> is empty.
 *
 * @param {!office.structs.Range} range The other range.
 * @return {boolean} True if the <tt>Range</tt> instances intersect.
 */
office.structs.Range.prototype.intersects = goog.abstractMethod;


/**
 * Returns true if this <tt>Range</tt> contains no values.
 *
 * @return {boolean} True if this <tt>Range</tt> contains no values.
 */
office.structs.Range.prototype.isEmpty = goog.abstractMethod;


/**
 * Returns the lower bound of this <tt>Range</tt>. The lower bound is considered
 * to be part of the <tt>Range</tt>.
 *
 * @return {number} The lower bound of the range.
 * @throws {Error} If the <tt>Range</tt> is empty.
 */
office.structs.Range.prototype.min = goog.abstractMethod;
