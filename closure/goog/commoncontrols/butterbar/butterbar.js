goog.provide('controls.ButterBar');
goog.provide('controls.ButterBar.Type');

goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.LivePriority');
goog.require('goog.a11y.aria.State');
goog.require('goog.asserts');
goog.require('goog.dom.classlist');
goog.require('goog.object');
goog.require('goog.ui.Component');
/** @suppress {extraRequire} Used in type and param annotations. */
goog.require('goog.ui.ControlContent');

/**
 * A general purpose butter bar implementation that handles basic rendering and
 * transitions.
 *
 * @param {goog.ui.ControlContent} content Text or existing DOM structure to
 *     display as this butter bar's content.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @constructor
 * @extends {goog.ui.Component}
 */
controls.ButterBar = function(content, opt_domHelper) {
  controls.ButterBar.base(this, 'constructor', opt_domHelper);

  /**
   * @type {goog.ui.ControlContent}
   * @private
   */
  this.content_ = content;
};
goog.inherits(controls.ButterBar, goog.ui.Component);


/**
 * Constants for butter bar type.
 * @enum {string}
 */
controls.ButterBar.Type = {
  INFO: goog.events.getUniqueId('info'),
  ERROR: goog.events.getUniqueId('error'),
  PROMO: goog.events.getUniqueId('promo'),
  WARNING: goog.events.getUniqueId('warning')
};


/**
 * The type of this butter bar.
 * @type {controls.ButterBar.Type}
 * @private
 */
controls.ButterBar.prototype.type_ = controls.ButterBar.Type.INFO;


/**
 * Whether the butter bar is in mini-mode.
 * @type {boolean}
 * @private
 */
controls.ButterBar.prototype.mini_ = false;


/**
 * CSS class name for the butter bar element, also used as a class name prefix
 * for related elements.
 * @type {string}
 * @const
 * @private
 */
controls.ButterBar.CSS_NAME_ = goog.getCssName('controls-butterBar');


/**
 * CSS class name for the butter bar element when visible.
 * @type {string}
 * @const
 * @private
 */
controls.ButterBar.SHOWN_CSS_NAME_ = goog.getCssName(controls.ButterBar.CSS_NAME_,
    'shown');


/**
 * CSS class name for the butter bar element when in mini-mode.
 * @type {string}
 * @const
 * @private
 */
controls.ButterBar.MINI_CSS_NAME_ = goog.getCssName(controls.ButterBar.CSS_NAME_,
    'mini');


/**
 * Map of CSS class names for each butter bar type.
 * @type {Object}
 * @private
 */
controls.ButterBar.TYPE_CSS_NAMES_ = goog.object.create(
    controls.ButterBar.Type.INFO, goog.getCssName(controls.ButterBar.CSS_NAME_, 'info'),
    controls.ButterBar.Type.ERROR, goog.getCssName(controls.ButterBar.CSS_NAME_, 'error'),
    controls.ButterBar.Type.WARNING, goog.getCssName(controls.ButterBar.CSS_NAME_,
        'warning'),
    controls.ButterBar.Type.PROMO, goog.getCssName(controls.ButterBar.CSS_NAME_,
        'promo'));


//==============================================================================
// Getters & Setters.
//==============================================================================


/**
 * Returns the color of the butter bar.
 * @return {controls.ButterBar.Type} The type of the butter bar.
 */
controls.ButterBar.prototype.getType = function() {
  return this.type_;
};


/**
 * Sets the color of the butter bar.
 * @param {controls.ButterBar.Type} type The type to set.
 */
controls.ButterBar.prototype.setType = function(type) {
  var element = this.getContentElement();
  if (element) {
    // Remove current type class and add new one.
    goog.dom.classlist.addRemove(this.getElement(),
        controls.ButterBar.TYPE_CSS_NAMES_[this.type_],
        controls.ButterBar.TYPE_CSS_NAMES_[type]);
  }
  this.type_ = type;
};


/**
 * Sets the content of the butter bar. Alternatively, if the element has
 * already been rendered, you can set the content of
 * {@code getContentElement()} directly.
 *
 * @param {goog.ui.ControlContent} content The content to set.
 */
controls.ButterBar.prototype.setContent = function(content) {
  this.content_ = content;

  var element = this.getElement();
  if (element) {
    var domHelper = this.getDomHelper();
    domHelper.removeChildren(element);
    domHelper.append(element, this.content_);
  }
};


/**
 * Returns true if the component's visibility is set to visible, false if
 * it is set to hidden.
 * @return {boolean} Whether the butter bar is visible.
 */
controls.ButterBar.prototype.isVisible = function() {
  var element = this.getElement();
  return element != null && goog.dom.classlist.contains(element,
      controls.ButterBar.SHOWN_CSS_NAME_);
};


/**
 * Sets the butter bar visibility.
 * @param {boolean} visible Whether the bubble should be visible or not.
 */
controls.ButterBar.prototype.setVisible = function(visible) {
  goog.asserts.assert(this.isInDocument(),
      'setVisible must only be called after the butter bar is rendered.');
  goog.dom.classlist.enable(this.getElement(),
      controls.ButterBar.SHOWN_CSS_NAME_, visible);
};


/**
 * Sets whether the butter bar is in mini-mode.
 * @param {boolean} mini Whether the butter bar should be mini or not.
 */
controls.ButterBar.prototype.setMini = function(mini) {
  this.mini_ = mini;
  var element = this.getElement();
  if (element) {
    goog.dom.classlist.enable(element, controls.ButterBar.MINI_CSS_NAME_,
        this.mini_);
  }
};


//==============================================================================
//DOM & Rendering.
//==============================================================================


/** @override */
controls.ButterBar.prototype.createDom = function() {
  // Render the main butter bar area element
  this.setElementInternal(this.getDomHelper().createDom('div',
      controls.ButterBar.CSS_NAME_));

  goog.asserts.assert(this.getElement(),
      'The DOM element for the butter bar cannot be null.');
  //this.applyAriaLiveAttributes();

  this.setContent(this.content_);
  this.setMini(this.mini_);
  this.setType(this.type_);
};


/**
 * Applies the ARIA attributes to make the butter bar an ARIA live region. This
 * can be overridden if ARIA attributes are not desired.
 * @protected
 */
controls.ButterBar.prototype.applyAriaLiveAttributes = function() {
  var element = this.getElement();
  if (element) {
    goog.a11y.aria.setState(element,
        goog.a11y.aria.State.LIVE,
        goog.a11y.aria.LivePriority.ASSERTIVE);
    goog.a11y.aria.setState(element,
        goog.a11y.aria.State.ATOMIC,
        'true');
  }
};
