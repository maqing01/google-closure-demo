goog.provide('office.effects.filters.KernelFactory');

goog.require('office.effects.filters.Kernel');
goog.require('goog.array');


/**
 * The threshold value for standard deviations, used to decide between using a
 * 2D gaussian kernel or approximating a 2D kernel with multiple 1D box blur
 * kernels.
 * @see http://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
 * @private {number}
 */
office.effects.filters.KernelFactory.BLUR_APPROXIMATION_THRESHOLD_ = 2;


/**
 * Factor for computing box blur kernel sizes.
 * @see http://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
 * @private {number}
 */
office.effects.filters.KernelFactory.GAUSSIAN_FACTOR_ =
    3 / 4 * Math.sqrt(2 * Math.PI);


/**
 * The standard deviation to use in the low pass filter when constructing the
 * sharpen kernel. The value 0.5 results in a 5x5 kernel, and was chosen
 * empirically.
 * @private {number}
 */
office.effects.filters.KernelFactory.SHARPEN_SIGMA_ = 0.5;


/**
 * Creates a high pass kernel for sharpening an image. The high pass kernel is
 * constructed by subtracting a gaussian blur kernel multiplied by factor from
 * the identity kernel. Detailed implementation notes can be found in the
 * following link.
 * @see http://www.fmwconcepts.com/imagemagick/digital_image_filtering.pdf
 * @param {number} factor used to multiply the low pass filter to dampen or
 *     enhance the effect.
 * @return {!office.effects.filters.Kernel}
 */
office.effects.filters.KernelFactory.createSharpenKernel = function(factor) {
  var SHARPEN_SIGMA = office.effects.filters.KernelFactory.SHARPEN_SIGMA_;

  var order = office.effects.filters.KernelFactory.orderForSigma_(SHARPEN_SIGMA);
  var identityValues =
      office.effects.filters.KernelFactory.createIdentityKernelValues_(order);
  var lowPassFilterValues = office.effects.filters.KernelFactory.
      createGaussianKernelValues_(SHARPEN_SIGMA, SHARPEN_SIGMA);
  if (lowPassFilterValues.length != identityValues.length) {
    throw Error('Unexpected kernel sizes');
  }

  var highPassFilterValues = [];
  var sum = 0;
  for (var i = 0; i < lowPassFilterValues.length; i++) {
    sum += highPassFilterValues[i] =
        identityValues[i] - factor * lowPassFilterValues[i];
  }
  office.effects.filters.KernelFactory.normalizeKernelValues_(
      highPassFilterValues, sum);

  var target = Math.floor(order / 2);
  return new office.effects.filters.Kernel(
      highPassFilterValues, order, order, target, target);
};


/**
 * Creates an identity kernel of the given order.
 * @param {number} order An odd value, used to create an order x order kernel.
 * @return {!Array.<number>}
 * @private
 */
office.effects.filters.KernelFactory.createIdentityKernelValues_ =
    function(order) {
  if (order % 2 != 1) {
    throw Error('Unexpected order size');
  }
  var kernelValues = goog.array.repeat(0, order * order);
  kernelValues[Math.floor(kernelValues.length / 2)] = 1;
  return kernelValues;
};


/**
 * Returns a list of kernels with normalized values for use in a
 * ConvolveFilterOp for producing a gaussian blur effect.
 * @param {number} stdDevX the standard deviation of the gaussian distribution
 *     in the horizontal direction
 * @param {number} stdDevY the standard deviation of the gaussian distribution
 *     in the vertical direction
 * @return {!Array.<!office.effects.filters.Kernel>}
 */
office.effects.filters.KernelFactory.createBlurKernels =
    function(stdDevX, stdDevY) {
  if (!(stdDevX > 0 || stdDevY > 0)) {
    throw Error('Unable to create kernel for no blur');
  } else if (stdDevX < 0 || stdDevY < 0) {
    throw Error('Blur amount must be greater than or equal to 0');
  }

  var BLUR_APPROXIMATION_THRESHOLD =
      office.effects.filters.KernelFactory.BLUR_APPROXIMATION_THRESHOLD_;
  if (stdDevX < BLUR_APPROXIMATION_THRESHOLD &&
      stdDevY < BLUR_APPROXIMATION_THRESHOLD) {
    return [
      office.effects.filters.KernelFactory.createGaussianKernel_(stdDevX, stdDevY)
    ];
  }

  var horizontalBoxBlurKernels = office.effects.filters.KernelFactory.
      createBoxBlurKernels_(stdDevX, true /* isHorizontal */);
  var verticalBoxBlurKernels = office.effects.filters.KernelFactory.
      createBoxBlurKernels_(stdDevY, false /* isHorizontal */);
  return horizontalBoxBlurKernels.concat(verticalBoxBlurKernels);
};


/**
 * Creates a normalized gaussian kernel with an odd width and height, with a
 * target pixel at the center of the Kernel. For an NxN image and an MxM kernel,
 * applying this kernel is O(N^2 * M^2), as such it should only be used for
 * small values of M.
 * @param {number} sigmaX the standard deviation of the gaussian distribution
 *     in the horizontal direction
 * @param {number} sigmaY the standard deviation of the gaussian distribution
 *     in the vertical direction
 * @return {!office.effects.filters.Kernel}
 * @private
 */
office.effects.filters.KernelFactory.createGaussianKernel_ =
    function(sigmaX, sigmaY) {
  var kernelValues = office.effects.filters.KernelFactory.
      createGaussianKernelValues_(sigmaX, sigmaY);
  var orderX = office.effects.filters.KernelFactory.orderForSigma_(sigmaX);
  var orderY = office.effects.filters.KernelFactory.orderForSigma_(sigmaY);
  var targetX = Math.floor(orderX / 2);
  var targetY = Math.floor(orderY / 2);

  return new office.effects.filters.Kernel(
      kernelValues, orderX, orderY, targetX, targetY);
};


/**
 * Creates kernel values for a gaussian blur kernel.
 * @param {number} sigmaX the standard deviation of the gaussian distribution
 *     in the horizontal direction
 * @param {number} sigmaY the standard deviation of the gaussian distribution
 *     in the vertical direction
 * @return {!Array.<number>}
 * @private
 */
office.effects.filters.KernelFactory.createGaussianKernelValues_ =
    function(sigmaX, sigmaY) {
  var xKernelValues =
      office.effects.filters.KernelFactory.createGaussianVector_(sigmaX);
  var yKernelValues =
      office.effects.filters.KernelFactory.createGaussianVector_(sigmaY);
  return office.effects.filters.KernelFactory.
      multiplyVectorsAndNormalize_(yKernelValues, xKernelValues);
};


/**
 * Creates a list of 3 box blur (1D) Kernels used to approximate a gaussian
 * blur. Opposed to {@code create2DGaussianKernel} applying a 1D box blur kernel
 * is O(N^2 * 2M), and can be optimized further with the convolution
 * implementation.
 * @see http://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
 * @param {number} sigma The standard deviation of the gaussian distribution to
 *     approximate.
 * @param {boolean} isHorizontal Whether the blur is in the horizontal or
 *     vertical dimension.
 * @return {!Array.<!office.effects.filters.Kernel>}
 * @private
 */
office.effects.filters.KernelFactory.createBoxBlurKernels_ =
    function(sigma, isHorizontal) {
  if (sigma == 0) {
    return [];
  }

  // Approximates the size of the box blur to apply.
  // @see http://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
  var boxBlurSize = Math.floor(
      sigma * office.effects.filters.KernelFactory.GAUSSIAN_FACTOR_ + 0.5);
  var boxBlur = goog.array.repeat(1 / boxBlurSize, boxBlurSize);

  var Kernel = office.effects.filters.Kernel;
  if (boxBlurSize % 2 == 0) {
    // When 'boxBlurSize' is even, create two box-blurs of size 'boxBlurSize'
    // (the first one centered on the pixel boundary between the output pixel
    // and the one to the left, the second one centered on the pixel boundary
    // between the output pixel and the one to the right) and one box blur of
    // size 'boxBlurSize+1' centered on the output pixel.
    var oddBoxBlur = goog.array.repeat(1 / (boxBlurSize + 1), boxBlurSize + 1);

    var targetBefore = boxBlurSize / 2 - 1;
    var targetAfter = targetBefore + 1;
    if (isHorizontal) {
      return [
        new Kernel(boxBlur, boxBlurSize, 1, targetBefore, 0),
        new Kernel(boxBlur, boxBlurSize, 1, targetAfter, 0),
        new Kernel(oddBoxBlur, boxBlurSize + 1, 1, targetAfter, 0)
      ];
    } else {
      return [
        new Kernel(boxBlur, 1, boxBlurSize, 0, targetBefore),
        new Kernel(boxBlur, 1, boxBlurSize, 0, targetAfter),
        new Kernel(oddBoxBlur, 1, boxBlurSize + 1, 0, targetAfter)
      ];
    }
  } else {
    // When boxBlurSize is odd, use three box-blurs of size 'boxBlurSize',
    // centered on the output pixel.
    var width = isHorizontal ? boxBlurSize : 1;
    var height = isHorizontal ? 1 : boxBlurSize;
    var targetX = isHorizontal ? Math.floor(boxBlurSize / 2) : 0;
    var targetY = isHorizontal ? 0 : Math.floor(boxBlurSize / 2);
    var kernel = new Kernel(boxBlur, width, height, targetX, targetY);
    return [kernel, kernel, kernel];
  }
};


/**
 * Creates a 1D vector with the normal distribution defined by the gaussian
 * fuction.
 * @param {number} sigma The standard deviation to use in the gaussian fuction.
 * @return {!Array.<number>}
 * @private
 */
office.effects.filters.KernelFactory.createGaussianVector_ = function(sigma) {
  if (sigma == 0) {
    return [1];
  }

  var radius = office.effects.filters.KernelFactory.radiusForSigma_(sigma);
  var order = office.effects.filters.KernelFactory.orderForSigma_(sigma);
  var vector = [];
  for (var i = 0; i < order; i++) {
    vector.push(office.effects.filters.KernelFactory.calculateGaussianValue_(
        i - radius, sigma));
  }
  return vector;
};


/**
 * @param {number} pos The position in the distribution.
 * @param {number} sigma The standard deviation of the gaussian function.
 * @return {number} The gaussian value.
 * @private
 */
office.effects.filters.KernelFactory.calculateGaussianValue_ =
    function(pos, sigma) {
  var variance = sigma * sigma;
  return Math.exp(-pos * pos / (2 * variance));
};


/**
 * Computes the radius of a kernel for the given standard deviation.
 * @param {number} sigma The standard deviation.
 * @return {number}
 * @private
 */
office.effects.filters.KernelFactory.radiusForSigma_ = function(sigma) {
  return Math.ceil(3 * sigma);
};


/**
 * Computes an odd order kernel for the given standard deviation.
 * @param {number} sigma The standard deviation.
 * @return {number}
 * @private
 */
office.effects.filters.KernelFactory.orderForSigma_ = function(sigma) {
  return office.effects.filters.KernelFactory.radiusForSigma_(sigma) * 2 + 1;
};


/**
 * Computes the outer product of two non-zero length vectors. The method
 * normalizes the matrix values in the process, so that the sum of all values is
 * 1.
 * @param {!Array.<number>} columnVector A non-zero length vector.
 * @param {!Array.<number>} rowVector A non-zero length vector.
 * @return {!Array.<number>} The normalized matrix product of the multiplying
 *     columnVector by rowVector.
 * @private
 */
office.effects.filters.KernelFactory.multiplyVectorsAndNormalize_ =
    function(columnVector, rowVector) {
  if (!(columnVector.length > 0 && rowVector.length > 0)) {
    throw Error('Vectors must be non-zero length');
  }

  var size = columnVector.length * rowVector.length;
  var matrix = [];
  var sum = 0;
  for (var i = 0; i < columnVector.length; i++) {
    for (var j = 0; j < rowVector.length; j++) {
      sum += matrix[i * rowVector.length + j] = columnVector[i] * rowVector[j];
    }
  }

  office.effects.filters.KernelFactory.normalizeKernelValues_(matrix, sum);
  return matrix;
};


/**
 * Normalizes all matrix values in place.
 * @param {!Array.<number>} matrix
 * @param {number} sum
 * @private
 */
office.effects.filters.KernelFactory.normalizeKernelValues_ =
    function(matrix, sum) {
  for (var i = 0; i < matrix.length; i++) {
    matrix[i] /= sum;
  }
};
