/**
 * @fileoverview The pending queue mark sent bundle operation.

 */

goog.provide('office.localstore.PendingQueueMarkSentBundleOperation');
goog.provide(
    'office.localstore.PendingQueueMarkSentBundleOperation.BundleMetadata');

goog.require('office.localstore.Operation');
goog.require('office.localstore.PendingQueue');
goog.require('office.localstore.UpdateRecordOperation');
goog.require('goog.asserts');



/**
 * Operation that captures all of the data needed to mark command bundles as
 * sent in the pending queue.
 * @param {office.localstore.PendingQueue} pendingQueue
 * @constructor
 * @struct
 * @extends {office.localstore.UpdateRecordOperation}
 */
office.localstore.PendingQueueMarkSentBundleOperation = function(
    pendingQueue) {
  goog.base(this, pendingQueue.getDocId(), pendingQueue,
      undefined /* opt_nullableProperties */,
      office.localstore.Operation.Type.PENDING_QUEUE_MARK_SENT_BUNDLE);

  /**
   * @type {!Array.<
   *     !office.localstore.PendingQueueMarkSentBundleOperation.BundleMetadata>}
   * @private
   */
  this.bundleMetadata_ = [];

  /**
   * Whether all pre-existing sent bundles in the pending queue should be
   * replaced by the bundles in this operation.
   * @type {boolean}
   * @private
   */
  this.shouldReplaceOldBundles_ = false;

  var lastEntryIndex = pendingQueue.getLastEntryIndex();
  if (pendingQueue.getOperation() ==
      office.localstore.PendingQueue.Operation.REPLACE) {
    this.shouldReplaceOldBundles_ = true;
    var bundles = pendingQueue.getOperationSentCommandBundles();

    for (var i = 0; i < bundles.length; i++) {
      lastEntryIndex++;
      this.bundleMetadata_.push(
          new office.localstore.PendingQueueMarkSentBundleOperation.
              BundleMetadata(goog.asserts.assertString(bundles[i].getSid()),
                  bundles[i].getRequestId(), lastEntryIndex));
    }
  } else {
    this.bundleMetadata_.push(
        new office.localstore.PendingQueueMarkSentBundleOperation.
            BundleMetadata(
                goog.asserts.assertString(pendingQueue.getOperationSessionId()),
                goog.asserts.assertNumber(pendingQueue.getOperationRequestId()),
                lastEntryIndex));
  }
};
goog.inherits(office.localstore.PendingQueueMarkSentBundleOperation,
    office.localstore.UpdateRecordOperation);


/**
 * @return {!Array.<
 *     !office.localstore.PendingQueueMarkSentBundleOperation.BundleMetadata>}
 */
office.localstore.PendingQueueMarkSentBundleOperation.prototype.
    getBundleMetadata = function() {
  return this.bundleMetadata_;
};


/**
 * @return {boolean} Whether all pre-existing sent bundle data should be
 *     replaced with the bundles contained in this operation.
 */
office.localstore.PendingQueueMarkSentBundleOperation.prototype.
    shouldReplaceOldBundles = function() {
  return this.shouldReplaceOldBundles_;
};



/**
 * A data storage object that holds metadata for a single sent bundle.
 * @param {string} sessionId
 * @param {number} requestId
 * @param {number} lastEntryIndex The index of the last command bundle in
 *     the pending queue commands storage that should be treated as marked
 *     as sent to the server.
 * @constructor
 * @struct
 */
office.localstore.PendingQueueMarkSentBundleOperation.BundleMetadata = function(
    sessionId, requestId, lastEntryIndex) {
  /**
   * @type {string}
   */
  this.sessionId = sessionId;

  /**
   * @type {number}
   */
  this.requestId = requestId;

  /**
   * The index of the last command bundle in the pending queue commands storage
   * that should be treated as marked as sent to the server.
   * @type {number}
   */
  this.lastEntryIndex = lastEntryIndex;
};
