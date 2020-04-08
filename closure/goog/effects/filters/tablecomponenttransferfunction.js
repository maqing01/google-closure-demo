goog.provide('office.effects.filters.TableComponentTransferFunction');

goog.require('office.effects.filters.ComponentTransferFunction');



/**
 * A table component transfer function.
 * @see http://www.w3.org/TR/SVG/filters.html#feComponentTransferTypeAttribute
 * @param {!Array.<number>} tableValues The table values that define the linear
 *     interpolation regions of the transfer function.
 * @constructor
 * @struct
 * @final
 * @extends {office.effects.filters.ComponentTransferFunction}
 */
office.effects.filters.TableComponentTransferFunction = function(tableValues) {
  goog.base(this, office.effects.filters.ComponentTransferFunction.Type.TABLE);

  /** @private {!Array.<number>} */
  this.tableValues_ = tableValues;
};
goog.inherits(office.effects.filters.TableComponentTransferFunction,
    office.effects.filters.ComponentTransferFunction);


/**
 * @return {!Array.<number>} The table values.
 */
office.effects.filters.TableComponentTransferFunction.prototype.getTableValues =
    function() {
  return this.tableValues_.concat();
};
