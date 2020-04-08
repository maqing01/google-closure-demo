goog.provide('office.diagnostics.NullLatencyReporter');

goog.require('apps.diagnostics.LatencyReporter');



/**
 * A no-op latency reporter.
 * @constructor
 * @struct
 * @implements {apps.diagnostics.LatencyReporter}
 */
office.diagnostics.NullLatencyReporter = function() {
};


/** @override */
office.diagnostics.NullLatencyReporter.prototype.init = goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.clear = goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.flushLoadEvents =
    goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.flushOperationEvents =
    goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.addExperiment =
    goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.removeExperiment =
    goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.log = goog.nullFunction;


/** @override */
office.diagnostics.NullLatencyReporter.prototype.setPersister =
    goog.nullFunction;
