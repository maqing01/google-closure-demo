goog.provide('office.localstore.idb.TransactionStatus');



/**
 * A holder for status information about an IndexedDB transaction.
 * @interface
 */
office.localstore.idb.TransactionStatus = function() {};


/**
 * @return {boolean} Whether the transaction was aborted. This is set in the
 *     handler of the IndexedDB transaction abort event.
 */
office.localstore.idb.TransactionStatus.prototype.wasAborted =
    goog.abstractMethod;


/**
 * @return {boolean} Whether aborting the transaction was requested, either
 *     explicitly or because of a timeout.
 */
office.localstore.idb.TransactionStatus.prototype.wasAbortRequested =
    goog.abstractMethod;


/**
 * @return {boolean} Whether transaction was abandoned.
 */
office.localstore.idb.TransactionStatus.prototype.isAbandoned =
    goog.abstractMethod;
