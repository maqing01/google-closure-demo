/**
 * @fileoverview The pending queue clear sent operation.

 */

goog.provide('office.localstore.PendingQueueClearSentOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.UpdateRecordOperation');



/**
 * Operation that captures all of the data needed to completely clear all sent
 * command bundles from the pending queue.
 * @param {office.localstore.PendingQueue} pendingQueue
 * @constructor
 * @struct
 * @extends {office.localstore.UpdateRecordOperation}
 */
office.localstore.PendingQueueClearSentOperation = function(pendingQueue) {
  goog.base(this, pendingQueue.getDocId(), pendingQueue,
      undefined /* opt_nullableProperties */,
      office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT);
};
goog.inherits(office.localstore.PendingQueueClearSentOperation,
    office.localstore.UpdateRecordOperation);


/**
 * @return {string}
 */
office.localstore.PendingQueueClearSentOperation.prototype.getDocId =
    function() {
  return /** @type {string} */ (this.getKey());
};
