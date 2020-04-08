goog.provide('office.structs.ImmutableRect');

goog.require('goog.math.Coordinate');



/**
 * Class for representing immutable rectangles.
 * @param {number} x Left.
 * @param {number} y Top.
 * @param {number} w Width.
 * @param {number} h Height.
 * @constructor
 * @struct
 */
office.structs.ImmutableRect = function(x, y, w, h) {

  /** @private {number} */
  this.left_ = x;

  /** @private {number} */
  this.top_ = y;

  /** @private {number} */
  this.width_ = w;

  /** @private {number} */
  this.height_ = h;
};


/**
 * Returns the left of this rectangle.
 * @return {number} The left.
 */
office.structs.ImmutableRect.prototype.getLeft = function() {
  return this.left_;
};


/**
 * Returns the right of this rectangle.
 * @return {number} The right.
 */
office.structs.ImmutableRect.prototype.getRight = function() {
  return this.left_ + this.width_;
};


/**
 * Returns the top of this rectangle.
 * @return {number} The top.
 */
office.structs.ImmutableRect.prototype.getTop = function() {
  return this.top_;
};


/**
 * Returns the bottom of this rectangle.
 * @return {number} The bottom.
 */
office.structs.ImmutableRect.prototype.getBottom = function() {
  return this.top_ + this.height_;
};


/**
 * Returns the x-coordinate of the center.
 * @return {number}
 */
office.structs.ImmutableRect.prototype.getCenterX = function() {
  return this.left_ + this.width_ / 2;
};


/**
 * Returns the y-coordinate of the center.
 * @return {number}
 */
office.structs.ImmutableRect.prototype.getCenterY = function() {
  return this.top_ + this.height_ / 2;
};


/**
 * Returns the center as a {@code goog.math.Coordinate}.
 * @return {!goog.math.Coordinate}
 */
office.structs.ImmutableRect.prototype.getCenterCoordinate = function() {
  return new goog.math.Coordinate(
      this.left_ + this.width_ / 2, this.top_ + this.height_ / 2);
};


/**
 * Returns the width of this rectangle.
 * @return {number} The width.
 */
office.structs.ImmutableRect.prototype.getWidth = function() {
  return this.width_;
};


/**
 * Returns the height of this rectangle.
 * @return {number} The height.
 */
office.structs.ImmutableRect.prototype.getHeight = function() {
  return this.height_;
};


if (goog.DEBUG) {
  /** @override */
  office.structs.ImmutableRect.prototype.toString = function() {
    return 'ImmutableRect{' +
        'top=' + this.top_ + ', ' +
        'left=' + this.left_ + ', ' +
        'width=' + this.width_ + ', ' +
        'height=' + this.height_ + '}';
  };
}


/**
 * Returns true iff this rectangle entirely contains the given coordinate,
 * false otherwise.
 * @param {!goog.math.Coordinate} coord The coordinate to test for containment.
 * @return {boolean} Whether this rectangle contains given coordinate.
 */
office.structs.ImmutableRect.prototype.contains = function(coord) {
  return coord.x >= this.left_ &&
      coord.x <= this.left_ + this.width_ &&
      coord.y >= this.top_ &&
      coord.y <= this.top_ + this.height_;
};


/**
 * Returns the bounding rectangle of this rectangle upon clockwise rotation
 * about its center by the given angle, in radians. The bounding rectangle is
 * the smallest axis-aligned rectangle containing the rotated rectangle.
 * @param {number} rotation
 * @return {!office.structs.ImmutableRect}
 */
office.structs.ImmutableRect.prototype.getBoundingRect = function(rotation) {
  var cos = Math.abs(Math.cos(rotation));
  var sin = Math.abs(Math.sin(rotation));
  var boxWidth = this.width_ * cos + this.height_ * sin;
  var boxHeight = this.width_ * sin + this.height_ * cos;

  return office.structs.ImmutableRect.fromCenter(
      this.getCenterX(), this.getCenterY(), boxWidth, boxHeight);
};


/**
 * Returns true iff the given rectangles are equivalent, otherwise returns
 * false.
 * @param {office.structs.ImmutableRect} first The first rectangle.
 * @param {office.structs.ImmutableRect} second The second rectangle.
 * @return {boolean} Returns true iff both rectangles have the same left, top,
 *     width, and height, or if both are null.
 */
office.structs.ImmutableRect.equals = function(first, second) {
  if (first == second) {
    return true;
  }
  if (!first || !second) {
    return false;
  }
  return first.left_ == second.left_ && first.width_ == second.width_ &&
      first.top_ == second.top_ && first.height_ == second.height_;
};


/**
 * Translate the rectangle by the given deltas.
 * @param {!office.structs.ImmutableRect} rect The rectangle to translate.
 * @param {number} deltaX The amount by which to shift the left offset.
 * @param {number} deltaY The amount by which to shift the top offset.
 * @return {!office.structs.ImmutableRect} The translated rectangle.
 */
office.structs.ImmutableRect.translate = function(rect, deltaX, deltaY) {
  if (deltaX == 0 && deltaY == 0) {
    return rect;
  }

  return new office.structs.ImmutableRect(
      rect.left_ + deltaX,
      rect.top_ + deltaY,
      rect.width_,
      rect.height_);
};


/**
 * Constructs a rectangle using the coordinates for the center of the rectangle.
 * @param {number} cx The x-coordinate of the center.
 * @param {number} cy The y-coordinate of the center.
 * @param {number} w Width.
 * @param {number} h Height.
 * @return {!office.structs.ImmutableRect}
 */
office.structs.ImmutableRect.fromCenter = function(cx, cy, w, h) {
  return new office.structs.ImmutableRect(cx - w / 2, cy - h / 2, w, h);
};
