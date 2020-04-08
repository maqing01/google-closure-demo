goog.provide('office.localstore.PendingQueueRecordLoader');

goog.require('goog.log');



/**
 * Loads the pending queue record from local store.
 * @param {string} docId
 * @param {office.localstore.Document.Type} docType
 * @param {!office.localstore.LocalStore} localStore
 * @constructor
 */
office.localstore.PendingQueueRecordLoader = function(
    docId, docType, localStore) {
  /** @private {string} */
  this.docId_ = docId;

  /** @private {office.localstore.Document.Type} */
  this.docType_ = docType;

  /** @private {!office.localstore.LocalStore} */
  this.localStore_ = localStore;
};


/** @private {goog.log.Logger} */
office.localstore.PendingQueueRecordLoader.prototype.logger_ =
    goog.log.getLogger('office.storage.PendingQueueRecordLoader');


/**
 * @param {function(!office.localstore.PendingQueue)} successCallback
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 */
office.localstore.PendingQueueRecordLoader.prototype.loadPendingQueue = function(
    successCallback, opt_errorCallback) {
  goog.log.info(this.logger_, 'Requesting initial record read');
  this.localStore_.getPendingQueueCapability().readPendingQueue(
      this.docId_,
      goog.bind(this.handleReadPendingQueueSuccess_, this, successCallback),
      opt_errorCallback);
};


/**
 * The success callback for the initial read from storage.
 * @param {function(!office.localstore.PendingQueue)} callback
 * @param {office.localstore.PendingQueue} pendingQueueRecord The pending queue
 *     record, or null if no corresponding entry existed in storage.
 * @private
 */
office.localstore.PendingQueueRecordLoader.prototype.
    handleReadPendingQueueSuccess_ = function(callback, pendingQueueRecord) {
  if (pendingQueueRecord) {
    goog.log.info(this.logger_, 'Retrieved record from storage');
    callback(pendingQueueRecord);
  } else {
    goog.log.info(this.logger_,
        'Created blank record because no existing record was found');
    callback(this.localStore_.getPendingQueueCapability().createPendingQueue(
        this.docId_, this.docType_));
  }
};
