goog.provide('controls.BubbleTooltip');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.soy');
goog.require('controls.AbstractTooltip');
goog.require('controls.AbstractTooltipRenderer');
goog.require('controls.PopupPosition');
goog.require('controls.templates.bubble.main');



/**
 * A tooltip rendered with controls.Bubble-like styles.
 *
 * @param {Element|string=} opt_el Element to display tooltip for, either
 *     element reference or string id.
 * @param {string=} opt_str Text message to display in tooltip.
 * @param {!goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {controls.AbstractTooltip}
 */
controls.BubbleTooltip = function(opt_el, opt_str, opt_domHelper) {
  var dom = opt_domHelper || (opt_el ?
      goog.dom.getDomHelper(goog.dom.getElement(opt_el)) :
      goog.dom.getDomHelper());
  var renderer = new controls.BubbleTooltip.Renderer_(dom);

  controls.BubbleTooltip.base(this, 'constructor', renderer, opt_el, opt_str, dom);

  this.setPlacement(controls.PopupPosition.BOTTOM, undefined, undefined,
      controls.BubbleTooltip.DEFAULT_OFFSET_FROM_ANCHOR_PX_);
  this.setHideDelayMs(controls.BubbleTooltip.HIDE_DELAY_MS_);
};
goog.inherits(controls.BubbleTooltip, controls.AbstractTooltip);


/**
 * Delay in ms before the tooltip is hidden.
 * @private {number}
 */
controls.BubbleTooltip.HIDE_DELAY_MS_ = 300;


/**
 * The default offset of the tooltip from anchor for the bubble tooltip.
 * See {@code setPlacement}.
 * @private {number}
 */
controls.BubbleTooltip.DEFAULT_OFFSET_FROM_ANCHOR_PX_ = -5;



/**
 * A tooltip renderer that renders a controls.Bubble-like DOM.
 * @param {!goog.dom.DomHelper} domHelper
 * @constructor
 * @extends {controls.AbstractTooltipRenderer}
 * @private
 */
controls.BubbleTooltip.Renderer_ = function(domHelper) {
  controls.BubbleTooltip.Renderer_.base(this, 'constructor', domHelper);

  /** @private {!Element} */
  this.tooltipEl_ = goog.soy.renderAsElement(
      controls.templates.bubble.main, {
        showCloseBox: false
      }, undefined /* opt_injectedData */, this.dom);

  /** @private {!Element} */
  this.contentEl_ = goog.asserts.assertElement(goog.dom.getElementByClass(
      goog.getCssName(this.getClassName(), 'content-id'), this.tooltipEl_));

  /** @private {!Element} */
  this.arrowEl_ = goog.asserts.assertElement(goog.dom.getElementByClass(
      goog.getCssName(this.getClassName(), 'arrow-id'), this.tooltipEl_));

  this.initAriaState();
};
goog.inherits(controls.BubbleTooltip.Renderer_, controls.AbstractTooltipRenderer);


/** @override */
controls.BubbleTooltip.Renderer_.prototype.getClassName = function() {
  return goog.getCssName('controls-bubble');
};


/** @override */
controls.BubbleTooltip.Renderer_.prototype.getElement = function() {
  return this.tooltipEl_;
};


/** @override */
controls.BubbleTooltip.Renderer_.prototype.getContentElement = function() {
  return this.contentEl_;
};


/** @override */
controls.BubbleTooltip.Renderer_.prototype.getArrowElement = function() {
  return this.arrowEl_;
};


/** @override */
controls.BubbleTooltip.Renderer_.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.tooltipEl_);
  controls.BubbleTooltip.Renderer_.base(this, 'disposeInternal');
};
