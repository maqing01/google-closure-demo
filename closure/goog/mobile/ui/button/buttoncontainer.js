/**
 * @fileoverview Container of Button objects that provides different ways to
 * filter its collection.
 */

goog.provide('wireless.ui.ButtonContainer');

goog.require('wireless.dom');



/**
 * Creates a new button container holding the given buttons.
 * @param {!Array.<!wireless.ui.Button>} buttons The buttons to put in the
 *     container.
 * @constructor
 */
wireless.ui.ButtonContainer = function(buttons) {
  this.buttons_ = buttons;
};


/**
 * The buttons in the container.
 * @type {!Array.<!wireless.ui.Button>}
 * @private
 */
wireless.ui.ButtonContainer.prototype.buttons_;


/**
 * Returns the first button with the given control type.
 * @param {string} controlType The control type to search for.
 * @return {!wireless.ui.Button|undefined} The first button with the given
 *     control type, or undefined if no button matches.
 */
wireless.ui.ButtonContainer.prototype.getFirstByControlType =
    function(controlType) {
  return this.getAllByControlType(controlType)[0];
};


/**
 * Returns all buttons with the given control type.
 * @param {string} controlType The control type to filter by.
 * @return {!Array.<!wireless.ui.Button>} An array (possibly empty) of buttons
 *     that match the control type.
 */
wireless.ui.ButtonContainer.prototype.getAllByControlType =
    function(controlType) {
  var result = [];
  for (var i = 0, button; button = this.buttons_[i]; ++i) {
    if (button.getControlType() == controlType) {
      result.push(button);
    }
  }
  return result;
};


/**
 * Returns all buttons in the container.
 * @return {!Array.<!wireless.ui.Button>} The buttons.
 */
wireless.ui.ButtonContainer.prototype.getAll = function() {
  return this.buttons_;
};
