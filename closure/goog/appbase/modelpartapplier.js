

/**
 * @fileoverview Contains an interface for applying model parts to a model.

 */

goog.provide('office.app.ModelPartApplier');



/**
 * An interface for applying model parts to a model.
 * @interface
 */
office.app.ModelPartApplier = function() {};


/**
 * Applies a model part to the model.
 * @param {!office.app.ModelPart} modelPart The model part that has been loaded.
 * @param {boolean} isIncremental Whether the given mutations are incremental,
 *     as opposed to a snapshot.
 */
office.app.ModelPartApplier.prototype.applyModelPart = goog.abstractMethod;
