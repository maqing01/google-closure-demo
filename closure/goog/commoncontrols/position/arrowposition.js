

/**
 * @fileoverview Provides a positioning algorithm to place an arrow on
 * a box correctly to create an arrowed box (such as bubble and
 * tooltip). Also provides a positioning algorithm to place the box
 * with respect to an anchor.

 */

goog.provide('controls.ArrowPosition');

goog.require('goog.asserts');
goog.require('goog.dom.classlist');
goog.require('goog.i18n.bidi');
goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('goog.object');
goog.require('goog.positioning');
goog.require('goog.positioning.AbstractPosition');
goog.require('goog.positioning.Corner');
goog.require('goog.positioning.CornerBit');
goog.require('goog.positioning.Overflow');
goog.require('goog.positioning.OverflowStatus');
goog.require('goog.style');
goog.require('controls.ArrowAlignment');
goog.require('controls.PopupPosition');



/**
 * A positioning algorithm that position a call-out arrow on a box
 * element. It also doubles up as a positioning algorithm to position
 * the box element (movableElement) with respect to the given anchor.
 * Examples of arrowed boxes are bubbles and call-out tooltips.
 *
 * NOTE(chrishenry): This class is internal to controls, do not use outside
 * //javascript/controls!
 *
 * @param {string} className The class name prefix for the arrows.
 * @param {boolean=} opt_disableSubpixels If true, do all positioning at integer
 *     pixel values only.
 * @constructor
 * @extends {goog.positioning.AbstractPosition}
 */
controls.ArrowPosition = function(className, opt_disableSubpixels) {
  /**
   * @type {string}
   * @private
   */
  this.className_ = className;

  /**
   * Whether to constrain positioning to integer pixel values.
   * @type {boolean}
   * @private
   */
  this.disableSubpixels_ = !!opt_disableSubpixels;

  /**
   * Mapping from popup position to arrow class names.
   * @private
   */
  this.arrowClassMap_ = goog.object.create(
      controls.PopupPosition.LEFT, goog.getCssName(this.className_, 'arrowright'),
      controls.PopupPosition.BOTTOM, goog.getCssName(this.className_, 'arrowup'),
      controls.PopupPosition.TOP, goog.getCssName(this.className_, 'arrowdown'),
      controls.PopupPosition.RIGHT, goog.getCssName(this.className_, 'arrowleft'));
};
goog.inherits(controls.ArrowPosition, goog.positioning.AbstractPosition);


/**
 * Bit sequence used to flip LEFT_OR_TOP to RIGHT_OR_BOTTOM and vice versa.
 * To use this, apply bitwise xor (^) against ArrowAlignment.
 * @type {number}
 * @const
 * @private
 */
controls.ArrowPosition.FLIP_ALIGNMENT_ = 1;


/**
 * Minimum arrow offset.
 * @type {number}
 * @const
 * @private
 */
controls.ArrowPosition.MIN_ARROW_OFFSET_ = 15;


/**
 * Whether to automatically reposition the boxElement_.
 * @type {boolean}
 * @private
 */
controls.ArrowPosition.prototype.isAutoReposition_ = false;


/**
 * @type {Element}
 * @private
 */
controls.ArrowPosition.prototype.anchorElement_;


/**
 * The arrow element.
 * @type {!Element}
 * @private
 */
controls.ArrowPosition.prototype.arrowElement_;


/**
 * The box element.
 * @type {!Element}
 * @private
 */
controls.ArrowPosition.prototype.boxElement_;


/**
 * Alignment of the arrow on the side of the box.
 * @type {!controls.ArrowAlignment}
 * @private
 */
controls.ArrowPosition.prototype.arrowAlignment_ = controls.ArrowAlignment.CENTER;


/**
 * Optional explicit offset (in px) for the arrow from the side of the box.
 * @type {number}
 * @private
 */
controls.ArrowPosition.prototype.arrowOffset_ = 20;


/**
 * Position of the box relative to the anchor.
 * @type {!controls.PopupPosition}
 * @private
 */
controls.ArrowPosition.prototype.boxPosition_ = controls.PopupPosition.RIGHT;


/**
 * Viewport for the box.
 * @type {goog.math.Box}
 * @private
 */
controls.ArrowPosition.prototype.viewport_ = null;


/**
 * Additional offset from anchor to the box element. A negative value places
 * the box element further from the anchor.
 * @type {number}
 * @private
 */
controls.ArrowPosition.prototype.offsetFromAnchor_ = -5;


/**
 * Sets the anchor element. May be null, in which case, the box will
 * stay in its original rendered position (no positioning is done at all).
 * @param {Element} anchor The anchor element.
 */
controls.ArrowPosition.prototype.setAnchorElement = function(anchor) {
  this.anchorElement_ = anchor;
};


/**
 * Sets viewport for the box. The viewport is specified relative to
 * the offset parent for {@code boxElement_}.
 * See documentataion for {@code opt_viewport} at
 * {@code goog.positioning.positionAtAnchor} for more details.
 * @param {!goog.math.Box} viewport Viewport size.
 */
controls.ArrowPosition.prototype.setViewport = function(viewport) {
  this.viewport_ = viewport;
};


/**
 * Sets the position of the box. By default, it is located on the right of
 * the anchor and the arrow is centered.
 * @param {!controls.PopupPosition=} opt_boxPosition Position of
 *     the box relative to the anchor (e.g. left means the box will be
 *     at the left of the anchor). Defaults to RIGHT.
 * @param {controls.ArrowAlignment=} opt_arrowAlignment Arrow
 *     alignment on the side of the box. Defaults to CENTER.
 * @param {number=} opt_arrowOffset Optional offset (in px) for the arrow.
 *     Ignored if Alignment is CENTER. Defaults to 20px.
 * @param {number=} opt_offsetFromAnchor Optional offset (in px) for the
 *     movable box with respect to the anchor. Positive value brings the box
 *     closer to the center of the anchor. Defaults to -5px.
 */
controls.ArrowPosition.prototype.setPosition = function(opt_boxPosition,
    opt_arrowAlignment, opt_arrowOffset, opt_offsetFromAnchor) {
  if (goog.isDefAndNotNull(opt_boxPosition)) {
    this.boxPosition_ = opt_boxPosition;
  }

  if (goog.isDefAndNotNull(opt_arrowAlignment)) {
    this.arrowAlignment_ = opt_arrowAlignment;
  }

  if (goog.isNumber(opt_arrowOffset)) {
    this.arrowOffset_ =
        Math.max(opt_arrowOffset, controls.ArrowPosition.MIN_ARROW_OFFSET_);
  }

  if (goog.isNumber(opt_offsetFromAnchor)) {
    this.offsetFromAnchor_ = opt_offsetFromAnchor;
  }
};


/**
 * Sets box and arrow element to be decorated. The arrow element will then
 * be positioned appropriately with respect to the box element depending
 * on the positioning setting. Need to be called before using
 * {@code reposition}.
 * @param {!Element} boxElement The box element.
 * @param {!Element} arrowElement The arrow element.
 */
controls.ArrowPosition.prototype.setElements = function(boxElement, arrowElement) {
  //  Now that positionArrow is called from reposition,
  // this should really be setArrowElement. We can get box element directly
  // from reposition's arguments list.
  this.boxElement_ = boxElement;
  this.arrowElement_ = arrowElement;
};


/** @override */
controls.ArrowPosition.prototype.reposition = function(
    movableElement /* unused */, movableCorner /* unused */, opt_margin,
    opt_preferredSize /* unused */) {
  goog.asserts.assert(this.arrowElement_, 'Must call setElements first.');

  var boxPosition = this.boxPosition_;
  var arrowAlignment = this.getEffectiveAlignment_(
      this.boxPosition_, this.arrowAlignment_);
  var arrowOffset = this.getEffectiveArrowOffset_();
  this.reposition_(boxPosition, arrowAlignment, arrowOffset, opt_margin);
};


/**
 * Calculates the effective arrow offset. For CENTER-aligned box, the
 * offset is calculated as if LEFT_OR_TOP applies.
 * @return {number} Effective arrow offset from the pinned corner of
 *     the box element.
 * @private
 */
controls.ArrowPosition.prototype.getEffectiveArrowOffset_ = function() {
  if (this.arrowAlignment_ == controls.ArrowAlignment.CENTER) {
    return controls.ArrowPosition.isLeftOrRight_(this.boxPosition_) ?
        this.boxElement_.offsetHeight / 2 : this.boxElement_.offsetWidth / 2;
  }
  return this.arrowOffset_;
};


/**
 * Calculates the effective arrow alignment. CENTER alignment will
 * be resolved to LEFT_OR_TOP. The resulting arrow alignment will then
 * be recomputed (flipped) for RTL.
 * @param {!controls.PopupPosition} boxPosition The effective box position.
 * @param {!controls.ArrowAlignment} arrowAlignment Initial arrow alignment.
 * @return {!controls.ArrowAlignment} Effective arrow alignment, after
 *     considering rtl.
 * @private
 */
controls.ArrowPosition.prototype.getEffectiveAlignment_ = function(
    boxPosition, arrowAlignment) {
  if (arrowAlignment == controls.ArrowAlignment.CENTER) {
    arrowAlignment = controls.ArrowAlignment.LEFT_OR_TOP;
  }

  if (!controls.ArrowPosition.isLeftOrRight_(boxPosition) && goog.i18n.bidi.IS_RTL) {
    return /** @type {controls.ArrowAlignment} */ (
        arrowAlignment ^ controls.ArrowPosition.FLIP_ALIGNMENT_);
  } else {
    return arrowAlignment;
  }
};


/**
 * @param {boolean} auto Whether to use auto re-position.
 */
controls.ArrowPosition.prototype.setAutoReposition = function(auto) {
  this.isAutoReposition_ = auto;
};


/**
 * Actually repositions the box, respecting the given parameters.
 * @param {!controls.PopupPosition} boxPosition The effective box position.
 * @param {!controls.ArrowAlignment} arrowAlignment The effective arrow alignment.
 * @param {number} arrowOffset The effective arrow offset.
 * @param {goog.math.Box=} opt_margin A margin specified in pixels.
 * @param {boolean=} opt_isRetry Whether this is a retry attempt. Without
 *     setting this to true during retry, the repositioning algorithm
 *     can go into infinite loop in degenerate cases.
 * @private
 */
controls.ArrowPosition.prototype.reposition_ = function(
    boxPosition, arrowAlignment, arrowOffset, opt_margin, opt_isRetry) {
  if (this.anchorElement_) {
    var movableCorner = controls.ArrowPosition.getCorner_(
        boxPosition, arrowAlignment);

    var centeringOffset = controls.ArrowPosition.getCenteringOffset_(
        this.anchorElement_, boxPosition, arrowOffset, movableCorner,
        this.boxElement_, this.viewport_);
    var offset = controls.ArrowPosition.isLeftOrRight_(boxPosition) ?
        new goog.math.Coordinate(this.offsetFromAnchor_, centeringOffset) :
        new goog.math.Coordinate(centeringOffset, this.offsetFromAnchor_);

    // If box position is on the left/right of anchor, we allow adjusting
    // on y, but not on x. And vice versa for position on top/bottom of
    // anchor.
    var overflow = controls.ArrowPosition.isLeftOrRight_(boxPosition) ?
        goog.positioning.Overflow.ADJUST_Y | goog.positioning.Overflow.FAIL_X :
        goog.positioning.Overflow.ADJUST_X | goog.positioning.Overflow.FAIL_Y;

    // Logically, anchor position (the side of the box which the arrow is
    // attached to) is the opposite of box position (the side of the anchor the
    // box is on). However, if the anchor's directionality is opposite of the
    // directionality of the locale, and the box position is left or right,
    // then the anchor position is mirrored. For example, if we are in a RTL
    // locale, but the anchor contains LTR text (such as an English name for a
    // business in an otherwise Arabic UI), we want to treat the anchor as if it
    // contained RTL text for the purposes of positioning the bubble, to match
    // the overall UI.  Note that if dir is not set, we assume that the anchor
    // has the same directionality as the locale.
    var anchorPosition = controls.PopupPosition.flip(boxPosition);
    if (controls.ArrowPosition.isLeftOrRight_(boxPosition) &&
        ((goog.i18n.bidi.IS_RTL && this.anchorElement_.dir == 'ltr') ||
        (!goog.i18n.bidi.IS_RTL && this.anchorElement_.dir == 'rtl'))) {
      anchorPosition = boxPosition;
    }

    var result = goog.positioning.positionAtAnchor(
        this.anchorElement_,
        controls.ArrowPosition.getCorner_(anchorPosition, arrowAlignment),
        this.boxElement_, movableCorner, offset, opt_margin,
        this.isAutoReposition_ ? overflow : goog.positioning.Overflow.IGNORE,
        undefined, this.viewport_);

    if (!opt_isRetry && (result & goog.positioning.OverflowStatus.FAILED)) {
      // If positionAtCoordinate failed, we know that this is due to
      // box position being on the same direction as overflow direction,
      // so we flip the box position so that it is on the opposite
      // direction and reattempt. See notes on overflow above.
      this.reposition_(
          controls.PopupPosition.flip(boxPosition),
          arrowAlignment, arrowOffset, opt_margin, true /* retrying */);
      return;
    }

    if (this.disableSubpixels_ &&
        !(result & goog.positioning.OverflowStatus.FAILED)) {
      var boxLeft = parseFloat(this.boxElement_.style.left);
      var boxTop = parseFloat(this.boxElement_.style.top);
      goog.asserts.assert(!isNaN(boxLeft) && !isNaN(boxTop),
          'Could not parse position.');
      if (!goog.math.isInt(boxLeft) || !goog.math.isInt(boxTop)) {
        goog.style.setPosition(
            this.boxElement_, Math.round(boxLeft), Math.round(boxTop));
      }
    }
  }
  this.positionArrow_(boxPosition, arrowAlignment, arrowOffset);
};


/**
 * Positions the arrow with respect to the box element.
 * @param {!controls.PopupPosition} boxPosition The box position.
 * @param {!controls.ArrowAlignment} arrowAlignment Effective arrow alignment.
 * @param {number} arrowOffset Effective arrow offset.
 * @private
 */
controls.ArrowPosition.prototype.positionArrow_ = function(
    boxPosition, arrowAlignment, arrowOffset) {
  // Reset class name and offset first.
  var arrow = this.arrowElement_;
  goog.object.forEach(this.arrowClassMap_, function(val) {
    goog.dom.classlist.enable(arrow, val, false);
  }, this);
  goog.dom.classlist.add(
      arrow, this.arrowClassMap_[boxPosition]);
  arrow.style.top = arrow.style.left = arrow.style.right = arrow.style.bottom =
      '';

  if (this.anchorElement_) {
    // Here, we re-calculate the arrow offset to attempt to center the
    // arrow positioning to the center of the anchor.
    var relativePos = goog.style.getRelativePosition(
        this.anchorElement_, this.boxElement_);
    var offset = controls.ArrowPosition.getAnchorPointOffsetFromAnchorTopLeft_(
        this.anchorElement_, boxPosition);

    // We make sure to clamp the arrow offset so that the arrow is always
    // part of the bubble.
    if (controls.ArrowPosition.isLeftOrRight_(boxPosition)) {
      var offsetTop = controls.ArrowPosition.clamp_(
          relativePos.y + offset.y,
          controls.ArrowPosition.MIN_ARROW_OFFSET_,
          this.boxElement_.offsetHeight - controls.ArrowPosition.MIN_ARROW_OFFSET_);
      arrow.style.top = offsetTop + 'px';
    } else {
      var offsetLeft = controls.ArrowPosition.clamp_(
          relativePos.x + offset.x,
          controls.ArrowPosition.MIN_ARROW_OFFSET_,
          this.boxElement_.offsetWidth - controls.ArrowPosition.MIN_ARROW_OFFSET_);
      arrow.style.left = offsetLeft + 'px';
    }
  } else {
    //  We should really remove this inline bubble hack.
    // It is now required because folks want arrowed panel but without the
    // popup function of a bubble. So, if we provide an alternate way
    // to easily style an arrowed panel, we can get rid of this.
    var side;
    if (arrowAlignment == controls.ArrowAlignment.LEFT_OR_TOP) {
      side = controls.ArrowPosition.isLeftOrRight_(boxPosition) ? 'top' : 'left';
    } else {  // Must be RIGHT_OR_BOTTOM since CENTER is excluded above.
      side = controls.ArrowPosition.isLeftOrRight_(boxPosition) ?
          'bottom' : 'right';
    }
    arrow.style[side] = arrowOffset + 'px';
  }
};


/**
 * Clamps a given value to within the [min, max] range. If min > max,
 * this will always return min value.
 * @param {number} value The value to clamp.
 * @param {number} min The min value.
 * @param {number} max The max value.
 * @return {number} The clamped value.
 * @private
 */
controls.ArrowPosition.clamp_ = function(value, min, max) {
  if (min > max) {
    return min;
  }
  return goog.math.clamp(value, min, max);
};


/**
 * Gets the corner corresponding to the given position and the box
 * internal arrow alignment.
 * @param {controls.PopupPosition} position The side of the box/anchor.
 * @param {controls.ArrowAlignment} arrowAlignment Effective arrow alignment.
 * @return {!goog.positioning.Corner} The corner of this box that should be
 *     positioned next to the anchor corner.
 * @private
 */
controls.ArrowPosition.getCorner_ = function(position, arrowAlignment) {
  // NOTE: arrowAlignment is normalized wrt LTR/RTL while position is not.
  // Make sure to use LEFT/RIGHT, START/END correctly here.
  switch (position) {
    case controls.PopupPosition.TOP:
      return arrowAlignment == controls.ArrowAlignment.LEFT_OR_TOP ?
          goog.positioning.Corner.BOTTOM_LEFT :
          goog.positioning.Corner.BOTTOM_RIGHT;
    case controls.PopupPosition.BOTTOM:
      return arrowAlignment == controls.ArrowAlignment.LEFT_OR_TOP ?
          goog.positioning.Corner.TOP_LEFT :
          goog.positioning.Corner.TOP_RIGHT;
    case controls.PopupPosition.LEFT:
      return arrowAlignment == controls.ArrowAlignment.LEFT_OR_TOP ?
          goog.positioning.Corner.TOP_END :
          goog.positioning.Corner.BOTTOM_END;
    default:
      return arrowAlignment == controls.ArrowAlignment.LEFT_OR_TOP ?
          goog.positioning.Corner.TOP_START :
          goog.positioning.Corner.BOTTOM_START;
  }
};


/**
 * Gets centering offset, adjusted for anchor out of bounds if necessary.
 * @param {!Element} anchor The anchor element.
 * @param {!controls.PopupPosition} boxPosition Effective box position.
 * @param {number} arrowOffset The effective arrow offset.
 * @param {goog.positioning.Corner} movableCorner The movable/box position
 *     corner.
 * @param {!Element=} opt_viewportOffsetParentElement Refer to documentation of
 *     {@code normalizeCenteringOffset_} for details.
 * @param {goog.math.Box=} opt_viewport Refer to documentation of
 *     {@code normalizeCenteringOffset_} for details.
 * @return {number} The positioning offset requires to center the
 *     arrow to the center of the anchor.
 * @private
 */
controls.ArrowPosition.getCenteringOffset_ = function(anchor, boxPosition,
    arrowOffset, movableCorner, opt_viewportOffsetParentElement, opt_viewport) {
  var size = goog.style.getSize(anchor);
  var anchorCenterOffset = controls.ArrowPosition.isLeftOrRight_(boxPosition) ?
      size.height / 2 : size.width / 2;
  var centeringOffset = anchorCenterOffset - arrowOffset;
  return controls.ArrowPosition.normalizeCenteringOffset_(centeringOffset, anchor,
      boxPosition, movableCorner, opt_viewportOffsetParentElement,
      opt_viewport);
};


/**
 * Adjust the given centering offset if the anchor is out of bounds of
 * the viewport. This is needed because positionAtAnchor measures offset
 * from the anchor boundary this is actually visible in the viewport.
 * @param {number} centeringOffset The unadjusted centering offset.
 * @param {!Element} anchor The anchor element.
 * @param {!controls.PopupPosition} boxPosition Effective box position.
 * @param {goog.positioning.Corner} movableCorner The movable/box position
 *     corner.
 * @param {!Element=} opt_viewportOffsetParentElement Refer to documentation for
 *     {@code opt_viewport}.
 * @param {goog.math.Box=} opt_viewport Viewport box should be specified
 *     relative to offset parent of {@code opt_viewportOffsetParentElement}.
 *     If {@code opt_viewportOffsetParentElement} is not specified, it is
 *     assumed relative to page. {@code opt_viewport}
 *     defaults to visible portion of nearest scrollable ancestor
 *     (see {@code goog.style.getVisibleRectForElement}).
 * @return {number} The adjusted centering offset.
 * @private
 */
controls.ArrowPosition.normalizeCenteringOffset_ = function(centeringOffset, anchor,
    boxPosition, movableCorner, opt_viewportOffsetParentElement, opt_viewport) {
  var corner = goog.positioning.getEffectiveCorner(anchor, movableCorner);
  var viewportBox;
  if (opt_viewport) {
    viewportBox = opt_viewport.clone();
    if (opt_viewportOffsetParentElement) {
      // Translate the viewport coordinates relative to page.
      var parentTopLeft = goog.positioning.getOffsetParentPageOffset(
          opt_viewportOffsetParentElement);
      viewportBox.left += parentTopLeft.x;
      viewportBox.right += parentTopLeft.x;
      viewportBox.top += parentTopLeft.y;
      viewportBox.bottom += parentTopLeft.y;
    }
  } else {
    viewportBox = goog.style.getVisibleRectForElement(anchor);
    if (!viewportBox) {
      // Visible rectangle is outside the viewport, don't try to normalize.
      return centeringOffset;
    }
  }

  var anchorBox = goog.style.getBounds(anchor).toBox();

  // We only attempt to adjust the offset if the effective corner
  // being used to pivot the positioning is out of bounds.
  if (controls.ArrowPosition.isLeftOrRight_(boxPosition)) {
    if (anchorBox.top < viewportBox.top &&
        !(corner & goog.positioning.CornerBit.BOTTOM)) {
      centeringOffset -= viewportBox.top - anchorBox.top;
    } else if (anchorBox.bottom > viewportBox.bottom &&
        (corner & goog.positioning.CornerBit.BOTTOM)) {
      centeringOffset -= anchorBox.bottom - viewportBox.bottom;
    }
  } else {
    if (anchorBox.left < viewportBox.left &&
        !(corner & goog.positioning.CornerBit.RIGHT)) {
      centeringOffset -= viewportBox.left - anchorBox.left;
    } else if (anchorBox.right > viewportBox.right &&
        (corner & goog.positioning.CornerBit.RIGHT)) {
      centeringOffset -= anchorBox.right - viewportBox.right;
    }
  }

  return centeringOffset;
};


/**
 * Gets anchor point offset from anchor's top left.
 * @param {!Element} anchor The anchor element.
 * @param {!controls.PopupPosition} boxPosition The effective box position.
 * @return {!goog.math.Coordinate} Anchor offset coordinate from anchor's
 *     top left.
 * @private
 */
controls.ArrowPosition.getAnchorPointOffsetFromAnchorTopLeft_ = function(
    anchor, boxPosition) {
  var offsetX = 0;
  var offsetY = 0;
  var anchorSize = goog.style.getSize(anchor);
  switch (boxPosition) {
    case controls.PopupPosition.TOP:
      offsetX = anchorSize.width / 2;
      break;
    case controls.PopupPosition.BOTTOM:
      offsetX = anchorSize.width / 2;
      offsetY = anchorSize.height;
      break;
    case controls.PopupPosition.LEFT:
      offsetY = anchorSize.height / 2;
      break;
    case controls.PopupPosition.RIGHT:
      offsetX = anchorSize.width;
      offsetY = anchorSize.height / 2;
      break;
  }
  return new goog.math.Coordinate(offsetX, offsetY);
};


/**
 * Whether the given box position is LEFT or RIGHT.
 * @param {!controls.PopupPosition} boxPosition The effective box position.
 * @return {boolean} True if the position is left or right.
 * @private
 */
controls.ArrowPosition.isLeftOrRight_ = function(boxPosition) {
  return boxPosition == controls.PopupPosition.LEFT ||
      boxPosition == controls.PopupPosition.RIGHT;
};
