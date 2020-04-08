/**
 * @fileoverview Simple toolbar that can contain arbitrary HTML in three parts:
 * left, center and right. The center part can either be centered within the
 * available space left over from the left and right parts, or centered
 * absolutely in the middle of the toolbar.
 */

goog.provide('wireless.ui.Toolbar');

goog.require('goog.asserts');
goog.require('goog.i18n.bidi');
goog.require('wireless.dom');
goog.require('wireless.ui');
goog.require('wireless.ui.Button');
goog.require('wireless.ui.ButtonContainer');


/**
 * @param {!Element} element The element to be used as a toolbar.
 * @param {!wireless.ui.ButtonContainer} opt_buttons A container of buttons that
 *     make up the toolbar.
 * @constructor
 */
wireless.ui.Toolbar = function(element, opt_buttons) {
  /**
   * The element containing the toolbar content. This element should have the
   * CSS class CSS_WUI_TOOLBAR.
   * @type {!Element}
   * @private
   */
  this.element_ = wireless.ui.use(element);

  goog.asserts.assert(wireless.dom.hasClass(element,
      wireless.ui.Toolbar.MAIN_CLASS_),
      'Toolbar constructed for an element that is not a toolbar.');

  /**
   * @type {!wireless.ui.ButtonContainer|undefined}
   * @private
   */
  this.buttons_ = opt_buttons;
};


/**
 * The height of the toolbar in pixels. This value should be kept in sync with
 * the TOOLBAR_HEIGHT defined in toolbar.gss.
 * @type {number}
 */
wireless.ui.Toolbar.HEIGHT_PX = 44;


/**
 * The CSS class applied to the element containing the toolbar content.
 * @type {string}
 * @private
 */
wireless.ui.Toolbar.MAIN_CLASS_ = goog.getCssName('CSS_WUI_TOOLBAR');


/**
 * The CSS class applied to the container for the middle content.
 * @type {string}
 */
wireless.ui.Toolbar.MIDDLE_ELEMENT_CLASS = goog.getCssName('CSS_WUI_TOOLBAR_MIDDLE');


/**
 * The CSS class applied to the container for the left content.
 * @type {string}
 */
wireless.ui.Toolbar.LEFT_ELEMENT_CLASS = goog.getCssName('CSS_WUI_TOOLBAR_LEFT');


/**
 * The CSS class applied to the container for the right content.
 * @type {string}
 */
wireless.ui.Toolbar.RIGHT_ELEMENT_CLASS = goog.getCssName('CSS_WUI_TOOLBAR_RIGHT');


/**
 * The CSS class applied to the spacer div.
 * @type {string}
 */
wireless.ui.Toolbar.SPACER_DIV_CLASS = goog.getCssName('CSS_WUI_TOOLBAR_SPACER');


/**
 * Creates a new Toolbar that wraps the first toolbar found in the given
 * container. All buttons inside the toolbar will be wrapped in Button objects
 * to provide touch event support.
 * @param {!Element} container The container to search.
 * @return {!wireless.ui.Toolbar} A new Toolbar instance wrapping the first
 *     toolbar in container.
 */
wireless.ui.Toolbar.decorate = function(container) {
  return wireless.ui.Toolbar.decorateAll(container)[0];
};


/**
 * @param {!Element} container The container to search.
 * @return {!Array.<!wireless.ui.Toolbar>} All of the toolbars found in the
 *     container, in the order in which they occur in the DOM.
 */
wireless.ui.Toolbar.decorateAll = function(container) {
  var toolbarDivs = wireless.dom.getElementsByClassName(
      wireless.ui.Toolbar.MAIN_CLASS_, container);
  var toolbars = [];
  for (var i = 0, toolbarDiv; toolbarDiv = toolbarDivs[i]; ++i) {
    var buttons = new wireless.ui.ButtonContainer(
        wireless.ui.Button.decorateAll(toolbarDiv));
    toolbars.push(new wireless.ui.Toolbar(toolbarDiv, buttons));
  }
  return toolbars;
};


/**
 * The div that is inserted to center the middle content.
 * @type {!Element|undefined}
 * @private
 */
wireless.ui.Toolbar.prototype.spacerDiv_;


/** @return {!Element} The element containing the toolbar content. */
wireless.ui.Toolbar.prototype.getMainElement = function() {
  return this.element_;
};


/** @return {!Element} The container for the middle content. */
wireless.ui.Toolbar.prototype.getMiddleElement = function() {
  var middleElement = wireless.dom.getFirstElementByClassName(
      wireless.ui.Toolbar.MIDDLE_ELEMENT_CLASS, this.element_);
  goog.asserts.assert(middleElement, 'Middle element not found.');
  return middleElement;
};


/** @return {!Element} The container for the left content. */
wireless.ui.Toolbar.prototype.getLeftElement = function() {
  var leftElement = wireless.dom.getFirstElementByClassName(
      wireless.ui.Toolbar.LEFT_ELEMENT_CLASS, this.element_);
  goog.asserts.assert(leftElement, 'Left element not found.');
  return leftElement;
};


/** @return {!Element} The container for the right content. */
wireless.ui.Toolbar.prototype.getRightElement = function() {
  var rightElement = wireless.dom.getFirstElementByClassName(
      wireless.ui.Toolbar.RIGHT_ELEMENT_CLASS, this.element_);
  goog.asserts.assert(rightElement, 'Right element not found.');
  return rightElement;
};


//  Refactor the getButton() methods into a ButtonContainer
// utility class.

/**
 * Returns a container of buttons associated with the toolbar, as provided at
 * construction time. If the opt_buttons constructor parameter was not
 * specified, this function will return undefined, even if the toolbar contains
 * markup for buttons.
 * @return {!wireless.ui.ButtonContainer|undefined} The button container, or
 *     undefined if no container was provided when the toolbar was constructed.
 */
wireless.ui.Toolbar.prototype.getButtons = function() {
  return this.buttons_;
};

/**
 * Sets whether the toolbar is visible or not.
 * @param {boolean} display True to show the toolbar, false to hide.
 */
wireless.ui.Toolbar.prototype.setDisplay = function(display) {
  goog.style.setElementShown(this.element_, display);
};

/**
 * Adjusts the toolbar's spacer div so that its middle content is centered
 * within the toolbar. If this function is not called, the middle content will
 * instead be centered in the space left over by the left and right parts. If
 * this function is used, it should be called every time the toolbar's contents
 * change.
 * @param {boolean=} opt_dontAutoCenter True if toolbar should not automatically
 *     center middle content to account for larger left or right side.
 */
wireless.ui.Toolbar.prototype.resize = function(opt_dontAutoCenter) {
  var middleElement = this.getMiddleElement();
  var leftElement = this.getLeftElement();
  var rightElement = this.getRightElement();
  var rootWidth = this.element_.offsetWidth;

  // Subtract the spacer's width from the middle content's width to get the
  // actual width of the middle content. If we don't do this, a second call to
  // resize will result in an incorrect delta.
  var spacerWidth = this.spacerDiv_ ? this.spacerDiv_.offsetWidth : 0;
  var middleWidth = middleElement.offsetWidth - spacerWidth;
  var leftWidth = leftElement.offsetWidth;
  var rightWidth = rightElement.offsetWidth;
  var leftBigger = leftWidth > rightWidth;

  // If the middle element is an empty div, the default width causes the middle
  // element to expand to the width of the root element.  If the middle
  // element's width was actually set to the rootWidth, this does not affect
  // calculations as in that case leftWidth == rightWidth == 0 and the delta
  // calculation below still produces the desired result.
  if (middleWidth == rootWidth) {
    middleWidth = 0;
  }

  // In iOS 5 having an element where the left position is greater than the
  // right position (the element is inverted) causes a rendering issue.
  goog.style.setElementShown(middleElement, leftWidth + rightWidth < rootWidth);

  middleElement.style[goog.i18n.bidi.I18N_LEFT] = leftWidth + 'px';
  middleElement.style[goog.i18n.bidi.I18N_RIGHT] = rightWidth + 'px';

  // Adding the spacer must not change the width of the toolbar.
  var delta = Math.min(
      Math.abs(leftWidth - rightWidth),
      Math.abs(rootWidth - middleWidth - leftWidth - rightWidth));
  // If spacer is not required and it hasn't been added yet, then dont add it to
  // the toolbar. If the delta is zero but the spacer already exists, then we
  // need to proceed because the toolbar could just have been updated.
  // If adding the spacer means we exceed the rootWidth, do not add the spacer.
  if (opt_dontAutoCenter || (!delta && !this.spacerDiv_)) {
    return;
  }

  if (!this.spacerDiv_) {
    this.spacerDiv_ = document.createElement('div');
    this.spacerDiv_.className = wireless.ui.Toolbar.SPACER_DIV_CLASS;
  }

  this.spacerDiv_.style.width = delta + 'px';

  if (leftBigger) {
    middleElement.appendChild(this.spacerDiv_);
  } else if (middleElement.firstChild) {
    wireless.dom.insertSiblingBefore(this.spacerDiv_, middleElement.firstChild);
  }
};
