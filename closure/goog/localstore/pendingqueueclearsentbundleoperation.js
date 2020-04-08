/**
 * @fileoverview The pending queue clear sent bundle operation.

 */

goog.provide('office.localstore.PendingQueueClearSentBundleOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.UpdateRecordOperation');



/**
 * Operation that captures all of the data needed to clear the oldest sent
 * bundle from the pending queue.
 * @param {office.localstore.PendingQueue} pendingQueue
 * @constructor
 * @struct
 * @extends {office.localstore.UpdateRecordOperation}
 */
office.localstore.PendingQueueClearSentBundleOperation = function(pendingQueue) {
  goog.base(this, pendingQueue.getDocId(), pendingQueue,
      undefined /* opt_nullableProperties */,
      office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT_BUNDLE);
};
goog.inherits(office.localstore.PendingQueueClearSentBundleOperation,
    office.localstore.UpdateRecordOperation);


/**
 * @return {string}
 */
office.localstore.PendingQueueClearSentBundleOperation.prototype.getDocId =
    function() {
  return /** @type {string} */ (this.getKey());
};
