goog.provide('office.diagnostics.ModelExperimentCalculator');



/**
 * An interface for calculating latency reporter experiments for the provided
 * model states.
 * @interface
 */
office.diagnostics.ModelExperimentCalculator = function() {};


/**
 * Return an experiment label for the given Model.
 * @param {!office.model.Model} model
 * @return {!Array.<string>}
 */
office.diagnostics.ModelExperimentCalculator.prototype.getExperiments =
    goog.abstractMethod;
