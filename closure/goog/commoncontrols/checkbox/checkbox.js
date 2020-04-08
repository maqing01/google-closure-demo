

/**
 * @fileoverview Checkbox implemented in the Kennedy style.  Extends the Closure
 * checkbox by adding a different root css name.

 */

goog.provide('controls.Checkbox');

goog.require('goog.dom.classlist');
goog.require('goog.soy');
goog.require('goog.ui.Checkbox');
goog.require('goog.ui.CheckboxRenderer');
goog.require('goog.ui.Component');
goog.require('goog.ui.ControlRenderer');
goog.require('controls.templates.checkbox.main');



/**
 * @param {goog.ui.Checkbox.State=} opt_checked Initial checked state.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM hepler, used for
 *     document interaction.
 * @constructor
 * @extends {goog.ui.Checkbox}
 */
controls.Checkbox = function(opt_checked, opt_domHelper) {
  var renderer = /** @type {goog.ui.CheckboxRenderer} */ (
      goog.ui.ControlRenderer.getCustomRenderer(
          goog.ui.CheckboxRenderer, controls.Checkbox.CSS_NAME));
  controls.Checkbox.base(this, 'constructor', opt_checked, opt_domHelper, renderer);
  this.setSupportedState(goog.ui.Component.State.ACTIVE, true);
};
goog.inherits(controls.Checkbox, goog.ui.Checkbox);


/**
 * Css class name.
 * @type {string}
 * @const
 */
controls.Checkbox.CSS_NAME = goog.getCssName('controls-checkbox');


/** @override */
controls.Checkbox.prototype.createDom = function() {
  this.setElementInternal(
      goog.soy.renderAsElement(controls.templates.checkbox.main, {
        checked: this.isChecked(),
        disabled: !this.isEnabled(),
        undetermined: this.isUndetermined()
      }, undefined, this.getDomHelper()));
};


//  Check for usages of decoration for controls.Checkbox and ensure
// they are using checkbox.soy or equivalent DOM.
/**
 * Decorates the checkbox. This relies on the DOM structure
 * defined in checkbox.soy.
 * @param {Element} element Element to decorate.
 * @protected
 * @override
 */
controls.Checkbox.prototype.decorateInternal = function(element) {
  controls.Checkbox.base(this, 'decorateInternal', element);
  goog.dom.classlist.add(element, goog.getCssName('goog-inline-block'));
  this.getElement().dir = 'ltr';
  if (!this.getElementByClass(
      goog.getCssName(controls.Checkbox.CSS_NAME, 'checkmark'))) {
    this.createCheckmarkDiv_();
  }
};


/**
 * Creates the div which holds the checkmark image and can be offset for proper
 * display.  Attaches it to the element.
 * @private
 */
controls.Checkbox.prototype.createCheckmarkDiv_ = function() {
  var checkmarkElement = this.getDomHelper().createDom('div',
      goog.getCssName(controls.Checkbox.CSS_NAME, 'checkmark'));
  this.getElement().appendChild(checkmarkElement);
};


//  The following 3 methods are taken almost verbatim
// from controls.Button. We should figure out a way to extract this logic
// (maybe to goog.ui.Control).
/** @override */
controls.Checkbox.prototype.setFocused = function(focused) {
  controls.Checkbox.base(this, 'setFocused', focused);

  // Style should be cleared whenever focus is changed.  Mouse event
  // should change it back.
  this.setNoFocusOutline_(false);
};


/**
 * Clears the outline style on mouse down, on top of the standard mouse down
 * handling of the superclass.  This will cause the button to have outline style
 * when tabbed to, but not when clicked with the mouse.  Focus event is fired
 * before mousedown.
 * @param {goog.events.Event} e Mouse event to handle.
 * @override
 */
controls.Checkbox.prototype.handleMouseDown = function(e) {
  controls.Checkbox.base(this, 'handleMouseDown', e);
  if (this.isEnabled()) {
    this.setNoFocusOutline_(true);
  }
};


/**
 * Set class to clear the focus outline.
 * @param {boolean} enable Whether to enable the class.
 * @private
 */
controls.Checkbox.prototype.setNoFocusOutline_ = function(enable) {
  if (this.getElement()) {
    goog.dom.classlist.enable(
        this.getElement(),
        goog.getCssName(controls.Checkbox.CSS_NAME, 'clearOutline'),
        enable);
  }
};
