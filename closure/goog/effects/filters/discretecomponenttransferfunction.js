goog.provide('office.effects.filters.DiscreteComponentTransferFunction');

goog.require('office.effects.filters.ComponentTransferFunction');



/**
 * A discrete component transfer function.
 * @see http://www.w3.org/TR/SVG/filters.html#feComponentTransferTypeAttribute
 * @param {!Array.<number>} discreteValues The values to use in the step
 *     function.
 * @constructor
 * @struct
 * @final
 * @extends {office.effects.filters.ComponentTransferFunction}
 */
office.effects.filters.DiscreteComponentTransferFunction =
    function(discreteValues) {
  goog.base(this, office.effects.filters.ComponentTransferFunction.Type.DISCRETE);

  /** @private {!Array.<number>} */
  this.discreteValues_ = discreteValues;
};
goog.inherits(office.effects.filters.DiscreteComponentTransferFunction,
    office.effects.filters.ComponentTransferFunction);


/**
 * @return {!Array.<number>} The discrete values.
 */
office.effects.filters.DiscreteComponentTransferFunction.prototype.
    getDiscreteValues = function() {
  return this.discreteValues_.concat();
};
