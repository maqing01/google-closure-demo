goog.provide('office.app.LifecycleManager');

goog.require('goog.Disposable');


/**
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.app.LifecycleManager = function() {
  goog.base(this);

  /**
   * @type {!Array.<!function()>}
   * @private
   */
  this.unloadCallbacks_ = [];

  /**
   * @type {!Array.<!function(): (string|undefined)>}
   * @private
   */
  this.beforeUnloadCallbacks_ = [];
};
goog.inherits(office.app.LifecycleManager, goog.Disposable);


/**
 * @param {!function(): (string|undefined)} callback The callback to register
 *     next.
 */
office.app.LifecycleManager.prototype.registerBeforeUnloadCallback = function(
    callback) {
  if (this.isDisposed()) {
    // Not sure how this is possible, but it does occur occasionally. Should
    // be a no-op.
    return;
  }
  this.beforeUnloadCallbacks_.push(callback);
};


/**
 * @param {!function()} callback The callback to register next.
 */
office.app.LifecycleManager.prototype.registerUnloadCallback = function(
    callback) {
  if (this.isDisposed()) {
    // Not sure how this is possible, but it does occur occasionally. Should
    // be a no-op.
    return;
  }
  this.unloadCallbacks_.push(callback);
};


/**
 * @return {string} The message to confirm unload, if any.
 * @protected
 */
office.app.LifecycleManager.prototype.getBeforeUnloadConfirmMessage =
    function() {
      var confirmMessage = '';
      var callbacks = this.beforeUnloadCallbacks_;
      for (var i = 0; i < callbacks.length && !confirmMessage; ++i) {
        confirmMessage = callbacks[i]() || '';
      }
      return confirmMessage;
    };


/**
 * @param {boolean=} opt_force Whether to force unload.
 * @return {string} The message to display to the user to confirm unload, if
 *     any.
 */
office.app.LifecycleManager.prototype.maybeUnload = function(opt_force) {
  if (!opt_force) {
    var confirmMessage = this.getBeforeUnloadConfirmMessage();
    if (confirmMessage) {
      return confirmMessage;
    }
  }
  this.handleUnload();
  return '';
};


/**
 * @protected
 */
office.app.LifecycleManager.prototype.handleUnload = function() {
  if (this.isDisposed()) {
    // It's possible to call this method multiple times, if the user had
    // canceled the original beforeunload. On the next exit, beforeunload and
    // unload will both fire, so we need to handle this gracefully.
    return;
  }

  var callbacks = this.unloadCallbacks_;
  for (var i = 0; i < callbacks.length; ++i) {
    callbacks[i]();
  }

  this.sessionDisconnect();
};


/**
 */
office.app.LifecycleManager.prototype.sessionDisconnect = goog.nullFunction;


/** @override */
office.app.LifecycleManager.prototype.disposeInternal = function() {
  delete this.unloadCallbacks_;
  delete this.beforeUnloadCallbacks_;

  goog.base(this, 'disposeInternal');
};
