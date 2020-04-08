goog.provide('office.structs.util.RectResizer');

goog.require('office.structs.ImmutableRect');
goog.require('office.util.Resizer');
goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');



/**
 * A class containing logic for resizing rotated
 * {@code office.structs.ImmutableRect}s.
 * @param {!office.structs.ImmutableRect} rect The rectangle before resizing.
 * @param {number} rotation The clockwise rotation angle of the rectangle about
 *     its center, in radians.
 * @param {number} handleIndex The index (0 to 7, inclusive) of the handle used
 *     to resize the rectangle.
 *         7--0--1
 *         |     |
 *         6     2
 *         |     |
 *         5--4--3
 * @param {boolean} maintainAspectRatio Whether resizing using a corner handle
 *     should maintain the aspect ratio of the rectangle.
 * @param {!goog.math.Size} minSize The minimum width and height for the
 *     rectangle.
 * @param {!goog.math.Size} maxSize The maximum width and height for the
 *     rectangle.
 * @constructor
 * @struct
 * @final
 */
office.structs.util.RectResizer = function(
    rect, rotation, handleIndex, maintainAspectRatio, minSize, maxSize) {
  /**
   * @private {!office.structs.ImmutableRect}
   * @final
   */
  this.rect_ = rect;

  /**
   * @private {number}
   * @final
   */
  this.rotation_ = rotation;

  /**
   * @private {number}
   * @final
   */
  this.handleIndex_ = handleIndex;

  /**
   * Whether to maintain the aspect ratio. Respected only for corner handles.
   * @private {boolean}
   * @final
   */
  this.maintainAspectRatio_ = this.handleIndex_ % 2 != 0 && maintainAspectRatio;

  /**
   * @private {!goog.math.Size}
   * @final
   */
  this.minSize_ = minSize;

  /**
   * @private {!goog.math.Size}
   * @final
   */
  this.maxSize_ = maxSize;

  /**
   * Cached coordinates (as an array [x, y]) of the opposite resize handle since
   * it stays fixed during resize.
   * @private {!Array.<number>}
   * @final
   */
  this.opposite_ = this.getHandleBeforeRotation_((handleIndex + 4) % 8);

  /**
   * Resizer which computes resized widths and heights before constraining
   * proportions and clamping to min and max heights.
   * @private {!office.util.Resizer}
   * @final
   */
  this.resizer_ = new office.util.Resizer(
      handleIndex,
      this.getHandleBeforeRotation_(handleIndex) /* handle */,
      [rect.getLeft(), rect.getTop(), rect.getRight(), rect.getBottom()]);
};


/** @enum {number} */
office.structs.util.RectResizer.HandleIndex = {
  TOP: 0,
  TOP_RIGHT: 1,
  RIGHT: 2,
  BOTTOM_RIGHT: 3,
  BOTTOM: 4,
  BOTTOM_LEFT: 5,
  LEFT: 6,
  TOP_LEFT: 7
};


/**
 * The offset of the resize handles from the center of the rectangle when
 * unrotated, as fractions of the rectangle's width and height. Indexed by the
 * handle indices.
 * @private {!Array.<number>}
 */
office.structs.util.RectResizer.HANDLE_POSITION_ = [
  [0, -0.5],
  [0.5, -0.5],
  [0.5, 0],
  [0.5, 0.5],
  [0, 0.5],
  [-0.5, 0.5],
  [-0.5, 0],
  [-0.5, -0.5]
];


/**
 * Calculates the new rectangle after dragging the resize handle to the given
 * coordinates.
 * @param {!Array.<number>} dragCoordinates The drag coordinates of the resize
 *     handle, given as an array [x, y].
 * @return {!office.structs.ImmutableRect}
 */
office.structs.util.RectResizer.prototype.calculateNewRect =
    function(dragCoordinates) {
  var oldCenterCoordinate = this.rect_.getCenterCoordinate();
  var oldCenter = [oldCenterCoordinate.x, oldCenterCoordinate.y];

  // Rotate the drag coordinates into the space of the unrotated rectangle.
  var coordinates = new goog.math.Coordinate(
      dragCoordinates[0], dragCoordinates[1]);
  coordinates.rotateRadians(-this.rotation_, oldCenterCoordinate);
  var newCoordinates = [coordinates.x, coordinates.y];

  // Clamp the drag coordinates to the same quadrant as the center, with respect
  // to the opposite handle.
  for (var i = 0; i < 2; i++) {
    if ((this.opposite_[i] - oldCenter[i]) *
        (this.opposite_[i] - newCoordinates[i]) < 0) {
      newCoordinates[i] = this.opposite_[i];
    }
  }

  // Compute the new width and height.
  var newBox = this.resizer_.calculateNewRect(
      newCoordinates, false /* resizeFromCenter */);
  var newWidth = newBox[2] - newBox[0];
  var newHeight = newBox[3] - newBox[1];

  // Clamp to the minimum and maximum sizes, maintaining the aspect ratio if
  // necessary.
  var clampedSize =
      this.clampDimensions_(newWidth, newHeight, this.maintainAspectRatio_);
  newWidth = clampedSize.width;
  newHeight = clampedSize.height;

  // Compute the new center and rotate it back to the original space of the
  // rotated rectangle.
  var position =
      office.structs.util.RectResizer.HANDLE_POSITION_[this.handleIndex_];
  var newCenter = new goog.math.Coordinate(
      this.opposite_[0] + position[0] * newWidth,
      this.opposite_[1] + position[1] * newHeight);
  newCenter.rotateRadians(this.rotation_, oldCenterCoordinate);

  return office.structs.ImmutableRect.fromCenter(
      newCenter.x, newCenter.y, newWidth, newHeight);
};


/**
 * Returns the size corresponding to the given width and height after clamping
 * both dimensions to the minimum and maximum sizes. For example, with a minimum
 * size of 4x4 and a maximum size of 8x8, a 3x6 rect would be clamped to 4x6 (or
 * 4x8 if preserving the aspect ratio). If it is not possible to simultaneously
 * satisfy both constraints, the minimum size is ignored.
 * @param {number} width
 * @param {number} height
 * @param {boolean} maintainAspectRatio Whether to maintain the width to height
 *     ratio of the given dimensions.
 * @return {!goog.math.Size}
 * @private
 */
office.structs.util.RectResizer.prototype.clampDimensions_ =
    function(width, height, maintainAspectRatio) {
  var oldWidth = this.rect_.getWidth();
  var oldHeight = this.rect_.getHeight();
  var minWidth = this.minSize_.width;
  var minHeight = this.minSize_.height;
  var maxWidth = this.maxSize_.width;
  var maxHeight = this.maxSize_.height;

  // The aspect ratio cannot be maintained if either the width or height are
  // zero.
  if (!maintainAspectRatio || oldWidth * oldHeight == 0) {
    return new goog.math.Size(
        goog.math.clamp(width, minWidth, maxWidth),
        goog.math.clamp(height, minHeight, maxHeight));
  }

  var newWidth = width;
  var newHeight = height;
  // A 0x0 box vacuously has the same aspect ratio as any other box. However, it
  // cannot be scaled to satisfy the minimum size so arbitrarily start with the
  // minimum size box instead.
  if (newWidth == 0 && newHeight == 0) {
    newWidth = minWidth;
    newHeight = minHeight;
  }

  // Lengthen the appropriate side to maintain the aspect ratio.
  if (newWidth / oldWidth < newHeight / oldHeight) {
    newWidth = newHeight * oldWidth / oldHeight;
  } else {
    newHeight = newWidth * oldHeight / oldWidth;
  }

  // Scale both dimensions to satisfy the minimum size, then the maximum size.
  var minSizeFactor = Math.max(minWidth / newWidth, minHeight / newHeight, 1);
  newWidth *= minSizeFactor;
  newHeight *= minSizeFactor;
  var maxSizeFactor = Math.min(maxWidth / newWidth, maxHeight / newHeight, 1);
  newWidth *= maxSizeFactor;
  newHeight *= maxSizeFactor;

  return new goog.math.Size(newWidth, newHeight);
};


/**
 * @param {number} handleIndex
 * @return {!Array.<number>} The coordinates of the handle corresponding to the
 *     given index, before rotation.
 * @private
 */
office.structs.util.RectResizer.prototype.getHandleBeforeRotation_ = function(
    handleIndex) {
  var position = office.structs.util.RectResizer.HANDLE_POSITION_[handleIndex];
  return [
    this.rect_.getCenterX() + position[0] * this.rect_.getWidth(),
    this.rect_.getCenterY() + position[1] * this.rect_.getHeight()
  ];
};
