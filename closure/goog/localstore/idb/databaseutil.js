goog.provide('office.localstore.idb.DatabaseUtil');

goog.require('office.localstore.LocalStoreError');
/** @suppress {extraRequire} */
goog.require('office.localstore.idb.KeyType');
goog.require('goog.asserts');



/**
 * The class containing utility methods for IndexedDB.
 * @constructor
 * @struct
 */
office.localstore.idb.DatabaseUtil = function() {
};


/**
 * Fields to set on IndexedDB event targets to add context.
 * @enum {string}
 */
office.localstore.idb.DatabaseUtil.ErrorContextField = {
  INTERNAL_ABORT: 'docs_internalAbort',
  REQUEST_CONTEXT: 'docs_requestContext'
};


/**
 * The indexedDB key range.
 * @type {!Object}
 * @private
 */
office.localstore.idb.DatabaseUtil.KEY_RANGE_ = goog.global.IDBKeyRange ||
    goog.global.webkitIDBKeyRange;


/**
 * The possible cursor directions.
 * @see http://www.w3.org/TR/IndexedDB/#dfn-direction
 *
 * @enum {string}
 * @private
 */
office.localstore.idb.DatabaseUtil.CursorDirection_ = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREVIOUS: 'prev',
  PREVIOUS_UNIQUE: 'prevunique'
};


/**
 * Opens a cursor with the provided range and returns a handle on the request
 * object.
 *
 * From the IndexedDB Spec (http://www.w3.org/TR/IndexedDB):
 * For purposes of comparison, all Arrays are greater than all DOMString, Date
 * and float values; all DOMString values are greater than all Date and float
 * values; and all Date values are greater than all float values. Values of type
 * float are compared to other float values numerically. Values of type Date are
 * compared to other Date values chronologically.
 *
 * @param {!office.localstore.idb.ObjectStore} store The object store.
 * @param {office.localstore.idb.KeyType=} opt_lowerBound The lower
 *     bound of the range request (inclusive). If not present, returns an
 *     unbounded request that covers all objects in the store.
 * @param {office.localstore.idb.KeyType=} opt_upperBound The upper
 *     bound of the range request (inclusive). If not present, then the lower
 *     bound is treated as a single key. This value will be ignored if a lower
 *     bound is not provided.
 * @param {string=} opt_index The name of the index to open the request on. By
 *     default, the cursor is opened on the object store itself.
 * @param {boolean=} opt_reverse Whether to reverse traversal order, such that
 *     the first value returned by the cursor is at the end of the key range.
 * @param {boolean=} opt_keyedCursor Whether to use a cursor keyed off the
 *     index. Uses openKeyCursor instead of openCursor on the IDBIndex.
 * @return {!office.localstore.idb.Request} request The request.
 */
office.localstore.idb.DatabaseUtil.prototype.getCursorRequest = function(
    store, opt_lowerBound, opt_upperBound, opt_index, opt_reverse,
    opt_keyedCursor) {
  var range = goog.isDef(opt_lowerBound) ?
      this.createKeyRange_(opt_lowerBound, opt_upperBound) : null;
  var direction = opt_reverse ?
      office.localstore.idb.DatabaseUtil.CursorDirection_.PREVIOUS :
      office.localstore.idb.DatabaseUtil.CursorDirection_.NEXT;

  if (opt_index) {
    var index = store.getIndex(opt_index);
    return opt_keyedCursor ?
        index.openKeyCursor(range, direction) :
        index.openCursor(range, direction);
  }
  return store.openCursor(range, direction);
};


/**
 * Deletes the object(s) with the specified key range from the store.
 * @param {!office.localstore.idb.ObjectStore} store The object store.
 * @param {office.localstore.idb.KeyType} lowerBound
 *     The lower bound of the range request (inclusive).
 * @param {office.localstore.idb.KeyType=} opt_upperBound The upper
 *     bound of the range request (inclusive). If not present, then the lower
 *     bound is treated as a single key.
 * @param {function()=} opt_successCallback The callback to call once the
 *     requestall to delete the data succeeds. This will also be called if the
 *     range included no values to delete.
 */
office.localstore.idb.DatabaseUtil.prototype.deleteFromStore = function(
    store, lowerBound, opt_upperBound, opt_successCallback) {
  var range = this.createKeyRange_(lowerBound, opt_upperBound);
  var request = store.deleteKey(range);
  if (opt_successCallback) {
    request.setSuccessCallback(opt_successCallback);
  }
};


/**
 * Opens a cursor on the given object store with the provided range, bounds,
 * index, and direction and iterates through all cursor values for the given
 * request and asynchronously calls the readFunction on each object in storage.
 * The resultCallback is then called with the collated results.
 * NOTE: 'Cursor value' means 'value' property when one is present (i.e. when
 * the cursor is of IDBCursorWithValue type) and 'key' property otherwise.
 * @param {!office.localstore.idb.Transaction} transaction The transaction to use.
 * @param {office.localstore.idb.StoreName} storeName The store to use.
 * @param {function(!Object): (Object|undefined)} readFunction Function to read
 *     the storage object.
 * @param {function(!Array)=} opt_successCallback Function which will be called
 *     with the collated results array.
 * @param {office.localstore.idb.KeyType=} opt_lowerBound The lower
 *     bound of the range request (inclusive). If not present, returns an
 *     unbounded request that covers all objects in the store.
 * @param {office.localstore.idb.KeyType=}  opt_upperBound The upper
 *     bound of the range request (inclusive). If not present, then the lower
 *     bound is treated as a single key. This value will be ignored if a lower
 *     bound is not provided.
 * @param {string=} opt_index The name of the index to open the request on. By
 *     default, the cursor is opened on the object store itself.
 * @param {boolean=} opt_reverse Whether to reverse traversal order, such that
 *     the first value returned by the cursor is at the end of the key range.
 * @param {boolean=} opt_keyedCursor Whether to use a cursor keyed off the
 *     index. Uses openKeyCursor instead of openCursor on the IDBIndex.
 * @param {boolean=} opt_abandonTransactionOnResult Whether to abandon the
 *     transaction when invoking the success callback. See
 *     {@code office.localstore.idb.Transaction#abandon} for more details.
 */
office.localstore.idb.DatabaseUtil.prototype.iterateIdbCursor = function(
    transaction, storeName, readFunction, opt_successCallback, opt_lowerBound,
    opt_upperBound, opt_index, opt_reverse, opt_keyedCursor,
    opt_abandonTransactionOnResult) {
  var store = transaction.getObjectStore(storeName);
  var request = this.getCursorRequest(
      store, opt_lowerBound, opt_upperBound, opt_index, opt_reverse,
      opt_keyedCursor);

  var results = [];

  request.setSuccessCallback(function(e) {
    var cursorRequest = e.target;
    office.localstore.idb.DatabaseUtil.verifyRequestDone(cursorRequest);
    var cursor = cursorRequest.result;
    if (cursor) {
      if (goog.isDef(cursor.value)) {
        // IDBCursorWithValue case.
        var result = cursor.value;
      } else {
        // The request was probably created with store.openKeyCursor call.
        // This means the cursor has no value and we use the key instead.
        goog.asserts.assert(goog.isDef(cursor.key),
            'Only cursor requests are supported.');
        result = cursor.key;
      }

      result = readFunction(result);
      if (result) {
        results.push(result);
      }
      cursor['continue']();
    } else {
      if (opt_abandonTransactionOnResult) {
        transaction.abandon();
      }
      if (opt_successCallback) {
        opt_successCallback(results);
      }
    }
  });
};


/**
 * Determines whether the given cursor is iterating forward.
 * @param {!IDBCursor} cursor The cursor.
 * @return {boolean} Whether it is iterating forward.
 */
office.localstore.idb.DatabaseUtil.isForward = function(cursor) {
  return (cursor.direction ==
      office.localstore.idb.DatabaseUtil.CursorDirection_.NEXT ||
      cursor.direction ==
      office.localstore.idb.DatabaseUtil.CursorDirection_.NEXT_UNIQUE);
};


/**
 * Verifies that the cursor request is in a DONE state.
 * @param {Object} cursorRequest The request.
 */
office.localstore.idb.DatabaseUtil.verifyRequestDone = function(cursorRequest) {
  //  Move this into the goog.db package.
  // NOTE: The IndexedDB spec changed from having the ready state DONE value
  // be the number 2 to the string "done". Chrome 21+ implements the latter.
  goog.asserts.assert(
      cursorRequest.readyState == 2 || cursorRequest.readyState == 'done',
      'Request should be in DONE state.');
};


/**
 * Formats an IndexedDB error event into a printable error message.
 * @param {!Event} e The error event.
 * @return {string} The formatted error message.
 */
office.localstore.idb.DatabaseUtil.formatError = function(e) {
  var domError = e.target['error'];
  var domErrorName = domError && domError.name;

  var errorMessage =
      domError && domError.message || e.target['webkitErrorMessage'];
  var ErrorContextField = office.localstore.idb.DatabaseUtil.ErrorContextField;
  if (e.target[ErrorContextField.INTERNAL_ABORT]) {
    errorMessage = 'Internal abort: ' + errorMessage;
  }

  return domErrorName + ' (' + errorMessage + ')';
};


/**
 * Returns a callback that can handle an IDB error, by invoking the provided
 * callback. Error propagation will be halted, so it will not bubble up to the
 * parent onerror.
 * @param {string} message A message describing the situation.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 *     Callback for handling errors.
 * @return {function(!Event)} A callback that can be provided to an IndexedDB
 *     transaction.
 */
office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback = function(
    message, errorCallback) {
  return function(e) {
    e.stopPropagation();
    //  We should ignore any request errors caused by an aborted
    // transaction. There is no need to distinguish between explicit aborts and
    // aborts due to a database error. (We don't want explicit aborts to trigger
    // request errors, and for aborts on database errors we already handle the
    // abort as an error.)
    var errorMessage =
        message + ' (' + office.localstore.idb.DatabaseUtil.formatError(e) + ')';
    errorCallback(new office.localstore.LocalStoreError(
        office.localstore.LocalStoreError.Type.DATABASE_ERROR, errorMessage, e));
  };
};


/**
 * Creates an unbound key range.
 * @return {!IDBKeyRange} The key range.
 */
office.localstore.idb.DatabaseUtil.prototype.createUnboundedKeyRange =
    function() {
  return office.localstore.idb.DatabaseUtil.KEY_RANGE_.lowerBound(-Infinity);
};


/**
 * Creates a key range from a lower and (optional) upper bound.
 * @param {office.localstore.idb.KeyType} lowerBound The lower bound
 *     of the range request (inclusive).
 * @param {office.localstore.idb.KeyType=} opt_upperBound The upper
 *     bound of the range request (inclusive). If not present, then the key
 *     range includes only keys equal to the lower bound.
 * @return {!IDBKeyRange} The key range.
 * @private
 */
office.localstore.idb.DatabaseUtil.prototype.createKeyRange_ = function(
    lowerBound, opt_upperBound) {
  if (!goog.isDef(opt_upperBound) || lowerBound == opt_upperBound) {
    return office.localstore.idb.DatabaseUtil.KEY_RANGE_.only(lowerBound);
  } else {
    return office.localstore.idb.DatabaseUtil.KEY_RANGE_.bound(
        lowerBound, opt_upperBound);
  }
};
