

/**
 * @fileoverview Renders a tooltip with a 'callout arrow' pointing to the
 * element that the tooltip is anchored to.
 *


 * @see tooltip_demo.html
 */

goog.provide('controls.CalloutTooltip');
goog.provide('controls.CalloutTooltip.Placement');

goog.require('goog.dom');
goog.require('controls.AbstractTooltip');
goog.require('controls.PopupPosition');
goog.require('controls.TooltipRenderer');



/**
 * Callout tool tip, that positions itself relative to another element.
 * @param {Element|string=} opt_el Element to display tooltip for, either
 *     element reference or string id.
 * @param {?string=} opt_str Text message to display in tooltip.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {controls.PopupPosition|controls.CalloutTooltip.Placement=} opt_placement
 *     The preferred placement of the tooltip.
 * @constructor
 * @extends {controls.AbstractTooltip}
 */
controls.CalloutTooltip = function(opt_el, opt_str, opt_domHelper, opt_placement) {
  var dom = opt_domHelper || (opt_el ?
      goog.dom.getDomHelper(goog.dom.getElement(opt_el)) :
      goog.dom.getDomHelper());
  var renderer = new controls.TooltipRenderer(dom);

  controls.CalloutTooltip.base(this, 'constructor', renderer, opt_el, opt_str, dom,
      /** @type {controls.PopupPosition} */ (opt_placement));
};
goog.inherits(controls.CalloutTooltip, controls.AbstractTooltip);


/**
 * Enum indicating the preferred placement of the tooltip.
 *
 * @enum {number}
 * @deprecated Use controls.PopupPosition instead.
 */
controls.CalloutTooltip.Placement = {
  TOP: controls.PopupPosition.TOP,
  BOTTOM: controls.PopupPosition.BOTTOM
};


/**
 * Sets the position of the tooltip. By default, the tooltip is at
 * the bottom of the anchor with the arrow point centered.
 *
 *  Adds auto-positioning when the tooltip goes out of
 * the viewport.
 *
 * @param {controls.CalloutTooltip.Placement|controls.PopupPosition=} opt_position
 *     Position of the tooltip relative to the anchor
 *     (e.g. left means the bubble will be at the left of the anchor).
 * @param {controls.ArrowAlignment=} opt_alignment Arrow Alignment
 *     on the side of the tooltip.
 * @param {number=} opt_arrowOffset Optional offset (in px) for the arrow.
 *     Ignored if Alignment is CENTER.
 * @param {number=} opt_offsetFromAnchor Optional offset (in px) for the
 *     movable box with respect to the anchor. Positive value brings the box
 *     closer to the center of the anchor.
 * @override
 */
controls.CalloutTooltip.prototype.setPlacement = function(opt_position,
    opt_alignment, opt_arrowOffset, opt_offsetFromAnchor) {
  // This override exists only for allowing controls.CalloutTooltip.Placement as
  // an alternative type for opt_position. It should be removed together with
  // controls.CalloutTooltip.Placement.
  controls.CalloutTooltip.base(this, 'setPlacement',
      /** @type {controls.PopupPosition} */ (opt_position), opt_alignment,
      opt_arrowOffset, opt_offsetFromAnchor);
};
