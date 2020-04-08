

/**
 * @fileoverview A sparse array. The sparse array keeps up-to-date an array of
 * indices at which a value exists.

 */

goog.provide('office.structs.SparseArray');

goog.require('office.util.ArrayUtil');
goog.require('goog.array');
goog.require('goog.functions');



/**
 * A sparse array. The sparse array keeps up-to-date an array of indices at
 * which a value exists.
 * @constructor
 * @struct
 * @template T
 */
office.structs.SparseArray = function() {
  /**
   * The array, whose contents are sparse. A sparse array is useful when
   * one wants to annotate some sequential set of values with data where each
   * sequential value does not necessarily have a value attached to it. An
   * array provides the sequentialness that is natural. The sparseness allows
   * for a value to not be attached to every index.
   * e.g. [,,,,value1,,,value2]
   * @type {!Array.<T>}
   * @private
   */
  this.array_ = [];

  /**
   * The array of keys at which a value exists in the sparse array.
   * @type {!Array.<number>}
   * @private
   */
  this.keys_ = [];
};


/**
 * The percentage at which it is more performance to traverse backwards through
 * the arrays in {@code #shift}.
 * @private {number}
 */
office.structs.SparseArray.SHIFT_KEY_INDEX_MIDPOINT_ = 0.6;


/**
 * Gets the value at the given index.
 * @param {number} index The index to get the value at.
 * @return {T|undefined} The value.
 */
office.structs.SparseArray.prototype.get = function(index) {
  return this.array_[index];
};


/**
 * Sets a value.
 * @param {number} index The index for the value to be set at.
 * @param {T} value The value.
 */
office.structs.SparseArray.prototype.set = function(index, value) {
  this.array_[index] = value;
  office.util.ArrayUtil.binaryInsert(this.keys_, index);
};


/**
 * Removes the value at the given index.
 * @param {number} index The index at which the value should be removed.
 */
office.structs.SparseArray.prototype.remove = function(index) {
  delete this.array_[index];
  goog.array.binaryRemove(this.keys_, index);
};


/**
 * Removes all items in the given range.
 * @param {number} startIndex
 * @param {number} endIndex
 */
office.structs.SparseArray.prototype.removeRange = function(
    startIndex, endIndex) {
  var startKey = this.getClosestItemKeyIndex(
      startIndex, true /* opt_forwards */);
  var key = startKey;
  for (; key < this.keys_.length; key++) {
    var index = this.keys_[key];
    if (index > endIndex) {
      break;
    }
    delete this.array_[index];
  }
  this.keys_.splice(startKey, key - startKey);
};


/**
 * Gets the array of values.
 * NOTE: The array should not be modified.
 * @return {!Array.<T>} The array.
 */
office.structs.SparseArray.prototype.getArray = function() {
  return this.array_;
};


/**
 * Gets the sorted array of keys at which a value is present.
 * NOTE: The array should not be modified.
 * @return {!Array.<number>} The keys.
 */
office.structs.SparseArray.prototype.getKeys = function() {
  return this.keys_;
};


/**
 * Gets the closest item in the array to the given index. Will search backwards
 * or forwards based on the optional parameter.
 * @param {number} index The index.
 * @param {boolean=} opt_forwards Whether to search forwards rather than
 *     backwards.
 * @return {T} The item at that index or null if there is none.
 */
office.structs.SparseArray.prototype.getClosestItem = function(
    index, opt_forwards) {
  var key = this.getClosestItemKey(index, opt_forwards);

  return key > -1 ? this.array_[key] : null;
};


/**
 * Gets the closest item's key in the array to the given index. Will search
 * backwards or forwards based on the optional parameter.
 * @param {number} index The index.
 * @param {boolean=} opt_forwards Whether to search forwards rather than
 *     backwards.
 * @return {number} The item's key or -1 if there is no item before or after
 *     the requested index.
 */
office.structs.SparseArray.prototype.getClosestItemKey = function(
    index, opt_forwards) {
  if (this.array_[index]) {
    return index;
  }

  var keyIndex = this.getClosestItemKeyIndex(index, opt_forwards);

  return goog.isDef(this.keys_[keyIndex]) ? this.keys_[keyIndex] : -1;
};


/**
 * Gets the index in the keys array of the closest item to the given index.
 * Will search backwards or forwards based on the optional parameter.
 * NOTE: This returns an index with the array returned by getKeys. It does
 * not return a key within the sparse array.
 * @param {number} index The index.
 * @param {boolean=} opt_forwards Whether to search forwards rather than
 *     backwards.
 * @return {number} The index in the keys array of the closest item. Might be
 *     -1 or past the end if there is no item before or after the requested
 *     index.
 */
office.structs.SparseArray.prototype.getClosestItemKeyIndex = function(
    index, opt_forwards) {
  var result = goog.array.binarySearch(this.keys_, index);

  // Binary search returns -(insertion point) - 1 if the index is not found.
  if (result < 0) {
    result = -result - (opt_forwards ? 1 : 2);
  }
  return result;
};


/**
 * Returns the selected part of the array.
 * @param {number} start The index where the slice begins, inclusive.
 * @param {number} end The index where the slice ends, exclusive.
 * @return {!Array.<T>} The slice of the sparse array for the given range.
 */
office.structs.SparseArray.prototype.slice = function(start, end) {
  return this.array_.slice(start, end);
};


/**
 * Shifts the values in the array at or after the given index by the given
 * amount.
 * @param {number} index The index where the shift begins.
 * @param {number} shift The number by which to shift the indices.
 */
office.structs.SparseArray.prototype.shift = function(index, shift) {
  if (!shift || !this.keys_.length) {
    return;
  }
  // Optimize the shift by shifting from the back in place when the index is
  // in the latter portion of the keys.
  if (index > this.keys_[Math.round(this.keys_.length *
      office.structs.SparseArray.SHIFT_KEY_INDEX_MIDPOINT_)]) {
    this.shiftBackwards_(index, shift);
  } else {
    this.shiftForwards_(index, shift);
  }
};


/**
 * Shifts the values in the array at or after the given index by the given
 * amount from the back.
 * @param {number} index The index where the shift begins.
 * @param {number} shift The number by which to shift the indices.
 * @private
 */
office.structs.SparseArray.prototype.shiftBackwards_ = function(index, shift) {
  var keys = this.keys_;
  var array = this.array_;
  for (var i = keys.length - 1; i >= 0; i--) {
    var key = keys[i];
    if (key < index) {
      break;
    }
    array[key + shift] = array[key];
    delete array[key];
    keys[i] = key + shift;
  }
};


/**
 * Shifts the values in the array at or after the given index by the given
 * amount from the front.
 * @param {number} index The index where the shift begins.
 * @param {number} shift The number by which to shift the indices.
 * @private
 */
office.structs.SparseArray.prototype.shiftForwards_ = function(index, shift) {
  var keys = this.keys_;
  var array = this.array_;

  var shiftedArray = [];
  for (var i = 0; i < keys.length; i++) {
    var oldKey = keys[i];
    if (oldKey >= index) {
      keys[i] = oldKey + shift;
      shiftedArray[oldKey + shift] = array[oldKey];
    } else {
      shiftedArray[oldKey] = array[oldKey];
    }
  }
  this.array_ = shiftedArray;
};


/**
 * Removes elements from an array.
 * @param {number} index The index at which to start changing the array.
 * @param {number} num The number of elements to remove.
 */
office.structs.SparseArray.prototype.splice = function(index, num) {
  if (index >= this.array_.length) {
    return;
  }

  var keys = this.keys_;
  if (keys.length == 0) {
    return;
  }

  // Update the keys with the number of items that have been removed.
  var beginKey = goog.array.binarySearch(keys, index);
  // Find the begin point at which to splice the keys array.
  var beginPoint = beginKey < 0 ? -beginKey - 1 : beginKey;
  var endKey = goog.array.binarySearch(keys, index + num);
  // Find the end point at which to splice the keys array.
  var endPoint = endKey < 0 ? -endKey - 1 : endKey;
  var removedKeyCount = endPoint - beginPoint;

  // NOTE: On all browsers but Chrome native sparse-array splicing is *very*
  // slow. On Chrome, this version of the algorithm is roughly as fast as
  // native array splicing. Since all of the keys are already in memory,
  // they are used to populate a new array with the keys in the correct
  // location.
  var shiftedArray = [];
  var shiftedKeys = [];
  var array = this.array_;
  var oldKey = 0;

  for (var i = 0; i < beginPoint; i++) {
    oldKey = keys[i];
    shiftedArray[oldKey] = array[oldKey];
    shiftedKeys[i] = oldKey;
  }
  for (i = endPoint; i < keys.length; i++) {
    oldKey = keys[i];
    shiftedArray[oldKey - num] = array[oldKey];
    shiftedKeys[i - removedKeyCount] = oldKey - num;
  }

  // Ensure that, even if all elements are removed, the length attribute
  // remains the same.
  shiftedArray.length = Math.max(array.length, index + num) - num;

  this.array_ = shiftedArray;
  this.keys_ = shiftedKeys;
};


/**
 * Creates a deep clone of the SparseArray.
 * @param {function(T): T=} opt_cloneFn Optional clone function. Should return
 *     a clone of the object. If not provided, the objects are assumed to be
 *     immutable and will be used directly.
 * @return {!office.structs.SparseArray.<T>} A clone of the sparse array.
 */
office.structs.SparseArray.prototype.clone = function(opt_cloneFn) {
  var clone = new office.structs.SparseArray();
  var array = [];

  var cloneFn = opt_cloneFn || goog.functions.identity;

  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    array[key] = cloneFn(this.array_[key]);
  }
  clone.array_ = array;

  clone.keys_ = this.keys_.concat();
  return clone;
};


/**
 * Remaps the SparseArray using the given mapping function.
 * @param {function(T): O} mapFn The function to call for every element. This
 *     function takes the current sparse array element as an argument and the
 *     result of the function will be inserted into a new sparse array at the
 *     same location.
 * @return {!office.structs.SparseArray.<O>} A new sparse array with the results
 *     from mapFn.
 * @template O
 */
office.structs.SparseArray.prototype.map = function(mapFn) {
  var result = new office.structs.SparseArray();
  var array = [];

  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    array[key] = mapFn(this.array_[key]);
  }
  result.array_ = array;
  result.keys_ = this.keys_.concat();
  return result;
};


/**
 * Compares two sparse arrays for equality.
 * @param {office.structs.SparseArray.<T>} other The other sparse array.
 * @param {function(T, T): boolean=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two sparse arrays are equal.
 */
office.structs.SparseArray.prototype.equals = function(other, opt_equalsFn) {
  if (this == other) {
    return true;
  }
  if (!other || !(other instanceof office.structs.SparseArray)) {
    return false;
  }
  if (!goog.array.equals(this.keys_, other.keys_)) {
    return false;
  }
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  var keys = this.keys_;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!equalsFn(this.array_[key], other.array_[key])) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two sparse arrays for equality.
 * @param {office.structs.SparseArray.<T>} arr1 The first spare array to compare.
 * @param {office.structs.SparseArray.<T>} arr2 The second spare array to compare.
 * @param {function(T, T): boolean=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two sparse arrays are equal.
 * @template T
 */
office.structs.SparseArray.equals = function(arr1, arr2, opt_equalsFn) {
  return !arr1 ?
      !arr2 :
      arr1.equals(arr2, opt_equalsFn);
};


/**
 * Creates an equality function that can be used to comparse two sparse arrays
 * for equality. This can be useful when needing to use
 * {@code office.structs.SparseArray.equals} with an {@code opt_equalsFn) and
 * that method is passed into another method that equires an equals method, such
 * as {@code goog.array.equals}.
 * @param {function(T, T): boolean=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {function(
 *     office.structs.SparseArray.<T>, office.structs.SparseArray.<T>): boolean}
 *     Whether the two sparse arrays are equal.
 * @template T
 */
office.structs.SparseArray.createEqualsFn = function(opt_equalsFn) {
  return function(arr1, arr2) {
    return office.structs.SparseArray.equals(arr1, arr2, opt_equalsFn);
  }
};
