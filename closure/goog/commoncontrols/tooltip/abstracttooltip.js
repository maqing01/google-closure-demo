
goog.provide('controls.AbstractTooltip');

goog.require('goog.dom');
goog.require('goog.dom.safe');
goog.require('goog.fx.css3');
goog.require('goog.style');
goog.require('goog.ui.Tooltip');
goog.require('controls.ArrowPosition');
goog.require('controls.PopupPosition');



/**
 * An abstract tooltip, that positions itself relative to another element.
 * @param {!controls.AbstractTooltipRenderer} renderer The renderer of the tooltip's
 *     DOM.
 * @param {Element|string=} opt_el Element to display tooltip for, either
 *     element reference or string id.
 * @param {?string=} opt_str Text message to display in tooltip.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {controls.PopupPosition=} opt_placement The preferred placement
 *     of the tooltip.
 * @constructor
 * @extends {goog.ui.Tooltip}
 */
controls.AbstractTooltip =
    function(renderer, opt_el, opt_str, opt_domHelper, opt_placement) {
  var dom = opt_domHelper || (opt_el ?
      goog.dom.getDomHelper(goog.dom.getElement(opt_el)) :
      goog.dom.getDomHelper());

  /**
   * The renderer of this tooltip's DOM.
   * @private {!controls.AbstractTooltipRenderer}
   */
  this.renderer_ = renderer;

  goog.dom.appendChild(dom.getDocument().body, this.renderer_.getElement());
  goog.style.setElementShown(this.renderer_.getElement(), false);

  this.className = this.renderer_.getClassName();

  controls.AbstractTooltip.base(this, 'constructor', opt_el, opt_str, dom);

  this.registerDisposable(this.renderer_);
  this.setElement(this.renderer_.getElement());

  var showTransition = goog.fx.css3.fadeIn(this.renderer_.getElement(),
      controls.AbstractTooltip.FADE_IN_SECONDS_);

  var hideTransition = goog.fx.css3.fadeOut(this.renderer_.getElement(),
      controls.AbstractTooltip.FADE_OUT_SECONDS_);

  this.setTransition(showTransition, hideTransition);

  /**
   * Arrow positioning strategy.
   * NOTE(klevy): Disabling subpixels is a patch for
   * http://code.google.com/p/chromium/issues/detail?id=29937 (subpixels cause
   * janky rendering with opacity transitions).
   * @type {!controls.ArrowPosition}
   * @private
   */
  this.arrowPositionStrategy_ = new controls.ArrowPosition(
      this.renderer_.getClassName(), true /* opt_disableSubpixels*/);
  this.arrowPositionStrategy_.setPosition(
      opt_placement || controls.PopupPosition.BOTTOM, undefined, undefined, -1);
  this.arrowPositionStrategy_.setElements(
      this.renderer_.getElement(), this.renderer_.getArrowElement());
  this.arrowPositionStrategy_.setAutoReposition(true);

  this.setShowDelayMs(controls.AbstractTooltip.SHOW_DELAY_MS_);
};
goog.inherits(controls.AbstractTooltip, goog.ui.Tooltip);


/**
 * Delay in ms before a tooltip is shown.
 * @type {number}
 * @private
 */
controls.AbstractTooltip.SHOW_DELAY_MS_ = 300;


/**
 * Transition time for fading a tooltip out.
 * @type {number}
 * @private
 */
controls.AbstractTooltip.FADE_IN_SECONDS_ = .13;


/**
 * Transition time for fading a tooltip out.
 * @type {number}
 * @private
 */
controls.AbstractTooltip.FADE_OUT_SECONDS_ = .13;


/**
 * Sets the position of the tooltip. By default, the tooltip is at
 * the bottom of the anchor with the arrow point centered.
 *
 *  Adds auto-positioning when the tooltip goes out of
 * the viewport.
 *
 * @param {controls.PopupPosition=} opt_position
 *     Position of the tooltip relative to the anchor
 *     (e.g. left means the bubble will be at the left of the anchor).
 * @param {controls.ArrowAlignment=} opt_alignment Arrow Alignment
 *     on the side of the tooltip.
 * @param {number=} opt_arrowOffset Optional offset (in px) for the arrow.
 *     Ignored if Alignment is CENTER.
 * @param {number=} opt_offsetFromAnchor Optional offset (in px) for the
 *     movable box with respect to the anchor. Positive value brings the box
 *     closer to the center of the anchor.
 */
controls.AbstractTooltip.prototype.setPlacement = function(opt_position,
    opt_alignment, opt_arrowOffset, opt_offsetFromAnchor) {
  this.arrowPositionStrategy_.setPosition(opt_position, opt_alignment,
      opt_arrowOffset, opt_offsetFromAnchor);
};


/** @override */
controls.AbstractTooltip.prototype.getPositioningStrategy =
    function(activationType) {
  this.arrowPositionStrategy_.setAnchorElement(this.getActiveElement());
  return this.arrowPositionStrategy_;
};


/**
 * @return {!Element} The content element.
 */
controls.AbstractTooltip.prototype.getContentElement = function() {
  return this.renderer_.getContentElement();
};


/** @override */
controls.AbstractTooltip.prototype.setText = function(str) {
  goog.dom.setTextContent(this.getContentElement(), str);
};


/** @override */
controls.AbstractTooltip.prototype.setSafeHtml = function(html) {
  goog.dom.safe.setInnerHtml(this.getContentElement(), html);
};


/** @override */
controls.AbstractTooltip.prototype.getText = function() {
  return goog.dom.getTextContent(this.getContentElement());
};


/** @override */
controls.AbstractTooltip.prototype.getHtml = function() {
  return this.getContentElement().innerHTML;
};
