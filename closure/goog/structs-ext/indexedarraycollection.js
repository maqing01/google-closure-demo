goog.provide('office.structs.IndexedArrayCollection');

goog.require('office.structs.SparseArray');
goog.require('goog.array');



/**
 * Similar to a sparse array, except that at each key, an array is stored
 * instead of individual objects. When the last object is removed from a
 * specific index, the index will no longer be considered a key that has
 * elements.
 * @struct
 * @final
 * @constructor
 * @template T
 */
office.structs.IndexedArrayCollection = function() {
  /** @private {!office.structs.SparseArray.<T>} */
  this.backingStore_ = new office.structs.SparseArray();
};


/**
 * Creates a function to copy an array, while using an optional clone function
 * to clone the individual keys of the array.
 * @param {function(T): T=} opt_cloneFn A function that takes the individual
 *     elements stored in the array, and returns a deep copy of the function.
 * @return {function(!Array.<T>): Array.<T>}
 * @private
 * @template T
 */
office.structs.IndexedArrayCollection.getArrayCloneFn_ = function(opt_cloneFn) {
  return function(arr) {
    arr = /** @type {!Array} */ (arr);
    var returnArr = arr.concat();

    if (opt_cloneFn) {
      for (var i = 0; i < returnArr.length; i++) {
        returnArr[i] = opt_cloneFn(returnArr[i]);
      }
    }

    return returnArr;
  };
};


/**
 * Creates a function to check an array for equality, while using an optional
 * clone function to clone the individual keys of the array.
 * @param {function(T, T): boolean=} opt_equalsFn A function that compares two
 *    of the elements stored within the collection and checks them for equality.
 * @return {function(!Array.<T>, !Array.<T>): boolean}
 * @private
 * @template T
 */
office.structs.IndexedArrayCollection.getEqualsFn_ = function(opt_equalsFn) {
  return function(arr0, arr1) {
    return goog.array.equals(arr0, arr1, opt_equalsFn);
  };
};


/**
 * @return {!Array.<number>} Keys where there are elements defined. For keys
 *     that are returned, there is guaranteed to be at least one element at the
 *     key.
 */
office.structs.IndexedArrayCollection.prototype.getKeys = function() {
  return this.backingStore_.getKeys();
};


/**
 * Returns all of the values tethered at the given index. Returns an empty array
 * if there are no elements present at the given index.
 * @param {number} key
 * @return {!Array.<T>} The elements present at the given index.
 */
office.structs.IndexedArrayCollection.prototype.get = function(key) {
  return this.backingStore_.get(key) || [];
};


/** @return {!Array.<!Array.<T>>} The sparse Array backing the store. */
office.structs.IndexedArrayCollection.prototype.getArray = function() {
  return this.backingStore_.getArray();
};


/**
 * Adds an element at the given key.
 * @param {number} key
 * @param {T} element
 */
office.structs.IndexedArrayCollection.prototype.add = function(key, element) {
  var collection = this.backingStore_.get(key);
  if (!collection) {
    collection = [];
    this.backingStore_.set(key, collection);
  }
  collection.push(element);
};


/**
 * Removes the first occurrence of the given element from the array. Uses == by
 * default to check for the element.
 * @param {number} key
 * @param {T} element
 * @param {function(T, T): boolean=} opt_filterFn An optional function to take
 *     to decide whether elements in the array are equal.
 * @return {boolean} Whether an element was removed.
 */
office.structs.IndexedArrayCollection.prototype.remove = function(
    key, element, opt_filterFn) {
  var collection = this.backingStore_.get(key);
  if (!collection) {
    return false;
  }

  var equalsFn = opt_filterFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < collection.length; i++) {
    if (equalsFn(element, collection[i])) {
      collection.splice(i, 1);
      if (collection.length == 0) {
        this.backingStore_.remove(key);
      }
      return true;
    }
  }

  return false;
};


/**
 * Returns the slice specified by the start and end indices.
 * @param {number} startIndex
 * @param {number} endIndex
 * @return {!Array.<!Array.<T>>} The slice of the array collection for the
 *     given range.
 */
office.structs.IndexedArrayCollection.prototype.slice = function(
    startIndex, endIndex) {
  return this.backingStore_.slice(startIndex, endIndex);
};


/**
 * Removes elements from an array.
 * @param {number} index The index at which to start changing the array.
 * @param {number} num The number of elements to remove.
 */
office.structs.IndexedArrayCollection.prototype.splice = function(index, num) {
  this.backingStore_.splice(index, num);
};


/**
 * Shifts the values in the array at, or after, the given index by the given
 * amount.
 * @param {number} index The index at which to start changing the array.
 * @param {number} shift The number by which to shift the indices.
 */
office.structs.IndexedArrayCollection.prototype.shift = function(index, shift) {
  this.backingStore_.shift(index, shift);
};


/**
 * Creates a deep clone of the indexed array collection.
 * @param {function(T) : T=} opt_cloneFn Optional clone function. Should return
 *     a clone of the objects that are stored at each index. If not provided,
 *     the objects are assumed to be immutable and will be used directly.
 * @return {!office.structs.IndexedArrayCollection} A clone of the collection.
 */
office.structs.IndexedArrayCollection.prototype.clone = function(opt_cloneFn) {
  var newCollection = new office.structs.IndexedArrayCollection();
  var cloneFn =
      office.structs.IndexedArrayCollection.getArrayCloneFn_(opt_cloneFn);
  newCollection.backingStore_ = this.backingStore_.clone(cloneFn);
  return newCollection;
};


/**
 * Compares two indexed array collections for equality.
 * @param {office.structs.IndexedArrayCollection} other
 * @param {function(T, T): boolean=} opt_equalsFn Optional comparison function
 *     for individual elements within the collection. Should take 2 arguments to
 *     compare, and return true if the arguments are equal. Defaults to
 *     {@link goog.array.defaultCompareEquality} which compares the elements
 *     using the built-in '===' operator.
 * @return {boolean} Whether the two indexed array collections are equal.
 */
office.structs.IndexedArrayCollection.prototype.equals = function(
    other, opt_equalsFn) {
  if (other == this) {
    return true;
  }
  if (!other || !(other instanceof office.structs.IndexedArrayCollection)) {
    return false;
  }

  var equalsFn =
      office.structs.IndexedArrayCollection.getEqualsFn_(opt_equalsFn);
  return this.backingStore_.equals(other.backingStore_, equalsFn);
};
