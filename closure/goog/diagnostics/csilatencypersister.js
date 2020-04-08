/**
 * @fileoverview The CsiLatencyPersister interface.
 */

goog.provide('apps.diagnostics.CsiLatencyPersister');



/**
 * A latency reporter that persists latency stats while offline.
 * @interface
 */
apps.diagnostics.CsiLatencyPersister = function() {};


/**
 * Persists the given events, or queues them if no persistence is available.
 * @param {!apps.diagnostics.CsiParameters} csiParameters The CSI parameters.
 * @param {string} timerName The name of the CSI timer to use.
 * @param {number} startTime The start time relative to the events.
 * @param {!Array.<Object>} events The events.
 * @param {boolean} includesServerResponseTime Whether the times include server
 *     response time.
 */
apps.diagnostics.CsiLatencyPersister.prototype.persistEvents =
    goog.abstractMethod;
