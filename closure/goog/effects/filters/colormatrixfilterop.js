goog.provide('office.effects.filters.ColorMatrixFilterOp');

goog.require('office.effects.filters.FilterOp');
goog.require('goog.math.Matrix');



/**
 * A filter primitive representing a 5x5 affine transform matrix for
 * transforming RGBA color values. The matrix is of the form:
 *
 *     | R' |   | a00  a01  a02  a03  a04 |   | R |
 *     | G' |   | a10  a11  a12  a13  a14 |   | G |
 *     | B' | = | a20  a21  a22  a23  a24 | * | B |
 *     | A' |   | a30  a31  a32  a33  a34 |   | A |
 *     | 1  |   | 0    0    0    0    1   |   | 1 |
 *
 * @param {!goog.math.Matrix} matrix The 5x4 matrix to use for this filter
 *     operation. The 5th row is always (0 0 0 0 1).
 * @constructor
 * @struct
 * @extends {office.effects.filters.FilterOp}
 * @final
 */
office.effects.filters.ColorMatrixFilterOp = function(matrix) {
  goog.base(this, office.effects.filters.FilterOp.Type.COLOR_MATRIX);

  var size = matrix.getSize();
  if (size.width != 5 || size.height != 4) {
    throw new Error('Expected a 5x4 matrix');
  }

  /** @private {!goog.math.Matrix} */
  this.matrix_ = matrix;
};
goog.inherits(office.effects.filters.ColorMatrixFilterOp,
    office.effects.filters.FilterOp);


/**
 * Returns the matrix for this color transform.
 * @return {!goog.math.Matrix}
 */
office.effects.filters.ColorMatrixFilterOp.prototype.getMatrix = function() {
  return this.matrix_;
};


/**
 * Creates a 5x4 matrix with values on the main diagonal set to 1 and the others
 * set to 0.
 * @return {!goog.math.Matrix}
 */
office.effects.filters.ColorMatrixFilterOp.createIdentityColorMatrix =
    function() {
  var matrix = new goog.math.Matrix(4, 5);
  for (var i = 0; i < 4; i++) {
    matrix.setValueAt(i, i, 1);
  }
  return matrix;
};
