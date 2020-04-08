goog.provide('office.effects.filters.ComponentTransferFilterOp');

goog.require('office.effects.filters.FilterOp');



/**
 * A filter primitive for component transfer filters. This filter applies a
 * function to each RGBA channel individually, e.g. non linear transformations.
 * @see http://www.w3.org/TR/SVG/filters.html#feComponentTransferElement
 * @param {office.effects.filters.ComponentTransferFunction} redFunction
 * @param {office.effects.filters.ComponentTransferFunction} greenFunction
 * @param {office.effects.filters.ComponentTransferFunction} blueFunction
 * @param {office.effects.filters.ComponentTransferFunction} alphaFunction
 * @constructor
 * @struct
 * @extends {office.effects.filters.FilterOp}
 * @final
 */
office.effects.filters.ComponentTransferFilterOp = function(
    redFunction, greenFunction, blueFunction, alphaFunction) {
  goog.base(this, office.effects.filters.FilterOp.Type.COMPONENT_TRANSFER);

  /** @private {office.effects.filters.ComponentTransferFunction} */
  this.redFunction_ = redFunction;

  /** @private {office.effects.filters.ComponentTransferFunction} */
  this.greenFunction_ = greenFunction;

  /** @private {office.effects.filters.ComponentTransferFunction} */
  this.blueFunction_ = blueFunction;

  /** @private {office.effects.filters.ComponentTransferFunction} */
  this.alphaFunction_ = alphaFunction;
};
goog.inherits(office.effects.filters.ComponentTransferFilterOp,
    office.effects.filters.FilterOp);


/** @return {office.effects.filters.ComponentTransferFunction} */
office.effects.filters.ComponentTransferFilterOp.prototype.getRedFunction =
    function() {
  return this.redFunction_;
};


/** @return {office.effects.filters.ComponentTransferFunction} */
office.effects.filters.ComponentTransferFilterOp.prototype.getGreenFunction =
    function() {
  return this.greenFunction_;
};


/** @return {office.effects.filters.ComponentTransferFunction} */
office.effects.filters.ComponentTransferFilterOp.prototype.getBlueFunction =
    function() {
  return this.blueFunction_;
};


/** @return {office.effects.filters.ComponentTransferFunction} */
office.effects.filters.ComponentTransferFilterOp.prototype.getAlphaFunction =
    function() {
  return this.alphaFunction_;
};
