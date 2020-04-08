goog.provide('office.effects.filters.ComponentTransferFunction');



/**
 * An abstract class for use as a function on a RGBA channel in a
 * {@code office.effects.filters.ComponentTransferFilterOp}.
 * @see http://www.w3.org/TR/SVG/filters.html#feComponentTransferTypeAttribute
 * @param {office.effects.filters.ComponentTransferFunction.Type} type
 * @constructor
 * @struct
 */
office.effects.filters.ComponentTransferFunction = function(type) {
  /** @private {office.effects.filters.ComponentTransferFunction.Type} */
  this.type_ = type;
};


/** @enum {string} */
office.effects.filters.ComponentTransferFunction.Type = {
  DISCRETE: 'discrete',
  TABLE: 'table'
};


/** @return {office.effects.filters.ComponentTransferFunction.Type} */
office.effects.filters.ComponentTransferFunction.prototype.getType = function() {
  return this.type_;
};
