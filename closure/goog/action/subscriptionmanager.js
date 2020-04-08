

/**
 * @fileoverview Utility class to make managing action subscriptions easier.
 *

 */

goog.provide('apps.action.SubscriptionManager');

goog.require('goog.Disposable');



/**
 * Action subscription manager.  Maintains a list of action subscriptions so
 * they can be removed easily (similar to how {@link goog.events.EventHandler}
 * makes it easy to clean up event listeners).
 *
 * @param {!Object=} opt_context Object in whose context functions are to be
 *     subscribed (the global scope if none).
 * @constructor
 * @extends {goog.Disposable}
 */
apps.action.SubscriptionManager = function(opt_context) {
  goog.Disposable.call(this);

  /**
   * Object in whose context subscribed functions are to be called by default.
   * @type {!Object|undefined}
   * @private
   */
  this.context_ = opt_context;

  /**
   * Array of action subscriptions.  Actions are at even indices, subscription
   * keys are at odd indices.
   * @type {!Array.<!apps.action.Action|number>}
   * @private
   */
  this.subscriptions_ = [];
};
goog.inherits(apps.action.SubscriptionManager, goog.Disposable);


/**
 * Subscribes a function to a topic on the given action.  The function is
 * invoked as a method on the given {@code opt_context} object, or the default
 * context of the subscription manager if unspecified.
 * @param {!apps.action.Action} action Action on which to subscribe to a topic.
 * @param {apps.action.Topic} topic Topic to subscribe to.
 * @param {!Function} fn Function to be called when a message is published to
 *     the given topic on the given action.
 * @param {!Object=} opt_context Object in whose context the function is to be
 *     called (the subscription manager's default context if unspecified).
 * @return {!apps.action.SubscriptionManager} This object, allowing for chaining
 *     of calls.
 */
apps.action.SubscriptionManager.prototype.subscribe = function(action, topic,
    fn, opt_context) {
  var key = action.subscribe(topic, fn, opt_context || this.context_);
  this.subscriptions_.push(action, key);
  return this;
};


/**
 * Removes all subscriptions created using this subscription manager.
 */
apps.action.SubscriptionManager.prototype.removeAll = function() {
  var action, key;
  while ((key = /** @type {number} */ (this.subscriptions_.pop()))) {
    action = /** @type {!apps.action.Action} */ (this.subscriptions_.pop());
    if (action && !action.isDisposed()) {
      action.unsubscribeByKey(key);
    }
  }
};


/** @override */
apps.action.SubscriptionManager.prototype.disposeInternal = function() {
  apps.action.SubscriptionManager.superClass_.disposeInternal.call(this);
  this.removeAll();
  delete this.context_;
  delete this.subscriptions_;
};
