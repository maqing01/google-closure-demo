goog.provide('controls.Button');
goog.provide('controls.Button.Style');
goog.provide('controls.Button.Width');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.object');
goog.require('goog.soy');
goog.require('goog.style');
goog.require('goog.ui.Button');
goog.require('goog.ui.ButtonRenderer');
goog.require('goog.ui.Component');
goog.require('controls.templates.button.strict');
goog.require('controls.tooltipManager');
goog.require('controls.ButtonProto.Style');



/**
 * Common CONTROLS button.
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @param {controls.Button.Style=} opt_buttonStyle Button style. Default
 *     is STANDARD.
 * @param {controls.Button.Width=} opt_buttonWidth Button width. Default
 *     is NORMAL.
 * @constructor
 * @extends {goog.ui.Button}
 */
controls.Button = function(content, opt_domHelper, opt_buttonStyle,
                      opt_buttonWidth) {
  controls.Button.base(this,
      'constructor', content, controls.ButtonRenderer_.getInstance(), opt_domHelper);

  /**
   * Button style.
   * @type {!controls.Button.Style}
   * @private
   */
//  this.style_ = opt_buttonStyle || controls.ButtonProto.Style.STANDARD;
  this.style_ = opt_buttonStyle || 0;

  /**
   * Button width.
   * @type {!controls.Button.Width}
   * @private
   */
//  this.width_ = opt_buttonWidth || controls.ButtonProto.Width.NORMAL;
  this.width_ = opt_buttonWidth || 0;

  /**
   * Use CONTROLS-style tooltip or the HTML "title" attribute.
   * @type {boolean}
   * @private
   */
  this.usingKennedyTooltip_ = false;
};
goog.inherits(controls.Button, goog.ui.Button);


/**
 * Class name for the button.
 * @const
 */
controls.Button.CSS_NAME = goog.getCssName('controls-button');


/**
 * Note: this is practically private, but needs to be seen by the renderer.
 * @return {!controls.Button.Style} Button style.
 */
controls.Button.prototype.getStyle = function() {
  return this.style_;
};


/**
 * Note: this is practically private, but needs to be seen by the renderer.
 * @return {!controls.Button.Width} Button width.
 */
controls.Button.prototype.getWidth = function() {
  return this.width_;
};


/**
 * @return {boolean} true when CONTROLS tooltip is to be used, false otherwise.
 */
controls.Button.prototype.isUsingKennedyTooltip = function() {
  return this.usingKennedyTooltip_;
};


/**
 * @param {!controls.Button.Style} style Button style.
 */
controls.Button.prototype.setStyle = function(style) {
  if (this.style_ != style) {
    this.style_ = style;
    this.maybeUpdateElement_();
  }
};


/**
 * @param {!controls.Button.Width} width Button width.
 */
controls.Button.prototype.setWidth = function(width) {
  if (this.width_ != width) {
    this.width_ = width;
    this.maybeUpdateElement_();
  }
};


/**
 * @param {boolean} enable Whether to use CONTROLS tooltip instead of HTML's "title"
 *     attribute.
 */
controls.Button.prototype.setUsingKennedyTooltip = function(enable) {
  this.usingKennedyTooltip_ = enable;
};


/** @override */
controls.Button.prototype.setTooltip = function(tooltip) {
  this.setTooltipInternal(tooltip);
  var element = this.getElement();
  if (element && tooltip) {
    if (this.usingKennedyTooltip_) {
      controls.tooltipManager.setTooltipText(element, tooltip);
    } else {
      element.title = tooltip;
    }
  }
};


/** @override */
controls.Button.prototype.setEnabled = function(enabled) {
  if (this.isEnabled() != enabled) {
    controls.Button.base(this, 'setEnabled', enabled);
    this.maybeUpdateElement_();
  }
};


/** @override */
controls.Button.prototype.setFocused = function(focused) {
  controls.Button.base(this, 'setFocused', focused);

  // Style should be cleared whenever focus is changed.  Mouse event
  // should change it back.
  this.setNoFocusOutline_(false);
};


/**
 * Clears the outline style on mouse down, on top of the standard mouse down
 * handling of the superclass.  This will cause the button to have outline style
 * when tabbed to, but not when clicked with the mouse.  Focus event is fired
 * before mousedown, except in IE, and so we also listen for mouse up.
 * @param {goog.events.Event} e Mouse event to handle.
 * @override
 */
controls.Button.prototype.handleMouseDown = function(e) {
  controls.Button.base(this, 'handleMouseDown', e);
  if (this.isEnabled()) {
    this.setNoFocusOutline_(true);
  }
};


/**
 * Clears the outline style on mouse up, on top of the standard mouse up
 * handling of the superclass. This will cause the button to have outline style
 * when tabbed to, but not when clicked with the mouse. Focus event is fired
 * before mousedown, except in IE, where the focus event is fired asynchronously
 * from the mouse down event. So we listen here for mouse up, in addition to
 * what we do in handleMouseDown.
 * @param {goog.events.Event} e Mouse event to handle.
 * @override
 */
controls.Button.prototype.handleMouseUp = function(e) {
  controls.Button.base(this, 'handleMouseUp', e);
  if (this.isEnabled()) {
    this.setNoFocusOutline_(true);
  }
};


/**
 * Set class to clear the focus outline.
 * @param {boolean} enable Whether to enable the class.
 * @private
 */
controls.Button.prototype.setNoFocusOutline_ = function(enable) {
  if (this.getElement()) {
    goog.dom.classlist.enable(
        this.getElement(),
        goog.getCssName(controls.Button.CSS_NAME, 'clear-outline'),
        enable);
  }
};


/**
 * Re-styles the DOM of the button.  Called after a property has changed.
 * @private
 */
controls.Button.prototype.maybeUpdateElement_ = function() {
  // If we already have an element, we have to add the appropriate styles.
  if (this.getElement()) {
    this.getRenderer().updateButtonStyles(this);
  }
};


/**
 * @enum {number}
 */
controls.Button.Style = controls.ButtonProto.Style;


/**
 * @enum {number}
 */
controls.Button.Width = controls.ButtonProto.Width;


/**
 * CONTROLS Default button (green in CONTROLS).
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with default style.
 */
controls.Button.createDefaultButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.DEFAULT);
};


/**
 * Create a new CONTROLS action button (blue in CONTROLS).
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with action style.
 */
controls.Button.createActionButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.ACTION);
};


/**
 * Create a new CONTROLS Primary button (red in CONTROLS).
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with primary style.
 */
controls.Button.createPrimaryButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.PRIMARY);
};


/**
 * Create a new CONTROLS flat button -- button with no border/background.
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with primary style.
 */
controls.Button.createFlatButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.FLAT);
};


/**
 * Create a new CONTROLS Contrast button (white in Rio, standard button in CONTROLS).
 * See controls.button.contrastButton (contrastbutton.gss) for more info on use
 * and visual styles.
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with default style.
 */
controls.Button.createContrastButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.CONTRAST);
};


/**
 * Factory method for creating a CONTROLS search button.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with the search icon and action
 *     style.
 */
controls.Button.createSearchButton = function(opt_domHelper) {
  //  Needs a means to specify alt tag for accessibility.
  return controls.Button.createActionButton(
      controls.Button.createIconContent(controls.Button.SEARCH_BUTTON_SRC_),
      opt_domHelper);
};


/**
 * Factory method for creating a CONTROLS toggle button.
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with the search icon and action
 *     style.
 */
controls.Button.createToggleButton = function(content, opt_domHelper) {
  //  Needs a means to specify alt tag for accessibility.
  var button = new controls.Button(content, opt_domHelper);
  button.setSupportedState(goog.ui.Component.State.CHECKED, true);
  return button;
};


/**
 * Factory method for creating a CONTROLS mini button.
 * @param {goog.ui.ControlContent} content Text caption or existing DOM
 *     structure to display as the button's caption.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @return {!controls.Button} A button initialized with primary style.
 */
controls.Button.createMiniButton = function(content, opt_domHelper) {
  return new controls.Button(content, opt_domHelper, controls.ButtonProto.Style.MINI);
};


/**
 * Resource for the search button icon.
 * @type {string}
 * @const
 * @private
 */
controls.Button.SEARCH_BUTTON_SRC_ =
    '//not-connected/ui/v1/button/search-white.png';


/**
 * Create control content for a standard icon.
 *
 *  This is a stop gap. Find a way to make this general for
 * sprited icons and teams' needs.
 *
 * If a source string is given, image is expected to be a 21x21 png with black
 * and transparent pixels.  See iconlist.png in this directory.
 *
 * @param {!HTMLImageElement|string} img An image or src URL for an image.
 * @param {string=} opt_label An optional label.
 * @return {!goog.ui.ControlContent} Content for use in a button.
 */
controls.Button.createIconContent = function(img, opt_label) {
  if (goog.isString(img)) {
    var src = img;
    img = /** @type {!HTMLImageElement} */ (goog.dom.createDom('img'));
    img.src = src;
    goog.style.setSize(img, 21, 21);
  }

  goog.dom.classlist.add(/** @type {Element} */ (img),
      goog.getCssName('controls-button-img'));

  var nodes = [];
  nodes.push(img);

  if (opt_label) {
    var labelSpan = goog.dom.createDom('span',
        goog.getCssName('controls-button-label'), opt_label);
    nodes.push(labelSpan);
  }

  return nodes;
};


// Button renderer



/**
 * Renders a CONTROLS button.
 * @constructor
 * @extends {goog.ui.ButtonRenderer}
 * @private
 */
controls.ButtonRenderer_ = function() {
  controls.ButtonRenderer_.base(this, 'constructor');

  /**
   * @type {string}
   * @private
   */
  this.standardButtonClass_ = goog.getCssName(this.getCssClass(), 'standard');

  /**
   * @type {string}
   * @private
   */
  this.actionButtonClass_ = goog.getCssName(this.getCssClass(), 'action');

  /**
   * @type {string}
   * @private
   */
  this.primaryButtonClass_ = goog.getCssName(this.getCssClass(), 'primary');

  /**
   * @type {string}
   * @private
   */
  this.defaultButtonClass_ = goog.getCssName(this.getCssClass(), 'default');

  /**
   * @type {string}
   * @private
   */
  this.flatButtonClass_ = goog.getCssName(this.getCssClass(), 'flat');

  /**
   * @type {string}
   * @private
   */
  this.narrowButtonClass_ = goog.getCssName(this.getCssClass(), 'narrow');

  /**
   * @type {string}
   * @private
   */
  this.miniButtonClass_ = goog.getCssName(this.getCssClass(), 'mini');

  /**
   * @type {string}
   * @private
   */
  this.contrastButtonClass_ = goog.getCssName(this.getCssClass(), 'contrast');
};
goog.inherits(controls.ButtonRenderer_, goog.ui.ButtonRenderer);
goog.addSingletonGetter(controls.ButtonRenderer_);


/**
 * CSS class names to button updater to be used by decorate.
 * @type {Object}
 * @private
 */
controls.ButtonRenderer_.prototype.classNamesToButtonUpdater_;


/**
 * Updates the button style and width.
 * @param {controls.Button.Style} style The new style. If null is passed,
 *    the style will not be updated.
 * @param {controls.Button.Width} width The new width. If null is passed,
 *    the width will not be updated.
 * @param {controls.Button} button The button.
 * @private
 */
controls.ButtonRenderer_.prototype.updateButton_ = function(style, width, button) {
  if (style) button.setStyle(style);
  if (width) button.setWidth(width);
};


/** @override */
controls.ButtonRenderer_.prototype.getCssClass = function() {
  return controls.Button.CSS_NAME;
};


/** @override */
controls.ButtonRenderer_.prototype.createDom = function(button) {
  goog.asserts.assertInstanceof(button, controls.Button,
      'Button is expected to be instance of controls.Button');

  var domHelper = button.getDomHelper();
  var elem = goog.soy.renderAsElement(controls.templates.button.strict, {
    disabled: !button.isEnabled(),
    checked: button.isChecked(),
    style: button.getStyle(),
    title: button.getTooltip(),
    content: button.getContent(),
    usingKennedyTooltip: button.isUsingKennedyTooltip(),
    value: button.getValue(),
    width: button.getWidth()
  }, undefined, domHelper);
  // domHelper.append(elem, button.getContent());

  this.decorate(button, elem);
  return elem;
};


/** @override */
controls.ButtonRenderer_.prototype.decorate = function(button, element) {
  controls.ButtonRenderer_.base(this, 'decorate', button, element);

  if (!this.classNamesToButtonUpdater_) {
    this.classNamesToButtonUpdater_ = goog.object.create(
        this.standardButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.STANDARD, null),
        this.actionButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.ACTION, null),
        this.primaryButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.PRIMARY, null),
        this.defaultButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.DEFAULT, null),
        this.flatButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.FLAT, null),
        this.miniButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.MINI, null),
        this.contrastButtonClass_,
        goog.partial(this.updateButton_, controls.ButtonProto.Style.CONTRAST, null),
        this.narrowButtonClass_,
        goog.partial(this.updateButton_, null, controls.ButtonProto.Width.NARROW));
  }

  var classNames = goog.dom.classlist.get(element);
  for (var i = 0; i < classNames.length; ++i) {
    var updaterFn = this.classNamesToButtonUpdater_[classNames[i]];
    if (updaterFn) updaterFn(button);
  }

  var kennedyTooltip = element.getAttribute('data-tooltip');
  if (kennedyTooltip) {
    button.setTooltipInternal(kennedyTooltip);
    button.setUsingKennedyTooltip(true);
  }

  return element;
};


/**
 * HTML attribute containing button's value.
 * @type {string}
 * @private
 * @const
 */
controls.ButtonRenderer_.VALUE_ATTRIBUTE_ = 'value';


/** @override */
controls.ButtonRenderer_.prototype.getValue = function(element) {
  return element.getAttribute(controls.ButtonRenderer_.VALUE_ATTRIBUTE_) || '';
};


/** @override */
controls.ButtonRenderer_.prototype.setValue = function(element, value) {
  if (element) {
    element.setAttribute(controls.ButtonRenderer_.VALUE_ATTRIBUTE_, value);
  }
};


/** @override */
controls.ButtonRenderer_.prototype.setState = function(button, state, enable) {
  controls.ButtonRenderer_.base(this, 'setState', button, state, enable);
  if (state == goog.ui.Component.State.FOCUSED) {
    try {
      var element = button.getElement();
      if (enable) {
        element.focus();
      } else {
        element.blur();
      }
    } catch (e) {
      // IE can throw on focus().
    }
  }
};


/**
 * Updates the element styles after a chage.
 * @param {!controls.Button} button Button to render.
 */
controls.ButtonRenderer_.prototype.updateButtonStyles = function(button) {
  goog.asserts.assert(button.getElement(),
      'Button element must already exist when updating style.');

  var classNamesToAdd = [];
  var classNamesToRemove = [];

  function addOrRemoveClassName(addOrRemove, className) {
    (addOrRemove ? classNamesToAdd : classNamesToRemove).push(className);
  }

  // Button styles
  var style = button.getStyle();
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.STANDARD, this.standardButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.ACTION, this.actionButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.PRIMARY, this.primaryButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.FLAT, this.flatButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.MINI, this.miniButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.DEFAULT, this.defaultButtonClass_);
  addOrRemoveClassName(
      style == controls.ButtonProto.Style.CONTRAST, this.contrastButtonClass_);

  // Button width
  addOrRemoveClassName(
      button.getWidth() == controls.ButtonProto.Width.NARROW, this.narrowButtonClass_);

  // Enabled/disabled
  addOrRemoveClassName(
      !button.isEnabled(), goog.getCssName(this.getCssClass(), 'disabled'));

  // Apply/remove the new styles.
  goog.dom.classlist.removeAll(button.getElement(), classNamesToRemove);
  goog.dom.classlist.addAll(button.getElement(), classNamesToAdd);
};
