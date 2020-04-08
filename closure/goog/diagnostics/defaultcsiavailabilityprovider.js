

/**
 * @fileoverview Contains an interface for the CSI network status that is always
 * available.
 * @author jrv@google.com (Jake Voytko)
 */

goog.provide('apps.diagnostics.DefaultCsiAvailabilityProvider');

goog.require('apps.diagnostics.CsiAvailabilityProvider');



/**
 * An interface that provides whether CSI is currently reachable.
 * @constructor
 * @implements {apps.diagnostics.CsiAvailabilityProvider}
 */
apps.diagnostics.DefaultCsiAvailabilityProvider = function() {};


/** @override */
apps.diagnostics.DefaultCsiAvailabilityProvider.prototype.isAvailable =
    function() {
  return true;
};


/** @override */
apps.diagnostics.DefaultCsiAvailabilityProvider.prototype.callWhenAvailable =
    function(callback) {
  callback();
};
