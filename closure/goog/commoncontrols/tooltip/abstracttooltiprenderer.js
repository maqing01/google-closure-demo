goog.provide('controls.AbstractTooltipRenderer');

goog.require('goog.Disposable');
goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.LivePriority');
goog.require('goog.a11y.aria.Role');
goog.require('goog.a11y.aria.State');
goog.require('goog.dom');



/**
 * Creates a callout tooltip DOM element (but doesn't append it to the
 * document).  Provides methods to easily access the internal structure.
 * This is helpful for times when the presentation of the tooltip needs to be
 * shared, but the behavioral aspects have varying implementations.
 *
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {goog.Disposable}
 */
controls.AbstractTooltipRenderer = function(opt_domHelper) {
  controls.AbstractTooltipRenderer.base(this, 'constructor');

  /** @protected {!goog.dom.DomHelper} */
  this.dom = opt_domHelper || goog.dom.getDomHelper();
};
goog.inherits(controls.AbstractTooltipRenderer, goog.Disposable);


/**
 * @return {string} Root element CSS class name.
 */
controls.AbstractTooltipRenderer.prototype.getClassName = goog.abstractMethod;


/**
 * @return {!Element} Tooltip element.
 */
controls.AbstractTooltipRenderer.prototype.getElement = goog.abstractMethod;


/**
 * @return {!Element} Tooltip content wrapper element.
 */
controls.AbstractTooltipRenderer.prototype.getContentElement = goog.abstractMethod;


/**
 * @return {!Element} Tooltip arrow element.
 */
controls.AbstractTooltipRenderer.prototype.getArrowElement = goog.abstractMethod;


/**
 * Initializes the aria role and state of the tooltip element. Must be called
 * after the DOM is rendered and {@link #getElement()} returns a valid Element.
 */
controls.AbstractTooltipRenderer.prototype.initAriaState = function() {
  //goog.a11y.aria.setRole(this.getElement(), this.getAriaRole());
  //goog.a11y.aria.setState(this.getElement(),
  //    goog.a11y.aria.State.LIVE, goog.a11y.aria.LivePriority.POLITE);
};


/**
 * Returns the ARIA role to be applied to the tooltip element.
 * See http://wiki/Main/ARIA for more info.
 * @return {goog.a11y.aria.Role} ARIA role.
 */
controls.AbstractTooltipRenderer.prototype.getAriaRole = function() {
  return goog.a11y.aria.Role.TOOLTIP;
};
