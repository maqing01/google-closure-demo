goog.provide('office.localstore.LocalStoreLoadResult');

goog.require('office.localstore.LocalStoreLoadResultEventType');
goog.require('office.localstore.LockAcquisitionResult');
goog.require('office.util.StageManager');
goog.require('goog.events.EventTarget');



/**
 * Keeps the local store objects and dispatches an event when all objects
 * are set, indicating that the local store load is complete.
 *
 * The user must be the first object set in the LocalStoreLoadResult.
 *
 * Errors are thrown if an object is set more than once, or a get is called
 * before the object was set, except for getLockAcquisitionResult, which
 * returns null if the lock acquisition result is not set.
 *
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.LocalStoreLoadResult = function(errorReporter) {
  goog.base(this);

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /** @private {office.localstore.User} */
  this.user_ = null;

  /** @private {office.localstore.Document} */
  this.document_ = null;

  /** @private {?office.localstore.LockAcquisitionResult} */
  this.lockAcquisitionResult_ = null;

  /** @private {office.localstore.PendingQueue} */
  this.pendingQueue_ = null;

  /** @private {!office.util.StageManager} */
  this.mm_ = new office.util.StageManager(this);

  var Milestone_ = office.localstore.LocalStoreLoadResult.Milestone_;
  this.mm_.
      addRule(
          [Milestone_.USER_SET,
           Milestone_.LOCK_ACQUISITION_RESULT_SET,
           Milestone_.DOCUMENT_SET,
           Milestone_.PENDING_QUEUE_SET],
          this.localStoreLoadResultComplete_);
  this.mm_.start();
};
goog.inherits(office.localstore.LocalStoreLoadResult, goog.events.EventTarget);


/**
 * Milestones passed when local store objects are set in the local store
 * load result.
 * @enum {string}
 * @private
 */
office.localstore.LocalStoreLoadResult.Milestone_ = {
  DOCUMENT_SET: goog.events.getUniqueId('office-ls-ds'),
  LOCK_ACQUISITION_RESULT_SET: goog.events.getUniqueId('office-ls-lars'),
  PENDING_QUEUE_SET: goog.events.getUniqueId('office-ls-pqs'),
  USER_SET: goog.events.getUniqueId('office-ls-us')
};


/**
 * @return {!office.localstore.User}
 */
office.localstore.LocalStoreLoadResult.prototype.getUser = function() {
  this.mm_.assertMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET);
  return /** @type {!office.localstore.User} */ (this.user_);
};


/**
 * @return {?office.localstore.LockAcquisitionResult}
 */
office.localstore.LocalStoreLoadResult.prototype.getLockAcquisitionResult =
    function() {
  return this.lockAcquisitionResult_;
};


/**
 * @return {office.localstore.Document}
 */
office.localstore.LocalStoreLoadResult.prototype.getDocument = function() {
  this.mm_.assertMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.DOCUMENT_SET);
  return this.document_;
};


/**
 * @return {office.localstore.PendingQueue}
 */
office.localstore.LocalStoreLoadResult.prototype.getPendingQueue =
    function() {
  var Milestone_ = office.localstore.LocalStoreLoadResult.Milestone_;
  this.mm_.assertMilestone(
      Milestone_.LOCK_ACQUISITION_RESULT_SET);
  this.mm_.assertMilestone(Milestone_.PENDING_QUEUE_SET);
  return this.lockAcquisitionResult_ ==
      office.localstore.LockAcquisitionResult.ACQUIRED ?
          this.pendingQueue_ :
          null;
};


/**
 * @param {!office.localstore.User} user
 */
office.localstore.LocalStoreLoadResult.prototype.setUser = function(user) {
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET),
      Error('Setting user when a user is already set'));
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.DOCUMENT_SET),
      Error('Setting user when a document is already set'));
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.PENDING_QUEUE_SET),
      Error('Setting user when a pending queue is already set'));
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.
          LOCK_ACQUISITION_RESULT_SET),
      Error('Setting user when a lock acquisition result is already set'));

  this.user_ = user;
  this.mm_.passMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET);
};


/**
 * @param {office.localstore.LockAcquisitionResult} lockAcquisitionResult
 */
office.localstore.LocalStoreLoadResult.prototype.setLockAcquisitionResult =
    function(lockAcquisitionResult) {
  this.mm_.assertMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET);
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.
          LOCK_ACQUISITION_RESULT_SET),
      Error('Setting lock acquisition result when a lock acquisition result ' +
          'is already set'));

  this.lockAcquisitionResult_ = lockAcquisitionResult;
  this.mm_.passMilestone(office.localstore.LocalStoreLoadResult.
      Milestone_.LOCK_ACQUISITION_RESULT_SET);
};


/**
 * @param {office.localstore.Document} document
 */
office.localstore.LocalStoreLoadResult.prototype.setDocument = function(
    document) {
  this.mm_.assertMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET);
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.DOCUMENT_SET),
      Error('Setting document when a document is already set'));

  this.document_ = document;
  this.mm_.passMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.DOCUMENT_SET);
};


/**
 * @param {office.localstore.PendingQueue} pendingQueue
 */
office.localstore.LocalStoreLoadResult.prototype.setPendingQueue =
    function(pendingQueue) {
  this.mm_.assertMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.USER_SET);
  this.errorReporter_.assert(!this.mm_.checkMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.PENDING_QUEUE_SET),
      Error('Setting pending queue when a pending queue is already set'));

  this.pendingQueue_ = pendingQueue;
  this.mm_.passMilestone(
      office.localstore.LocalStoreLoadResult.Milestone_.PENDING_QUEUE_SET);
};


/**
 * Dispatches an event that indicates that all objects from local store are
 * ready.
 * @private
 */
office.localstore.LocalStoreLoadResult.prototype.localStoreLoadResultComplete_ =
    function() {
  this.dispatchEvent(office.localstore.LocalStoreLoadResultEventType.
      LOCAL_STORE_LOAD_RESULT_COMPLETE);
};
