

/**
 * @fileoverview A FileSyncer that queues all calls it gets until all
 * dependencies are initialized to forward the calls to an implementation that
 * can do real work. This is useful because:
 * a) apps may need to create a FileSyncer early on in their load sequence
 *    where required objects aren't initialized yet, and
 * b) apps may want to keep real FileSyncer implementations and dependencies
 *    within a separate module (this class doesn't have heavy
 *    dependencies on anything in office.localstore).

 */

goog.provide('office.localstore.FileSyncerProxy');

goog.require('office.localstore.FileSyncer');
goog.require('goog.asserts');



/**
 * File syncer that queues up requests until calls can be forwarded to a real
 * implementation.
 * @param {boolean=} opt_waitForStart Whether to wait for an explicit
 *     startSyncing() call before actually doing any syncing.
 * @constructor
 * @struct
 * @implements {office.localstore.FileSyncer}
 */
office.localstore.FileSyncerProxy = function(opt_waitForStart) {
  /**
   * Whether this proxy can start forwarding sync requests to the real
   * implementation once it's ready.
   * @type {boolean}
   * @private
   */
  this.canStart_ = !opt_waitForStart;

  /**
   * A queue of method calls to the proxied object wrapped in closures.
   * @type {!Array.<function()>}
   * @private
   */
  this.proxyQueue_ = [];
};
goog.addSingletonGetter(office.localstore.FileSyncerProxy);


/**
 * The file syncer calls should be forwarded to. As long as this is
 * null calls are queued up, once it's initialized all calls are forwarded
 * to this.
 * @type {office.localstore.FileSyncer}
 * @private
 */
office.localstore.FileSyncerProxy.prototype.proxiedSyncer_ = null;


/**
 * Sets the underlying proxied syncer. After this call all queued up calls will
 * be made and future calls will go to the proxied syncer.
 * @param {!office.localstore.FileSyncer} proxiedSyncer The file syncer proxied by
 *     this object.
 */
office.localstore.FileSyncerProxy.prototype.setProxiedSyncer = function(
    proxiedSyncer) {
  goog.asserts.assert(this.proxiedSyncer_ == null);
  this.proxiedSyncer_ = proxiedSyncer;
  this.maybeStartSyncing_();
};


/**
 * @return {boolean} Whether the underlying proxied syncer has been set.
 */
office.localstore.FileSyncerProxy.prototype.isInitialized = function() {
  return this.proxiedSyncer_ != null;
};


/**
 * Give explicit permission to perform syncs now. If the instance was created
 * with the option to wait for a start signal, no actual syncs happen before
 * this is called.
 */
office.localstore.FileSyncerProxy.prototype.startSyncing = function() {
  this.canStart_ = true;
  this.maybeStartSyncing_();
};


/**
 * @return {boolean} Whether this proxy may perform actual syncs at this point.
 * @private
 */
office.localstore.FileSyncerProxy.prototype.maySync_ = function() {
  return this.proxiedSyncer_ != null && this.canStart_;
};


/**
 * If the underlying implementation is initialized and the start signal has
 * been given, forward all calls accumulated in the queue to the proxied syncer.
 * @private
 */
office.localstore.FileSyncerProxy.prototype.maybeStartSyncing_ = function() {
  if (!this.maySync_()) {
    return;
  }

  while (this.proxyQueue_.length > 0) {
    this.proxyQueue_.shift()();
  }
};


/** @override */
office.localstore.FileSyncerProxy.prototype.syncFile = function(
    file, directoryPrefix, callback) {
  if (this.maySync_()) {
    this.proxiedSyncer_.syncFile(file, directoryPrefix, callback);
  } else {
    this.proxyQueue_.push(goog.bind(this.syncFile, this,
        file, directoryPrefix, callback));
  }
};


/** @override */
office.localstore.FileSyncerProxy.prototype.syncFiles = function(
    fileMap, directoryPrefix, deleteMissing, callback) {
  if (this.maySync_()) {
    this.proxiedSyncer_.syncFiles(fileMap, directoryPrefix, deleteMissing,
        callback);
  } else {
    this.proxyQueue_.push(goog.bind(this.syncFiles, this,
        fileMap, directoryPrefix, deleteMissing, callback));
  }
};


/** @override */
office.localstore.FileSyncerProxy.prototype.getFileUrl = function(
    uniqueId, directory, callback) {
  if (this.maySync_()) {
    this.proxiedSyncer_.getFileUrl(uniqueId, directory, callback);
  } else {
    this.proxyQueue_.push(goog.bind(this.getFileUrl, this,
        uniqueId, directory, callback));
  }
};
