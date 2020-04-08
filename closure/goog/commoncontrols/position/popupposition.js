

/**
 * @fileoverview Popup position with respect to an anchor.

 */

goog.provide('controls.PopupPosition');


/**
 * Enumeration for different box positions (relative to the anchor
 * element). These positions respect RTL.
 * @enum {number}
 */
controls.PopupPosition = {
  LEFT: 0,
  BOTTOM: 1,
  TOP: 2,
  RIGHT: 3
};


/**
 * Bit sequence used to flip popup position to its opposite (left to right,
 * top to bottom, and vice versa).
 * @type {number}
 * @const
 * @private
 */
controls.PopupPosition.FLIP_POSITION_ = 3;


/**
 * Flips the given popup position to its opposite.
 * @param {!controls.PopupPosition} position Initial popup position.
 * @return {!controls.PopupPosition} Flipped popup position.
 */
controls.PopupPosition.flip = function(position) {
  return /** @type {controls.PopupPosition} */(
      position ^ controls.PopupPosition.FLIP_POSITION_);
};
