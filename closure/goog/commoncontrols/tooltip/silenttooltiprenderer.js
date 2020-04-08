/**
 * @fileoverview A tooltip renderer that prevents making the tooltip element an
 * ARIA live region.

 */

goog.provide('controls.SilentTooltipRenderer');

goog.require('goog.a11y.aria');
goog.require('controls.TooltipRenderer');



/**
 * A tooltip renderer for tooltips where the content text matches the ARIA label
 * of the anchor element.  In this case, the tooltip doesn't need to be a live
 * region because the ARIA label will announce on the anchor element.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {controls.TooltipRenderer}
 */
controls.SilentTooltipRenderer = function(opt_domHelper) {
  controls.SilentTooltipRenderer.base(this, 'constructor', opt_domHelper);
};
goog.inherits(controls.SilentTooltipRenderer, controls.TooltipRenderer);


/**
 * Initializes the aria role of the tooltip element, but doesn't set the
 * element's state to LIVE.
 * @override
 */
controls.SilentTooltipRenderer.prototype.initAriaState = function() {
  //goog.a11y.aria.setRole(this.getElement(), this.getAriaRole());
};
