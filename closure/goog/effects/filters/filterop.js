goog.provide('office.effects.filters.FilterOp');



/**
 * A base class for filter primitives to be handled by a renderer.
 * @param {office.effects.filters.FilterOp.Type} type
 * @constructor
 * @struct
 */
office.effects.filters.FilterOp = function(type) {
  /** @private {office.effects.filters.FilterOp.Type} */
  this.type_ = type;
};


/** @enum {string} */
office.effects.filters.FilterOp.Type = {
  COLOR_MATRIX: goog.events.getUniqueId('colormatrix'),
  COMPONENT_TRANSFER: goog.events.getUniqueId('componenttransfer'),
  CONVOLVE: goog.events.getUniqueId('convolve'),
  FAKE: goog.events.getUniqueId('fake')
};


/**
 * Returns the filter operation type.
 * @return {office.effects.filters.FilterOp.Type}
 */
office.effects.filters.FilterOp.prototype.getType = function() {
  return this.type_;
};
