goog.provide('controls.ColorModel');

goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.ui.Component');



/**
 * Class that coordinates events and state updates from various color picker
 * controls.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
controls.ColorModel = function() {
  controls.ColorModel.base(this, 'constructor');

  /**
   * Handler for listening to widget events.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.handler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.handler_);

  /**
   * List of color picker controls to update when state changes.
   * @type {!Array.<!goog.ui.Component>}
   * @private
   */
  this.controls_ = [];
};
goog.inherits(controls.ColorModel, goog.events.EventTarget);


/**
 * @type {?string}
 * @private
 */
controls.ColorModel.prototype.value_ = null;


/**
 * Adds a 'view' component to this model. The view is any widget that
 * has setSelectedColor() and getSelectedColor() methods.
 * The model will listen for action events on the view component,
 * and will update the view component when the selected color changes.
 * @param {!goog.ui.Component} component The view component.
 */
controls.ColorModel.prototype.addViewComponent = function(component) {
  this.controls_.push(component);
  this.handler_.listen(
      component, goog.ui.Component.EventType.ACTION, this.onAction_);
};


/**
 * Handle action events from the various view components.
 * @param {!goog.events.Event} e The optional event.
 * @private
 */
controls.ColorModel.prototype.onAction_ = function(e) {
  if (e.target) {
    if (goog.isFunction(e.target.getSelectedColor)) {
      // User clicked something that looks like a color palette.
      this.setSelectedColor(e.target.getSelectedColor());
    }
    this.dispatchEvent(goog.ui.Component.EventType.ACTION);
  }
};


/**
 * Returns the currently selected color (null if none).
 * @return {?string} The selected color.
 */
controls.ColorModel.prototype.getValue = function() {
  return this.value_;
};


/**
 * Sets the selected color, or clears the selected color if the argument is
 * null or not any of the available color choices.
 * @param {?string} color New color.
 */
controls.ColorModel.prototype.setSelectedColor = function(color) {
  this.value_ = color;
  for (var i = 0, item; item = this.controls_[i]; i++) {
    if (typeof item.setSelectedColor == 'function') {
      // This menu item looks like a color palette.
      item.setSelectedColor(color);
    }
  }
};
