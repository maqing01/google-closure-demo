

/**
 * @fileoverview Star component implementation. The star component is
 * a simple extension over {@code goog.ui.ToggleButton}.
 *
 * WARNING(chrishenry): This is still in experimental stage.
 *

 */

goog.provide('controls.Star');
goog.provide('controls.StarRenderer');

goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.Role');
goog.require('goog.a11y.aria.State');
goog.require('goog.asserts');
goog.require('goog.soy');
goog.require('goog.ui.ButtonRenderer');
goog.require('goog.ui.Component');
goog.require('goog.ui.ToggleButton');
goog.require('controls.templates.star.main');



/**
 * Creates a new star component.
 *
 * @param {goog.ui.ButtonRenderer=} opt_renderer Optional renderer to be
 *     used to render this component; defaults to {@code controls.StarRenderer}.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DomHelper.
 * @constructor
 * @extends {goog.ui.ToggleButton}
 */
controls.Star = function(opt_renderer, opt_domHelper) {
  controls.Star.base(this, 'constructor', '',
      opt_renderer || controls.StarRenderer.getInstance(), opt_domHelper);
};
goog.inherits(controls.Star, goog.ui.ToggleButton);



/**
 * Star renderers. Requires {@code //javascript/controls/gss/star.gss}.
 * @constructor
 * @extends {goog.ui.ButtonRenderer}
 */
controls.StarRenderer = function() {
  controls.StarRenderer.base(this, 'constructor');
};
goog.inherits(controls.StarRenderer, goog.ui.ButtonRenderer);
goog.addSingletonGetter(controls.StarRenderer);


/** @override */
controls.StarRenderer.prototype.getCssClass = function() {
  return goog.getCssName('controls-star');
};


/** @override */
controls.StarRenderer.prototype.createDom = function(star) {
  return goog.soy.renderAsElement(
      controls.templates.star.main, {checked: star.isChecked()}, undefined,
      star.getDomHelper());
};


/** @override */
controls.StarRenderer.prototype.getAriaRole = function() {
  return goog.a11y.aria.Role.CHECKBOX;
};


/** @override */
controls.StarRenderer.prototype.updateAriaState = function(element, state,
    enable) {
  if (state == goog.ui.Component.State.CHECKED) {
    goog.asserts.assert(element, 'The button DOM element cannot be null.');
    goog.a11y.aria.setState(element, goog.a11y.aria.State.CHECKED, enable);
  } else {
    controls.StarRenderer.base(this, 'updateAriaState', element, state, enable);
  }
};
