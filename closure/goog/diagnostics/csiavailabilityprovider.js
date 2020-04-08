

/**
 * @fileoverview Contains an interface for the CSI network status.
 * @author jrv@google.com (Jake Voytko)
 */

goog.provide('apps.diagnostics.CsiAvailabilityProvider');



/**
 * An interface that provides whether CSI is currently reachable.
 * @interface
 */
apps.diagnostics.CsiAvailabilityProvider = goog.abstractMethod;


/**
 * Returns whether CSI is currently reachable.
 * @return {boolean} Whether CSI is currently reachable.
 */
apps.diagnostics.CsiAvailabilityProvider.prototype.isAvailable =
    goog.abstractMethod;


/**
 * Calls a function when CSI becomes available again. If CSI is currently
 * available this will be called immediately.
 * @param {function()} callback The callback to call when CSI becomes available.
 */
apps.diagnostics.CsiAvailabilityProvider.prototype.callWhenAvailable =
    goog.abstractMethod;
