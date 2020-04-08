

/**
 * @fileoverview Contains a provider for CSI network availability based on
 * {@code office.Action.ONLINE}.

 */

goog.provide('office.diagnostics.OnlineCsiAvailabilityProvider');

goog.require('apps.action.SubscriptionManager');
goog.require('apps.action.Topic');
goog.require('apps.diagnostics.CsiAvailabilityProvider');
goog.require('office.Action');
goog.require('goog.Disposable');



/**
 * A CSI availability provider based on {@code office.Action.ONLINE}. Provides
 * the ability to query whether CSI is available and allows clients to register
 * callbacks for when CSI becomes available.
 * @extends {goog.Disposable}
 * @implements {apps.diagnostics.CsiAvailabilityProvider}
 * @constructor
 * @struct
 */
office.diagnostics.OnlineCsiAvailabilityProvider = function() {
  /**
   * The subscription manager.
   * @type {!apps.action.SubscriptionManager}
   * @private
   */
  var subscriptionManager = new apps.action.SubscriptionManager(this);
  this.registerDisposable(subscriptionManager);

  /**
   * Callbacks to call when CSI becomes available.
   * @type {!Array.<function()>}
   * @private
   */
  this.callbacks_ = [];

  subscriptionManager.subscribe(
      office.Action.ONLINE,
      apps.action.Topic.ENABLED,
      goog.bind(this.handleAvailable_, this));
};
goog.inherits(office.diagnostics.OnlineCsiAvailabilityProvider, goog.Disposable);


/** @override */
office.diagnostics.OnlineCsiAvailabilityProvider.prototype.isAvailable =
    function() {
  return office.Action.ONLINE.isEnabled();
};


/** @override */
office.diagnostics.OnlineCsiAvailabilityProvider.prototype.callWhenAvailable =
    function(callback) {
  if (this.isAvailable()) {
    callback();
  } else {
    this.callbacks_.push(callback);
  }
};


/**
 * Calls the callback function in response to the ONLINE action being enabled.
 * @private
 */
office.diagnostics.OnlineCsiAvailabilityProvider.prototype.handleAvailable_ =
    function() {
  for (var i = 0; i < this.callbacks_.length; i++) {
    this.callbacks_[i]();
  }
  this.callbacks_ = [];
};


/** @override */
office.diagnostics.OnlineCsiAvailabilityProvider.prototype.disposeInternal =
    function() {
  delete this.callbacks_;

  goog.base(this, 'disposeInternal');
};
