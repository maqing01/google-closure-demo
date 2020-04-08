
// All Rights Reserved

/**
 * @fileoverview Defines an interface to report latency data to a service.
 *
 * @author corysmith@google.com (Cory Smith)
 * @author pvalenzuela@google.com (Patrick Valenzuela)
 * @author shanbhag@google.com (Shrikant Shanbhag)
 */

goog.provide('apps.diagnostics.LatencyReporter');



/**
 * Latency reporter interface.
 * @interface
 */
apps.diagnostics.LatencyReporter = function() {};


/**
 * Initializes the reporter.
 */
apps.diagnostics.LatencyReporter.prototype.init = goog.abstractMethod;


/**
 * Clears the buffer of unreported events.
 */
apps.diagnostics.LatencyReporter.prototype.clear = goog.abstractMethod;


/**
 * Adds a dynamic experiment to all future events, and flushes all existing
 * events.
 * @param {string} experiment The experiment to add.
 */
apps.diagnostics.LatencyReporter.prototype.addExperiment = goog.abstractMethod;


/**
 * Removes a dynamic experiment from all future events, and flushes all existing
 * events.
 * @param {string} experiment The experiment to remove.
 */
apps.diagnostics.LatencyReporter.prototype.removeExperiment =
    goog.abstractMethod;


/**
 * Reports load event data gathered during an application's load sequence.
 * @param {number} startTime The start time relative to the events.
 * @param {!Array.<Object>} events The load events.
 */
apps.diagnostics.LatencyReporter.prototype.flushLoadEvents =
    goog.abstractMethod;


/**
 * Reports any pending operation events.
 */
apps.diagnostics.LatencyReporter.prototype.flushOperationEvents =
    goog.abstractMethod;


/**
 * Logs an operation event to be reported.
 * @param {*} eventCode The identifying code of the event.
 * @param {number} eventTime The elapsed time of the event.
 */
apps.diagnostics.LatencyReporter.prototype.log = goog.abstractMethod;


/**
 * Sets the latency persister for use when offline.
 * @param {apps.diagnostics.CsiLatencyPersister} persister The latency persister
 *    to use.
 */
apps.diagnostics.LatencyReporter.prototype.setPersister = goog.abstractMethod;
