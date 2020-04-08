

/**
 * @fileoverview Renders a tooltip with a 'callout arrow' and provides methods
 * to access its internal structure.
 *

 */

goog.provide('controls.TooltipRenderer');

goog.require('goog.dom');
goog.require('controls.AbstractTooltipRenderer');



/**
 * Creates a callout tooltip DOM element (but doesn't append it to the
 * document).  Provides methods to easily access the internal structure.
 * This is helpful for times when the presentation of the tooltip needs to be
 * shared, but the behavioral aspects have varying implementations.
 *
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {controls.AbstractTooltipRenderer}
 */
controls.TooltipRenderer = function(opt_domHelper) {
  controls.TooltipRenderer.base(this, 'constructor', opt_domHelper);

  /**
   * @type {!Element}
   * @private
   */
  this.contentEl_ = this.dom.createDom(
      'div', goog.getCssName(this.getClassName(), 'contentId'));

  /**
   * @type {!Element}
   * @private
   */
  this.arrowEl_ =
      this.dom.createDom('div', goog.getCssName(this.getClassName(), 'arrow'),
          this.dom.createDom('div',
              goog.getCssName(this.getClassName(), 'arrowimplbefore')),
          this.dom.createDom('div',
              goog.getCssName(this.getClassName(), 'arrowimplafter')));

  /**
   * @type {!Element}
   * @private
   */
  this.tooltipEl_ = this.dom.createDom('div',
      {'class': this.getClassName(), 'role': 'tooltip'},
      this.contentEl_,
      this.arrowEl_);

  this.initAriaState();
};
goog.inherits(controls.TooltipRenderer, controls.AbstractTooltipRenderer);


/** @override */
controls.TooltipRenderer.prototype.getClassName = function() {
  return goog.getCssName('controls-tooltip');
};


/** @override */
controls.TooltipRenderer.prototype.getElement = function() {
  return this.tooltipEl_;
};


/** @override */
controls.TooltipRenderer.prototype.getContentElement = function() {
  return this.contentEl_;
};


/** @override */
controls.TooltipRenderer.prototype.getArrowElement = function() {
  return this.arrowEl_;
};


/** @override */
controls.TooltipRenderer.prototype.disposeInternal = function() {
  if (this.tooltipEl_) {
    goog.dom.removeNode(this.tooltipEl_);
  }
};
