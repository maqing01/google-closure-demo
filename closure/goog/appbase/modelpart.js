goog.provide('office.app.ModelPart');



/**
 * @interface
 */
office.app.ModelPart = function() {};


/**
 * @param {!office.app.ModelPart} modelPart The part to append.
 * @return {!office.app.ModelPart} A copy of this model part with the given model
 *     part appended.
 */
office.app.ModelPart.prototype.append = goog.abstractMethod;
