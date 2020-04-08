goog.provide('office.localstore.idb.Index');

goog.require('office.localstore.idb.Request');



//  Assert that the transaction has not abandoned before perfoming
//     actions (such as get, openCursor, etc...).
/**
 * A wrapper around an IndexedDB index to add logging around IDB requests.
 * @param {!IDBIndex} index The underlying IndexedDB index.
 * @param {!office.localstore.idb.TransactionStatus} transactionStatus
 * @param {!office.localstore.idb.RequestTracker} requestTracker
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @constructor
 * @struct
 */
office.localstore.idb.Index = function(
    index, transactionStatus, requestTracker, errorReporter) {
  /** @private {!IDBIndex} */
  this.index_ = index;

  /** @private {!office.localstore.idb.TransactionStatus} */
  this.transactionStatus_ = transactionStatus;

  /** @private {!office.localstore.idb.RequestTracker} */
  this.requestTracker_ = requestTracker;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;
};


/**
 * @param {office.localstore.idb.KeyType} key
 * @return {!office.localstore.idb.Request} The request to retrieve the value at
 *     the given key from the store.
 */
office.localstore.idb.Index.prototype.get = function(key) {
  return new office.localstore.idb.Request(
      this.index_.get(key), this.errorReporter_,
      this.index_.name + '.get(' + key + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @return {*} The key path for the index.
 */
office.localstore.idb.Index.prototype.getKeyPath = function() {
  return this.index_.keyPath;
};


/**
 * @return {boolean} Whether the index is unique.
 */
office.localstore.idb.Index.prototype.isUnique = function() {
  return this.index_.unique;
};


/**
 * @param {IDBKeyRange=} opt_range
 * @param {string|number=} opt_direction
 * @return {!office.localstore.idb.Request} The request to open a cursor for the
 *     given range in the given direction.
 */
office.localstore.idb.Index.prototype.openCursor = function(
    opt_range, opt_direction) {
  // Check for undefined, since the IndexedDB throws an exception when
  // undefined is passed in.
  var hasRange = goog.isDef(opt_range);
  var hasDirection = goog.isDef(opt_direction);
  var request;
  if (hasRange && hasDirection) {
    request = this.index_.openCursor(opt_range, opt_direction);
  } else if (hasRange) {
    request = this.index_.openCursor(opt_range);
  } else {
    request = this.index_.openCursor();
  }

  var debugRange =
      opt_range ? opt_range.lower + ', ' + opt_range.upper : opt_range;
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.index_.name + '.openCursor(' +
          debugRange + ', ' + opt_direction + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};


/**
 * @param {IDBKeyRange=} opt_range
 * @param {string|number=} opt_direction
 * @return {!office.localstore.idb.Request} The request to open a key cursor for
 *     the given range in the given direction.
 */
office.localstore.idb.Index.prototype.openKeyCursor = function(
    opt_range, opt_direction) {
  // Check for undefined, since the IndexedDB throws an exception when
  // undefined is passed in.
  var hasRange = goog.isDef(opt_range);
  var hasDirection = goog.isDef(opt_direction);
  var request;
  if (hasRange && hasDirection) {
    request = this.index_.openKeyCursor(opt_range, opt_direction);
  } else if (hasRange) {
    request = this.index_.openKeyCursor(opt_range);
  } else {
    request = this.index_.openKeyCursor();
  }

  var debugRange =
      opt_range ? opt_range.lower + ', ' + opt_range.upper : opt_range;
  return new office.localstore.idb.Request(request, this.errorReporter_,
      this.index_.name + '.openKeyCursor(' +
          debugRange + ', ' + opt_direction + ')' /* debugString */,
      this.transactionStatus_, this.requestTracker_);
};
