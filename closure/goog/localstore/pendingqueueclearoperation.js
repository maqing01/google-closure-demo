/**
 * @fileoverview The pending queue clear operation.

 */

goog.provide('office.localstore.PendingQueueClearOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.UpdateRecordOperation');



/**
 * Operation that captures all of the data needed to mark command bundles as
 * sent in the pending queue.
 * @param {office.localstore.PendingQueue} pendingQueue
 * @constructor
 * @struct
 * @extends {office.localstore.UpdateRecordOperation}
 */
office.localstore.PendingQueueClearOperation = function(pendingQueue) {
  goog.base(this, pendingQueue.getDocId(), pendingQueue,
      undefined /* opt_nullableProperties */,
      office.localstore.Operation.Type.PENDING_QUEUE_CLEAR);
};
goog.inherits(office.localstore.PendingQueueClearOperation,
    office.localstore.UpdateRecordOperation);


/**
 * @return {string}
 */
office.localstore.PendingQueueClearOperation.prototype.getDocId =
    function() {
  return /** @type {string} */ (this.getKey());
};
