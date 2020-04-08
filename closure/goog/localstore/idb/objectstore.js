/**
 * @fileoverview Contains the definition of the ObjectStore class.

 */

goog.provide('office.localstore.idb.ObjectStore');

goog.require('office.localstore.idb.Index');
/** @suppress {extraRequire} */
goog.require('office.localstore.idb.KeyType');
goog.require('office.localstore.idb.Request');



//  Assert that the transaction has not abandoned before perfoming
//     actions (such as put, add, delete, etc..).
/**
 * A wrapper around an IndexedDB object store to add logging around IDB
 * requests.
 * @param {!IDBObjectStore} objectStore
 * @param {!office.localstore.idb.TransactionStatus} transactionStatus
 * @param {!office.localstore.idb.RequestTracker} requestTracker
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @constructor
 * @struct
 */
office.localstore.idb.ObjectStore = function(
    objectStore, transactionStatus, requestTracker, errorReporter) {
  /** @private {!IDBObjectStore} */
  this.objectStore_ = objectStore;

  /** @private {!office.localstore.idb.TransactionStatus} */
  this.transactionStatus_ = transactionStatus;

  /** @private {!office.localstore.idb.RequestTracker} */
  this.requestTracker_ = requestTracker;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;
};


/**
 * @param {office.localstore.idb.KeyType|!IDBKeyRange} key
 * @return {!office.localstore.idb.Request} The request to retrieve the value at
 *     the given key from the store.
 */
office.localstore.idb.ObjectStore.prototype.get = function(key) {
  return new office.localstore.idb.Request(this.objectStore_.get(key),
      this.errorReporter_,
      this.objectStore_.name + '.get(' + key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {*} value
 * @param {office.localstore.idb.KeyType=} opt_key
 * @return {!office.localstore.idb.Request} The request to put the value into the
 *     store.
 */
office.localstore.idb.ObjectStore.prototype.put = function(value, opt_key) {
  // Check for undefined, since the IDBObjectStore throws an exception when
  // undefined is passed in.
  var request = goog.isDef(opt_key) ?
      this.objectStore_.put(value, opt_key) :
      this.objectStore_.put(value);
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.objectStore_.name + '.put(' + opt_key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {*} value
 * @param {office.localstore.idb.KeyType=} opt_key
 * @return {!office.localstore.idb.Request} The request to add the value into the
 *     store.
 */
office.localstore.idb.ObjectStore.prototype.add = function(value, opt_key) {
  // Check for undefined, since the IDBObjectStore throws an exception when
  // undefined is passed in.
  var request = goog.isDef(opt_key) ?
      this.objectStore_.add(value, opt_key) :
      this.objectStore_.add(value);
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.objectStore_.name + '.add(' + opt_key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {*} key
 * @return {!office.localstore.idb.Request} The request to delete the value with
 *     the given key from the store.
 */
office.localstore.idb.ObjectStore.prototype.deleteKey = function(key) {
  return new office.localstore.idb.Request(
      this.objectStore_['delete'](key), this.errorReporter_,
      this.objectStore_.name + '.delete(' + key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @return {!office.localstore.idb.Request} The request to clear the object store.
 */
office.localstore.idb.ObjectStore.prototype.clear = function() {
  return new office.localstore.idb.Request(
      this.objectStore_.clear(), this.errorReporter_,
      this.objectStore_.name + '.clear()' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {IDBKeyRange=} opt_range
 * @param {string|number=} opt_direction
 * @return {!office.localstore.idb.Request} The request to open a cursor for the
 *     given range in the given direction.
 */
office.localstore.idb.ObjectStore.prototype.openCursor = function(
    opt_range, opt_direction) {
  // Check for undefined, since the IDBObjectStore throws an exception when
  // undefined is passed in.
  var hasRange = goog.isDef(opt_range);
  var hasDirection = goog.isDef(opt_direction);
  var request;
  if (hasRange && hasDirection) {
    request = this.objectStore_.openCursor(opt_range, opt_direction);
  } else if (hasRange) {
    request = this.objectStore_.openCursor(opt_range);
  } else {
    request = this.objectStore_.openCursor();
  }

  var debugRange =
      opt_range ? opt_range.lower + ', ' + opt_range.upper : opt_range;
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.objectStore_.name + '.openCursor(' +
          debugRange + ', ' + opt_direction + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {office.localstore.idb.KeyType=} opt_key
 * @return {!office.localstore.idb.Request} The request to count the objects in
 *     the store.
 */
office.localstore.idb.ObjectStore.prototype.count = function(opt_key) {
  // Check for undefined, since the IDBObjectStore throws an exception when
  // undefined is passed in.
  var request = goog.isDef(opt_key) ?
      this.objectStore_.count(opt_key) :
      this.objectStore_.count();
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.objectStore_.name + '.count(' + opt_key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {string} name The name of the index to get.
 * @return {!office.localstore.idb.Index} The index.
 */
office.localstore.idb.ObjectStore.prototype.getIndex = function(name) {
  return new office.localstore.idb.Index(this.objectStore_.index(name),
      this.transactionStatus_, this.requestTracker_, this.errorReporter_);
};


/**
 * @return {DOMStringList} The index names of this object store.
 */
office.localstore.idb.ObjectStore.prototype.getIndexNamesDebugDebug = function() {
  return this.objectStore_.indexNames;
};
