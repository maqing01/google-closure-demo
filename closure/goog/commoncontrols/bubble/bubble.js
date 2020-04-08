

/**
 * @fileoverview Renders a bubble with an arrow relative to an anchor
 * position. The bubble supports various positioning and arrow
 * alignments, and an optional close button (enabled by default).
 *



 * @see bubble_demo.html
 */

goog.provide('controls.Bubble');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.dom.safe');
goog.require('goog.events.EventType');
goog.require('goog.events.actionEventWrapper');
goog.require('goog.fx.css3');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.legacyconversions');
goog.require('goog.soy');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.Popup');
goog.require('goog.ui.PopupBase');
goog.require('goog.userAgent');
goog.require('controls.ArrowPosition');
goog.require('controls.templates.bubble.main');
goog.require('soydata.SanitizedHtml');


//==============================================================================
// Initialization.
//==============================================================================



/**
 * Simple popup/bubble with configurable position and an arrow
 * pointing towards its anchor element. The bubble disposes itself
 * automatically when hidden.
 *
 * Bubble fires the following events:
 * goog.ui.PopupBase.EventType.BEFORE_SHOW,
 * goog.ui.PopupBase.EventType.SHOW,
 * goog.ui.PopupBase.EventType.BEFORE_HIDE,
 * goog.ui.PopupBase.EventType.HIDE
 *
 * NOTE: This class differ from goog.ui.Bubble in that it does not use
 * tables and looks and behaves differently. It is a shadowed box with
 * an arrow rather than a round thought bubble.
 *
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DomHelper.
 * @extends {goog.ui.Component}
 * @constructor
 */
controls.Bubble = function(opt_domHelper) {
  controls.Bubble.base(this, 'constructor', opt_domHelper);

  /**
   * @type {!controls.ArrowPosition}
   * @private
   */
  this.arrowPosition_ = new controls.ArrowPosition(this.className_,
      true /* disableSubpixels */);

  /**
   * @type {!goog.ui.Popup}
   * @private
   */
  this.popup_ = new goog.ui.Popup();

  /**
   * This value is used to hide the bubble when we scroll so it
   * doesn't overlap a fixed header if present; we hide the bubble
   * when scrolling if its position is less than the value.
   * @type {number}
   * @private
   */
  this.hideYPosition_ = 0;

  /**
   * Optional additional CSS classes for the outer 'bubble area' div.
   * @type {!Array.<string>}
   * @private
   */
  this.extraCssClasses_ = [];
};
goog.inherits(controls.Bubble, goog.ui.Component);


/**
 * CSS class name for the bubble element, also used as a class name prefix for
 * related elements.
 * @type {string}
 * @private
 */
controls.Bubble.prototype.className_ = goog.getCssName('controls-bubble');


/**
 * Whether the close box is enabled.
 * @type {boolean}
 * @private
 */
controls.Bubble.prototype.showCloseButton_ = true;


/**
 * @private {Element|string|soydata.SanitizedHtml|goog.html.SafeHtml}
 */
controls.Bubble.prototype.content_;


/**
 * @type {boolean}
 * @private
 */
controls.Bubble.prototype.disposeOnHide_ = false;


//==============================================================================
// Getters & Setters.
//==============================================================================


/**
 * Sets the anchor element. May be null, in which case, we do not
 * reposition the box element with respect to anchor. This may be called
 * at any time.
 * @param {Element} anchor The anchor element.
 */
controls.Bubble.prototype.setAnchorElement = function(anchor) {
  this.arrowPosition_.setAnchorElement(anchor);
  this.reposition();
};


/**
 * Sets the position of the bubble. By default, the bubble is on the right of
 * the anchor and the arrow point is centered. Must be called before
 * the element is rendered.
 * @param {controls.PopupPosition=} opt_position Position of the bubble
 *     relative to the anchor (e.g. left means the bubble will be at the left
 *     of the anchor).
 * @param {controls.ArrowAlignment=} opt_alignment Arrow Alignment
 *     on the side of the bubble.
 * @param {number=} opt_arrowOffset Optional offset (in px) for the arrow.
 *     Ignored if Alignment is CENTER.
 * @param {number=} opt_offsetFromAnchor Optional offset (in px) for the
 *     movable box with respect to the anchor. Defaults to 5px.
 */
controls.Bubble.prototype.setPosition = function(opt_position,
    opt_alignment, opt_arrowOffset, opt_offsetFromAnchor) {
  goog.asserts.assert(!this.isInDocument(),
      'Must call setPosition() before rendering');
  this.arrowPosition_.setPosition(
      opt_position, opt_alignment, opt_arrowOffset, opt_offsetFromAnchor);
};


/**
 * Shows the close button. Must be called before rendering.
 * @param {boolean} show Whether the close box is enabled.
 */
controls.Bubble.prototype.showCloseButton = function(show) {
  goog.asserts.assert(!this.isInDocument(),
      'Must call setShowClosebox() before rendering');
  this.showCloseButton_ = show;
};


/**
 * Adds an extra CSS class to the outer 'bubble area' div. Must be
 * called before rendering.
 * @param {string} className The class name to add.
 */
controls.Bubble.prototype.addClassName = function(className) {
  goog.asserts.assert(!this.isInDocument(),
      'Must call addClassName() before rendering');
  this.extraCssClasses_.push(className);
};


/**
 * Sets the content of the bubble. Alternatively, if the element has
 * already been rendered, you can set the content of
 * {@code getContentElement()} directly.
 *
 * @param {Element|string|soydata.SanitizedHtml|goog.html.SafeHtml} content
 *     The content to set. Prefer to use SanitizedHtml or SafeHtml if you need
 *     to send HTML, but string is available for old usages.
 */
controls.Bubble.prototype.setContent = function(content) {
  goog.asserts.assert(
      goog.isString(content) || content.nodeType ||
          content instanceof soydata.SanitizedHtml ||
          content instanceof goog.html.SafeHtml,
      'Content must be a string or HTML.');
  this.content_ = content;
  this.setContentInternal_(content);
};


/**
 * Sets content implementation.
 * @param {Element|string|soydata.SanitizedHtml|goog.html.SafeHtml} content The
 *     content to set.
 * @private
 */
controls.Bubble.prototype.setContentInternal_ = function(content) {
  var element = this.getContentElement();
  if (content && element) {
    if (goog.isString(content)) {
      goog.dom.safe.setInnerHtml(element,
          goog.html.legacyconversions.safeHtmlFromString(content));
    } else if (content instanceof soydata.SanitizedHtml) {
      goog.dom.safe.setInnerHtml(element, content.toSafeHtml());
    } else if (content instanceof goog.html.SafeHtml) {
      goog.dom.safe.setInnerHtml(element, content);
    } else {
      goog.dom.safe.setInnerHtml(element, goog.html.SafeHtml.EMPTY);
      goog.dom.appendChild(element, content);
    }
  }
};


/**
 * Sets whether the bubble hides when a click happens somewhere else on the
 * page. Defaults to true.
 * @param {boolean} autoHide Whether auto hide should be enabled.
 */
controls.Bubble.prototype.setAutoHide = function(autoHide) {
  this.popup_.setAutoHide(autoHide);
};


/**
 * Sets the region inside which the bubble dismisses itself when the user
 * clicks.
 * @param {Element} element The DOM element for autohide.
 */
controls.Bubble.prototype.setAutoHideRegion = function(element) {
  this.popup_.setAutoHideRegion(element);
};


/**
 * Sets whether to prevent the bubble from going outside the browser or frame
 * viewport.
 * @param {boolean} auto Whether to use auto re-position.
 */
controls.Bubble.prototype.setAutoReposition = function(auto) {
  this.arrowPosition_.setAutoReposition(auto);
};


/**
 * Adds an auto hide partner. Mouse events that occur within an auto hide
 * partner will not hide a popup set to auto hide.
 * @param {!Element} partner The auto hide partner element.
 */
controls.Bubble.prototype.addAutoHidePartner = function(partner) {
  this.popup_.addAutoHidePartner(partner);
};


/**
 * Removes a previously registered auto hide partner.
 * @param {!Element} partner The auto hide partner element.
 */
controls.Bubble.prototype.removeAutoHidePartner = function(partner) {
  this.popup_.removeAutoHidePartner(partner);
};


/**
 * Sets whether the bubble should be automatically disposed on hiding.
 * @param {boolean} disposeOnHide Whether to autmatically dispose
 *     itself on hiding.
 */
controls.Bubble.prototype.setDisposeOnHide = function(disposeOnHide) {
  this.disposeOnHide_ = disposeOnHide;
};


/** @override */
controls.Bubble.prototype.getContentElement = function() {
  return this.getElementByClass(goog.getCssName(this.className_, 'content-id'));
};


/**
 * Sets the value of the y position at which we hide the button when scrolling.
 * @param {number} hideYPos The value of the position for hiding.
 */
controls.Bubble.prototype.setHideYPosition = function(hideYPos) {
  this.hideYPosition_ = hideYPos;
};


//==============================================================================
// DOM & Rendering.
//==============================================================================


/** @override */
controls.Bubble.prototype.createDom = function() {
  // The Html structure of the bubble is:
  // Element        Function                 Class-name
  // ---------------------------------------------------------------------------
  // - div          Bubble area              controls-bubble
  //   - div        Content area             controls-bubble-content
  //     - ??       User specified content   N/A
  //   - div        Close button             controls-bubble-closebtn
  //   - div        Arrow                    controls-bubble-arrow-%direction%

  // Render the main popup content element.
  this.setElementInternal(goog.soy.renderAsElement(
      controls.templates.bubble.main, {
        showCloseBox: this.showCloseButton_
      }, undefined, this.getDomHelper()));
  this.setContentInternal_(this.content_);
  goog.style.setElementShown(this.getElement(), false);

  this.popup_.setElement(this.getElement());

  this.configurePopupTransition(this.popup_);

  goog.dom.classlist.addAll(this.getElement(), this.extraCssClasses_);
};


/**
 * Configures the popup transition.
 * @param {!goog.ui.Popup} popup
 * @protected
 */
controls.Bubble.prototype.configurePopupTransition = function(popup) {
  // Do not enable transition on mobile devices as they are not played smoothly.
  if (!goog.userAgent.MOBILE) {
    popup.setTransition(
        goog.fx.css3.fadeIn(this.getElement(), controls.Bubble.TRANSITION_DURATION_),
        goog.fx.css3.fadeOut(this.getElement(),
            controls.Bubble.TRANSITION_DURATION_));
  }
};


/**
 * Sets the viewport for the bubble.The viewport is specified relative to the
 * offset parent.
 * See documentataion for {@code opt_viewport} at
 * {@code goog.positioning.positionAtAnchor} for more details.
 * @param {!goog.math.Box} viewport Viewport for the box.
 */
controls.Bubble.prototype.setViewport = function(viewport) {
  this.arrowPosition_.setViewport(viewport);
};


/**
 * Animation duration (in seconds). The value is as defined in go/kennedyspec.
 * @type {number}
 * @const
 * @private
 */
controls.Bubble.TRANSITION_DURATION_ = 0.218;


/** @override */
controls.Bubble.prototype.enterDocument = function() {
  controls.Bubble.base(this, 'enterDocument');

  this.getHandler().listen(
      this.popup_, [
        goog.ui.PopupBase.EventType.BEFORE_SHOW,
        goog.ui.PopupBase.EventType.SHOW,
        goog.ui.PopupBase.EventType.BEFORE_HIDE,
        goog.ui.PopupBase.EventType.HIDE
      ], this.handlePopupEvent_);

  if (this.showCloseButton_) {
    this.getHandler().listenWithWrapper(
        this.getElementByClass(goog.getCssName(this.className_, 'closebtn-id')),
        goog.events.actionEventWrapper, goog.partial(this.setVisible, false));
  }

  var element = this.getElement();
  goog.asserts.assert(element, 'getElement() returns null.');

  var arrow = this.getElementByClass(
      goog.getCssName(this.className_, 'arrow-id'));
  goog.asserts.assert(arrow, 'No arrow element is found!');

  // Must be in document and visible before calling positionArrow.
  this.arrowPosition_.setElements(element, arrow);
  // Position the bubble using the ArrowPosition positioning abstraction.
  this.popup_.setPosition(this.arrowPosition_);
};


/**
 * Sets the bubble visibility.
 * @param {boolean} visible Whether the bubble should be visible or not.
 */
controls.Bubble.prototype.setVisible = function(visible) {
  this.popup_.setVisible(visible);
};


/**
 * @return {boolean} Whether the popup is visible.
 */
controls.Bubble.prototype.isVisible = function() {
  return this.popup_.isVisible();
};


/**
 * Returns whether the popup is currently visible or was visible within about
 * 150ms ago. This is used to handle the scenario where the same button is used
 * to open and close the popup. See details at {@link
 * goog.ui.PopupBase#isOrWasRecentlyVisible}.
 * @return {boolean} Whether the popup is or was recently visible.
 */
controls.Bubble.prototype.isOrWasRecentlyVisible = function() {
  return this.popup_.isOrWasRecentlyVisible();
};


/**
 * Repositions the bubble popup if needed.
 */
controls.Bubble.prototype.reposition = function() {
  if (this.isVisible()) this.popup_.reposition();
};


/** @override */
controls.Bubble.prototype.disposeInternal = function() {
  this.popup_.dispose();
  delete this.popup_;
  controls.Bubble.base(this, 'disposeInternal');
};


/**
 * Handle scroll events on the document body by dismissing
 * the bubble.
 * @param {goog.events.BrowserEvent} event The scroll event.
 * @return {boolean} Return false since we handled event.
 * @private
 */
controls.Bubble.prototype.handleScroll_ = function(event) {
  // Hide the bubble if its position is less than the hide position.
  var position = goog.style.getClientPosition(this.getElement());
  if (this.hideYPosition_ && position.y < this.hideYPosition_) {
    this.setVisible(false);
  }
  return false;
};


/**
 * Handles popup event and fires them as controls.Bubble owns.
 * @param {goog.events.Event} e The event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false) this will also return false.
 * @private
 */
controls.Bubble.prototype.handlePopupEvent_ = function(e) {
  if (e.type == goog.ui.PopupBase.EventType.SHOW ||
      e.type == goog.ui.PopupBase.EventType.HIDE) {
    // Listen or unlisten for scroll events so we can dismiss the bubble when
    // the page scrolls, so the bubble won't overlap the fixed header if it's
    // present.
    var handler = this.getHandler();
    var domHelper = this.getDomHelper();
    var scrollElement = goog.userAgent.IE ? domHelper.getWindow() :
        domHelper.getDocument();
    if (e.type == goog.ui.PopupBase.EventType.SHOW) {
      handler.listen(scrollElement,
          goog.events.EventType.SCROLL, this.handleScroll_);
    } else {
      handler.unlisten(scrollElement,
          goog.events.EventType.SCROLL, this.handleScroll_);
    }
  }

  var shouldCancel = this.dispatchEvent(e.type);

  // Dispose-on-hide is really part of hiding the popup and should be
  // cancelled via BEFORE_HIDE. So we should ignore the value of shouldCancel
  // and dispose the bubble here.
  if (this.disposeOnHide_ && e.type == goog.ui.PopupBase.EventType.HIDE) {
    this.dispose();
  }

  return shouldCancel;
};
