goog.provide('office.structs.ImmutableBox');



/**
 * Class for representing an immutable box. A box is specified as a
 * top, right, bottom, and left. A box is useful for representing margins
 * and padding.
 * @see goog.math.Box
 * @param {number} top Top.
 * @param {number} right Right.
 * @param {number} bottom Bottom.
 * @param {number} left Left.
 * @constructor
 * @struct
 */
office.structs.ImmutableBox = function(top, right, bottom, left) {
  //  Reconcile this with Closure's goog.math.Box.
  /** @private {number} */
  this.top_ = top;

  /** @private {number} */
  this.right_ = right;

  /** @private {number} */
  this.bottomElement_ = bottom;

  /** @private {number} */
  this.left_ = left;
};


/** @return {number} */
office.structs.ImmutableBox.prototype.getTop = function() {
  return this.top_;
};


/** @return {number} */
office.structs.ImmutableBox.prototype.getRight = function() {
  return this.right_;
};


/** @return {number} */
office.structs.ImmutableBox.prototype.getBottom = function() {
  return this.bottomElement_;
};


/** @return {number} */
office.structs.ImmutableBox.prototype.getLeft = function() {
  return this.left_;
};


/**
 * Clones this box with the given overrides.
 * @param {number=} opt_top New top value.
 * @param {number=} opt_right New right value.
 * @param {number=} opt_bottom New bottom value.
 * @param {number=} opt_left New left value.
 * @return {!office.structs.ImmutableBox} The clone of this box with the given
 *     overrides.
 */
office.structs.ImmutableBox.prototype.clone = function(
    opt_top, opt_right, opt_bottom, opt_left) {
  return new office.structs.ImmutableBox(
      goog.isDef(opt_top) ? opt_top : this.top_,
      goog.isDef(opt_right) ? opt_right : this.right_,
      goog.isDef(opt_bottom) ? opt_bottom : this.bottomElement_,
      goog.isDef(opt_left) ? opt_left : this.left_);
};
