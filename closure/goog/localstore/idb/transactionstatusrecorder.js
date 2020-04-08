goog.provide('office.localstore.idb.TransactionStatusRecorder');

goog.require('office.localstore.idb.TransactionStatus');



/**
 * A recorder for status information about an IndexedDB transaction.
 * @constructor
 * @implements {office.localstore.idb.TransactionStatus}
 * @struct
 */
office.localstore.idb.TransactionStatusRecorder = function() {
  /**
   * Whether aborting the transaction was requested, either explicitly or
   * because of a timeout.
   * @private {boolean}
   */
  this.wasAbortRequested_ = false;

  /**
   * Whether the transaction was aborted. This is set in the handler of the
   * IndexedDB transaction abort event.
   * @private {boolean}
   */
  this.wasAborted_ = false;

  /**
   * Whether the transaction abandoned
   * @private {boolean}
   */
  this.isAbandoned_ = false;

};


/**
 * Records that aborting the transaction was requested, either explicitly or
 * because of a timeout.
 */
office.localstore.idb.TransactionStatusRecorder.prototype.recordAbort =
    function() {
  this.wasAborted_ = true;
};


/** @override */
office.localstore.idb.TransactionStatusRecorder.prototype.wasAborted =
    function() {
  return this.wasAborted_;
};


/**
 * Records whether the transaction was aborted. This should be called from the
 * handler of the IndexedDB transaction abort event.
 */
office.localstore.idb.TransactionStatusRecorder.prototype.recordAbortRequested =
    function() {
  this.wasAbortRequested_ = true;
};


/** @override */
office.localstore.idb.TransactionStatusRecorder.prototype.wasAbortRequested =
    function() {
  return this.wasAbortRequested_;
};


/**
 * Records whether the transaction was abandoned. This should be called from the
 * handler of the IndexedDB transaction abandon event.
 */
office.localstore.idb.TransactionStatusRecorder.prototype.recordAbandoned =
    function() {
  this.isAbandoned_ = true;
};


/** @override */
office.localstore.idb.TransactionStatusRecorder.prototype.isAbandoned =
    function() {
  return this.isAbandoned_;
};
