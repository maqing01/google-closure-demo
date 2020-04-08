goog.provide('controls.PromoBubble');

goog.require('controls.Bubble');



/**
 * Promotional bubble. This bubble is automatically displayed on
 * render and automatically dispose itself when it is dismissed. Users
 * of this bubble should simply need to set its content and call
 * render().
 * @param {Element} anchor The anchor element for the promotional bubble.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DomHelper.
 * @extends {controls.Bubble}
 * @constructor
 */
controls.PromoBubble = function(anchor, opt_domHelper) {
  controls.PromoBubble.base(this, 'constructor', opt_domHelper);
  this.setAnchorElement(anchor);
  this.setDisposeOnHide(true);
  this.addClassName(controls.PromoBubble.EXTRA_CSS_CLASS_);
};
goog.inherits(controls.PromoBubble, controls.Bubble);


/**
 * @type {string}
 * @const
 * @private
 */
controls.PromoBubble.EXTRA_CSS_CLASS_ = goog.getCssName('controls-bubble-promo');


/** @override */
controls.PromoBubble.prototype.enterDocument = function() {
  controls.PromoBubble.base(this, 'enterDocument');
  this.setVisible(true);
};
