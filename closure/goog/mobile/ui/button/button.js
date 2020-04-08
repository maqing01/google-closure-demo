/**
 * @fileoverview Button that responds faster to clicks on iPhone and Android
 * devices by listening for the more sensitive touch events. Also supports
 * a pressed state and spinner.
 */

goog.provide('wireless.ui.Button');
goog.provide('wireless.ui.ButtonGroup');
goog.provide('wireless.ui.StickyButton');

goog.require('goog.asserts');
goog.require('goog.events.KeyCodes');
goog.require('goog.log');
goog.require('goog.math');
goog.require('goog.string');
goog.require('goog.style');
goog.require('wireless.Spinner');
goog.require('wireless.dom');
goog.require('wireless.events.clickbuster');
goog.require('wireless.events.touch');
goog.require('wireless.style');
goog.require('wireless.ui');



/**
 * Class for handling touch button behaviour.
 * @param {!Element} element The element to be used as a button.
 * @param {function(!Event)=} opt_onclick The function to call when a click is
 *     detected. By default the onclick handler attached to the button element
 *     is used.
 * @param {boolean=} opt_disableTouchEvents Use onclick events only, rather than
 *     using touch events to detect when a click has occurred. This is slower
 *     than responding to touch events on iPhone and Android. Using onclick
 *     events is required if you want to call focus() on any elements in your
 *     click handler on iPhone, as Mobile Safari blocks focus()ing elements
 *     outside the context of an onclick handler. It is also required on Android
 *     if the event handler wants to open a new window and the pop-up blocker is
 *     enabled on the browser.
 * @param {boolean=} opt_disableAutomaticGhostClickPrevention Disables the
 *     button from preventing ghost clicks automatically. Call preventGhostClick
 *     if you determine that a ghost click should still be prevented.
 * @constructor
 */
wireless.ui.Button = function(element, opt_onclick, opt_disableTouchEvents,
    opt_disableAutomaticGhostClickPrevention) {
  this.useClickEvent_ = wireless.device.browserHasBrokenTouchMoveEvents() ||
      /** @type {boolean} */ (opt_disableTouchEvents);
  this.element_ = wireless.ui.use(element);
  this.innerElement_ = /** @type {Element} */ (element.firstChild);
  this.onclick = opt_onclick || /** @type {function()} */ (element.onclick);
  element[wireless.ui.Button.SAVED_BUTTON_PROPERTY_] = this;

  /**
   * Whether this button should disable automatic ghost click prevention.
   * @private {boolean|undefined}
   */
  this.disableAutomaticGhostClickPrevention_ =
      opt_disableAutomaticGhostClickPrevention;

  var startFn = goog.bind(this.onButtonTouchStart_, this);
  if (!wireless.events.touch.SUPPORTS_TOUCHES) {
    startFn = wireless.events.touch.mouseToTouchCallback(startFn);
  }

  element.addEventListener(wireless.events.touch.START_EVENT, startFn, false);

  // Always set a click handler, to make Safari happy. Otherwise it goes
  // searching for a click target and is likely to execute a click action on
  // a nearby normal link, button, or input.
  //
  // In addition, Safari has a bug where on occasion it stops firing touch
  // events. In that case, the click event will be handled as a fallback.
  // Usually, the touch events will start firing again in response to a page
  // redraw, and the user won't notice that anything out of the ordinary
  // happend for this one click.
  //
  // In the common case, any interaction is handled using touch events,
  // and the following click will be stopped by the ghost click buster.
  //
  // @bug 2368696
  element.onclick = goog.bind(this.onButtonClick_, this);
};


/**
 * CSS class applied to all buttons.
 * @type {string}
 */
wireless.ui.Button.BUTTON_CLASS = goog.getCssName('CSS_WUI_BUTTON');


/**
 * CSS class that tells the decorate() function to use onclick for events
 * instead of touch events.
 * @private {string}
 */
wireless.ui.Button.ONCLICK_MARKER_CLASS_ =
    goog.getCssName('CSS_WUI_BUTTON_USE_ONCLICK_MARKER');


/**
 * CSS class to apply to the button when pressed.
 * @private {string}
 */
wireless.ui.Button.PRESSED_CLASS_ = goog.getCssName('CSS_WUI_PRESSED');


/**
 * CSS class applied to button labels.
 * @private {string}
 */
wireless.ui.Button.LABEL_CLASS_ = goog.getCssName('CSS_WUI_BUTTON_LABEL');


/**
 * CSS class applied to sticky buttons.
 * @private {string}
 */
wireless.ui.Button.STICKY_CLASS_ = goog.getCssName('CSS_WUI_BUTTON_STICKY');


/**
 * CSS class applied to disabled buttons.
 * @private {string}
 */
wireless.ui.Button.DISABLED_CLASS_ = goog.getCssName('CSS_WUI_DISABLED');


/**
 * CSS class applied to enabled buttons.
 * @private {string}
 */
wireless.ui.Button.ENABLED_CLASS_ = goog.getCssName('CSS_WUI_ENABLED');


/**
 * Regular expression that extracts the control type from the onclick handler
 * defined in the template wireless.soy.button.buttonBegin.
 * @private {RegExp}
 */
wireless.ui.Button.ONCLICK_PARSE_REGEX_ =
    /^_x\(event,\s*'(.*?)'(?:,\s*(.*?)\s*\))?/;


/**
 * The property name where the button is assigned to the button element after
 * the button's creation. Used to lookup a the wireless.ui.Button class from
 * given its element.
 * @private {string}
 */
wireless.ui.Button.SAVED_BUTTON_PROPERTY_ =
    '_jwb_' + goog.string.createUniqueString();


/**
 * The limit in pixels of how much movement to allow before rejecting the
 * interaction as a click.
 * @private {number}
 */
wireless.ui.Button.MOTION_TOLERANCE_ = 12;


/**
 * The time in milliseconds after an interaction starts at which the long click
 * action is called.
 * @private {number}
 */
wireless.ui.Button.LONG_CLICK_DELAY_ = 500;


/**
 * An alternate value for LONG_CLICK_DELAY_ for when click events are being
 * used. Click events fire slower than touch events; the longer delay for long
 * clicks is meant to ensure that a long click will not fire before a regular
 * click.
 * @private {number}
 */
wireless.ui.Button.LONG_CLICK_DELAY_FOR_CLICK_EVENTS_ = 800;


/**
 * The lenth of time in milliseconds to wait after a touchstart event before
 * resetting the pressed state when no onclick event has arrived. This should
 * be more than the iOS onclick delay, which is 300ms.
 * @private {number}
 */
wireless.ui.Button.SET_USE_CLICK_RESET_PRESSED_STATE_DELAY_ = 400;


/**
 * Creates or looks up a new Button for every button found in the container.
 * Returns the first button found.
 * @param {!Element} container The container to search.
 * @return {!wireless.ui.Button} The first button found in the container.
 */
wireless.ui.Button.decorate = function(container) {
  return wireless.ui.Button.decorateAll(container)[0];
};


/**
 * Creates a new Button for every button found in container. If a button has
 * already been created for an element, it returns that one instead.
 * @param {!Element} container The container to search.
 * @return {!Array.<!wireless.ui.Button>} All of the buttons found in the
 *     container, in the order in which they occur in the DOM.
 */
wireless.ui.Button.decorateAll = function(container) {
  var buttonDivs = wireless.dom.getElementsByClassName(
      wireless.ui.Button.BUTTON_CLASS, container);
  var buttons = [];
  var pill;
  var tabs;
  var tabParent;
  for (var i = 0, buttonDiv; buttonDiv = buttonDivs[i]; ++i) {
    // Don't create a button if one has already been created, just add it to the
    // list.
    var savedButton = wireless.ui.Button.getButtonFromElement(buttonDiv);
    if (savedButton) {
      buttons.push(savedButton);
      continue;
    }

    var disableTouchEvents = wireless.dom.hasClass(buttonDiv,
        wireless.ui.Button.ONCLICK_MARKER_CLASS_);
    // Detect pills. We assume that every button between PILL_LEFT
    // and PILL_RIGHT classes belong to the pill. We also assume that
    // the pill is well formed and pills don't nest or intersect.
    if (!pill && wireless.dom.hasClass(buttonDiv,
        wireless.ui.ButtonGroup.PILL_LEFT_CLASS)) {
      pill = new wireless.ui.ButtonGroup();
    }

    // Detect tabs. We assume that every continguous series of buttons all with
    // the CSS_WUI_TAB class belong to a single tab bar.
    if (!tabs && wireless.dom.hasClass(buttonDiv,
        wireless.ui.ButtonGroup.TAB_CLASS)) {
      tabs = new wireless.ui.ButtonGroup();
      tabParent = buttonDiv.parentNode;
    }
    // Detect the end of a tab bar.
    if (tabs && (tabParent != buttonDiv.parentNode ||
        !wireless.dom.hasClass(buttonDiv, wireless.ui.ButtonGroup.TAB_CLASS))) {
      tabs = null;
    }

    var button;
    if (pill || tabs ||
        wireless.dom.hasClass(buttonDiv, wireless.ui.Button.STICKY_CLASS_)) {
      button = new wireless.ui.StickyButton(buttonDiv,
          /* onclick */ undefined, disableTouchEvents);
      if (pill) {
        pill.addButton(button);
      }
      if (tabs) {
        tabs.addButton(button);
      }
    } else {
      button = new wireless.ui.Button(buttonDiv, /* onclick */ undefined,
          disableTouchEvents);
    }
    if (pill && wireless.dom.hasClass(buttonDiv,
        wireless.ui.ButtonGroup.PILL_RIGHT_CLASS)) {
      pill = null;
    }
    buttons.push(button);
  }
  return buttons;
};


/**
 * @param {!Element} element
 * @return {!wireless.ui.Button|undefined} The button wrapping the element, if
 *     one could be found.
 */
wireless.ui.Button.getButtonFromElement = function(element) {
  return /** @type {!wireless.ui.Button|undefined} */ (
      element[wireless.ui.Button.SAVED_BUTTON_PROPERTY_]);
};


/**
 * The function to be called when a click action is recognized.
 * @type {function(this:wireless.ui.Button, Event)}
 */
wireless.ui.Button.prototype.onclick;


/**
 * Handler for the long click action. A long click happens when the user holds
 * down the button for a while. If a long click has been fired, no regular click
 * will be fired anymore when the user releases the button. By default no long
 * click behaviour is defined.
 *
 * An example of long click behaviour is to show a context menu.
 * @type {function(this:wireless.ui.Button)|undefined}
 */
wireless.ui.Button.prototype.onlongclick;


/**
 * The spinner currently displayed on the button, if any.
 * @private {!wireless.Spinner|undefined}
 */
wireless.ui.Button.prototype.spinner_;


/**
 * The button's control type, if known. The control type is parsed lazily from
 * the outer element's onclick attribute. Thus, this property will be undefined
 * until the first time getControlType() is called. If we have tried to parse
 * the control type and failed, the value will be set to null.
 * @private {string|null|undefined}
 */
wireless.ui.Button.prototype.controlType_;


/**
 * The button's extraEventArgument, if known and provided. The extra event
 * argument is parsed lazily from the outer element's onclick attribute. Thus,
 * this propery will be undefined until the first time getControlId() is called.
 * If we have tried to parse the extra event argument and failed, the value will
 * be set to null.
 * @private {string|null|undefined}
 */
wireless.ui.Button.prototype.extraEventArgument_;


/**
 * The inner element containing the button's label or icon.
 * @private {Element}
 */
wireless.ui.Button.prototype.innerElement_;


/**
 * Whether to use the click event instead of touch events for determining
 * whether a click action has occurred.
 * @private {boolean}
 */
wireless.ui.Button.prototype.useClickEvent_;


/**
 * The x coordinate where the interaction started.
 * @private {number}
 */
wireless.ui.Button.prototype.touchStartX_;


/**
 * The y coordinate where the interaction started.
 * @private {number}
 */
wireless.ui.Button.prototype.touchStartY_;


/**
 * Whether an interaction is in progress.
 * @private {boolean|undefined}
 */
wireless.ui.Button.prototype.isLive_;


/**
 * Whether move and end event listeners have been added to the button. These are
 * deferred until the first touchstart in order to reduce construction cost.
 * @private {boolean|undefined}
 */
wireless.ui.Button.prototype.listenersAdded_;


/**
 * Bound instance of the setPressed_(false) method that is created lazily.
 * @private {function()|undefined}
 */
wireless.ui.Button.prototype.boundSetPressedFalse_;


/**
 * The callback for setUseClick that is called after a click event is received
 * that should be used to set focus.
 * @private {function()|undefined}
 */
wireless.ui.Button.prototype.onRealClickCallback_;


/**
 * Bound instance of the resetState_(false) method that is created lazily.
 * @private {function()|undefined}
 */
wireless.ui.Button.prototype.boundResetStateFalse_;


/**
 * Tests whether the button is currently displaying a spinner.
 * @return {boolean} True if a spinner is present.
 */
wireless.ui.Button.prototype.hasSpinner = function() {
  return !!this.spinner_;
};


/**
 * Shows or hides a spinner on the button. When shown, the spinner replaces the
 * button's inner element.
 * @param {boolean} spinner Whether the spinner should be shown or hidden.
 */
wireless.ui.Button.prototype.setSpinner = function(spinner) {
  if (spinner == this.hasSpinner()) {
    return;
  }

  if (spinner) {
    // Force the button to preserve its current width so that it does not shrink
    // when the spinner appears.
    var style = wireless.style.getComputedStyle(this.element_);
    this.element_.style.width = this.element_.offsetWidth -
        style.borderLeftWidth.split('px')[0] -
        style.borderRightWidth.split('px')[0] + 'px';
    this.spinner_ = new wireless.Spinner(/* canvas */ undefined,
        wireless.ui.Button.getSpinnerColor());
    var spinnerNode = this.spinner_.getNode();
    spinnerNode.className = goog.getCssName('CSS_WUI_BUTTON_INNER');
    this.element_.appendChild(spinnerNode);
    goog.style.setElementShown(this.getInnerElement(), false);
    this.spinner_.start();
  } else {
    this.spinner_.stop();
    this.element_.removeChild(this.spinner_.getNode());
    this.spinner_ = undefined;
    this.element_.style.width = '';
    goog.style.setElementShown(this.getInnerElement(), true);
  }
};


/**
 * Gets the color to use for the spinner inside a button, or undefined if the
 * default spinner color should be used instead.
 * @return {Array.<number>|undefined} The rgb color to use, or undefined to let
 *     the spinner use its default.
 */
wireless.ui.Button.getSpinnerColor = goog.nullFunction;


/**
 * Gets the button's outer element, which contains the id and onclick handler.
 * @return {!Element} The outer element.
 */
wireless.ui.Button.prototype.getElement = function() {
  return /** @type {!Element} */ (this.element_);
};


/**
 * Gets the inner element containing the button's label or icon.
 * @return {!Element} The inner element.
 */
wireless.ui.Button.prototype.getInnerElement = function() {
  goog.asserts.assert(this.innerElement_, 'Inner div not found.');
  return this.innerElement_;
};


/**
 * Gets the button's control type.
 * @return {?string} The control type, or null if either the button has no
 * control type or the control type could not be determined.
 */
wireless.ui.Button.prototype.getControlType = function() {
  // We need to distinguish between controlType_ being undefined, which means we
  // have not tried to parse the control type yet, and controlType_ being null,
  // which means we already tried to parse the control type and failed. Since we
  // do not expect the onclick attribute to change after a button is first
  // created, we never retry parsing after a failure.
  if (!goog.isDef(this.controlType_)) {
    this.parseControlTypeAndExtraEventArgument_();
  }

  // This cast is required since the parse function ensures that controlType_ is
  // null or a string but the compiler doesn't know this.
  return /** @type {?string} */ (this.controlType_);
};


/**
 * Gets the button's extra event argument if it exists in its serialized form.
 * Specifically it will be returned as a string which if evalfed will evaluate
 * to the value of the extraEventArgument. For example, if the argument is a
 * string a string including quotes will be returned.
 * @return {?string} The extra event argument if it exists and can be
 *     determined, null otherwise.
 */
wireless.ui.Button.prototype.getExtraEventArgumentSerialized = function() {
  // Call get control type here to ensure that the extraEventArgument_ field is
  // populated.
  this.getControlType();

  // This cast is required since getControlType ensures that extraEventArgument
  // will be null or a string but the compiler does not know this.
  return /** @type {?string} */ (this.extraEventArgument_);
};


/**
 * Sets the label on a text button to the given value. The new label will be
 * HTML escaped before it is applied. This function must only be called on text
 * buttons; attempting to call it on an image button will result in an assertion
 * failure.
 * @param {string} label The new label.
 */
wireless.ui.Button.prototype.setLabelText = function(label) {
  goog.asserts.assert(wireless.dom.hasClass(this.getInnerElement(),
      wireless.ui.Button.LABEL_CLASS_), 'Cannot set label: not a text button.');
  wireless.dom.setText(this.getInnerElement(), label);
};


/**
 * Sets the label on a text button to the given value. No escaping is performed.
 * This function must only be called on text buttons; attempting to call it on
 * an image button will result in an assertion failure.
 * @param {string} labelHtml The new label.
 */
wireless.ui.Button.prototype.setLabelHtml = function(labelHtml) {
  goog.asserts.assert(wireless.dom.hasClass(this.getInnerElement(),
      wireless.ui.Button.LABEL_CLASS_), 'Cannot set label: not a text button.');
  this.getInnerElement().innerHTML = labelHtml;
};


/**
 * Gets the button's enabled state.
 * @return {boolean} True if the button is enabled, false if disabled.
 */
wireless.ui.Button.prototype.isEnabled = function() {
  return !wireless.dom.hasClass(this.element_,
      wireless.ui.Button.DISABLED_CLASS_);
};


/**
 * Sets whether the button is enabled or not. A disabled button does not respond
 * to any events. If the user is in the middle of pressing the button when it
 * becomes disabled, that press will not count.
 * @param {boolean|undefined} enabled True to enable the button, false to
 *    disable.
 */
wireless.ui.Button.prototype.setEnabled = function(enabled) {
  wireless.dom.toggleClass(this.element_, enabled,
      wireless.ui.Button.ENABLED_CLASS_,
      wireless.ui.Button.DISABLED_CLASS_);
  wireless.dom.toggleClass(this.getInnerElement(), enabled,
      wireless.ui.Button.ENABLED_CLASS_,
      wireless.ui.Button.DISABLED_CLASS_);
  this.resetState_(true /* opt_dontSetPressed */);
  // If the button is in the middle of being highlighted for a click event, let
  // it sit for 200ms before unsetting it.
  window.setTimeout(this.getBoundSetPressedFalse_(), 200);
};


/**
 * Sets whether the button is visible or not.
 * @param {boolean} display True to show the button, false to hide.
 */
wireless.ui.Button.prototype.setDisplay = function(display) {
  goog.style.setElementShown(this.element_, display);
};


/**
 * Sets whether the button responds to click events instead of touch events.
 * This value can also be set in the constructor. Its default value is false
 * because we prefer using touch events when possible (they are faster). Using
 * click events may be necessary when:
 * - Your callback calls focus on an element. Focusing only works in the context
 *   of a click event.
 * - Your callback is calling window.open. On the Android browser, window.open
 *   only works in the context of a click event.
 * If your callback is focusing an element then you can get a more responsive
 * button by providing an onFocusCallback. This will result in the regular
 * callback being called on touchend, then the onFocus callback being called
 * with the subsequent click event. This allows for your button to, for
 * example, change the UI immediately then show the keyboard a short period of
 * time later.
 * @param {boolean} enable True iff button should use click events.
 * @param {function()=} opt_onRealClickCallback_ The function to be called when
 *     the click event occurs and focus can be set on elements.
 */
wireless.ui.Button.prototype.setUseClick =
    function(enable, opt_onRealClickCallback_) {
  if (opt_onRealClickCallback_) {
    goog.asserts.assert(enable, 'A focus callback can only be used when ' +
        'click events are being used.');
    goog.asserts.assert(!this.disableAutomaticGhostClickPrevention_,
        'Automatic ghost click prevention must not be disabled when a focus ' +
        'callback is provided.');
  }
  this.useClickEvent_ = enable;
  this.onRealClickCallback_ = opt_onRealClickCallback_;
};


/**
 * Prevent a ghost click at the touch start position. This only needs to be
 * called if automatic ghost click prevent is disabled.
 * @param {!Event} event An event object.
 */
wireless.ui.Button.prototype.preventGhostClick = function(event) {
  if (event.type == wireless.events.touch.END_EVENT) {
    // Calling preventDefault will stop the ghost click from coming on some
    // browsers (E.g. the PlayBook). Hopefully more browsers will also start
    // doing this. Note, however, that if a focus callback is provided we
    // actually use the resulting click event.
    //  Consider creating an MDL rule for this 'feature' and
    // don't even use clickbuster if it is not required. Needs quite a bit of
    // testing with devices.
    if (!this.onRealClickCallback_) {
      event.preventDefault();
    }

    goog.log.info(goog.log.getLogger('button'), 'prevent ghost click');
    wireless.events.clickbuster.preventGhostClickWithEvent(this.touchStartX_,
        this.touchStartY_, event, this.onRealClickCallback_);
  }
};


/**
 * Attempts to parse the control type and extra event argument from a buttons
 * outer element onclick handler.  One or both of these fields will be null if
 * they are not present or in the wrong format.
 * @private
 */
wireless.ui.Button.prototype.parseControlTypeAndExtraEventArgument_ =
    function() {
  // We need to use getAttribute('onclick') here rather than .onclick because
  // fastbutton modifies the onclick handler of the button. We are interested in
  // the original value of the attribute as created in the Soy template, not the
  // fastbutton handler.
  var match = wireless.ui.Button.ONCLICK_PARSE_REGEX_.exec(
      this.element_.getAttribute('onclick'));

  // We need to return null rather than undefined if the match fails, because
  // this will be used as a signal to avoid retrying the parse the next time the
  // control type is needed.
  this.controlType_ = match ? match[1] : null;
  this.extraEventArgument_ = match && match[2] ? match[2] : null;
};


/**
 * Handler for the touchstart event.
 * @param {!TouchEvent} event A touch event.
 * @private
 */
wireless.ui.Button.prototype.onButtonTouchStart_ = function(event) {
  // Multi touch is not supported.
  if (wireless.events.touch.getTouchCount(event) > 1 || !this.isEnabled()) {
    return;
  }

  // Prevent an instance of Button attached to a parent element from handling
  // the event again. Note that we should not stop event propagation because
  // this will prevent swipe and drag behaviour on the button. Also note that
  // the default action should not be prevented for touchstart as that would
  // make it impossible to initiate a scroll action from this button.
  if (event.handledByWuiButton) {
    return;
  }
  event.handledByWuiButton = true;

  this.isLive_ = true;

  if (!this.listenersAdded_) {
    // Install the touch handlers when touch events are not disabled, or
    // the button is using click events and a focus callback is provided.

    var useTouchEvents = !this.useClickEvent_ || this.onRealClickCallback_;
    var endFn = goog.bind(useTouchEvents ? this.onButtonClick_ :
        this.delayedResetState_, this);
    var cancelFn = goog.bind(useTouchEvents ? this.resetStateCallback_ :
        this.delayedResetState_, this);
    if (!wireless.events.touch.SUPPORTS_TOUCHES) {
      endFn = wireless.events.touch.mouseToTouchCallback(endFn);
      cancelFn = wireless.events.touch.mouseToTouchCallback(cancelFn);
    }

    this.element_.addEventListener(wireless.events.touch.END_EVENT,
        endFn, false);
    this.element_.addEventListener(wireless.events.touch.CANCEL_EVENT,
        cancelFn, false);

    var moveFn = goog.bind(this.onButtonTouchMove_, this);
    if (!wireless.events.touch.SUPPORTS_TOUCHES) {
      moveFn = wireless.events.touch.mouseToTouchCallback(moveFn);
    }
    this.element_.addEventListener(wireless.events.touch.MOVE_EVENT,
        moveFn, false);
    this.listenersAdded_ = true;
  }

  this.maybeScheduleLongClick_();

  this.setPressed_(true);

  var coord = wireless.events.touch.getClientCoordinate(
      wireless.events.touch.getTouches(event)[0]);
  this.touchStartX_ = coord.x;
  this.touchStartY_ = coord.y;
};


/**
 * Handler for the click event.
 * @param {Event} event An event object.
 * @private
 */
wireless.ui.Button.prototype.onButtonClick_ = function(event) {
  goog.asserts.assert(event, 'Event must be provided.');
  if (!this.isEnabled()) {
    return;
  }

  // If we are reacting to touch events, we do not want the click event that
  // the browser fires later to have any effect.
  if (!this.disableAutomaticGhostClickPrevention_) {
    this.preventGhostClick(event);
  }

  // Also check motion tolerence in the touchend, since there could have been
  // additional movement.
  this.resetIfTouchExceedsMotionTolerance_(
      wireless.events.touch.getChangedTouches(event)[0]);

  // The gesture that generated a touchend event could have been initiated
  // outside of the button, so make sure the button is actively handling an
  // interaction. In contrast, a valid click event can occur without any prior
  // events being fired, so it should always be handled.
  if (event.type == wireless.events.touch.END_EVENT && !this.isLive_) {
    return;
  }

  // Prevent an instance of Button attached to a parent element from handling
  // the event again.
  if (event.handledByWuiButton) {
    return;
  }
  event.handledByWuiButton = true;

  // We set the pressed state and then immediately remove it asynchronously in
  // order to give the user some feedback that the touch was recognized. The
  // pressed state will be visible for the entire time that the onclick handler
  // is executing.
  this.setPressed_(true);
  window.setTimeout(this.getBoundSetPressedFalse_(), 0);

  // Reset most of the state synchronously, before invoking the onclick handler.
  // This protects against the following problem: if the onclick handler takes a
  // long time to execute, we may end up firing both a click and a long click
  // event for even a short touch, because the long click timer is cleared only
  // in resetState_().
  this.resetState_(/* opt_dontSetPressed */ true);

  // The element that was touched is focusable because it has tabindex = "0".
  // It must be blurred after being clicked otherwise it will retain focus.
  // Note that this must occur before the onclick handler is called because the
  // handler may cause an element to be focused and this will just remove focus
  // from that element.
  if (this.blurOnClick_(event)) {
    wireless.events.blurFocusedElement();
  }

  this.fireButtonClick(event);
};


/**
 * Click handler to call the underlying onclick property for child classes to
 * override and add their own functionality.
 * @param {Event} event An event object.
 * @protected
 */
wireless.ui.Button.prototype.fireButtonClick = function(event) {
  if (this.onclick) {
    this.onclick(event);
  }
};


/**
 * Determines if an event that caused a click on the button should cause the
 * button to be blurred. The button should always lose focus unless it was
 * activated by the keyboard. This is required so that native tab focus is
 * retained and the user doesn't have to re-tab to get to the button after
 * pressing it.
 * @param {!Event} event An event object.
 * @return {boolean} True if button should blur, false if button 'click' was
 *     caused by keyboard.
 * @private
 */
wireless.ui.Button.prototype.blurOnClick_ = function(event) {
  var keyCode = event.keyCode;
  return keyCode != goog.events.KeyCodes.ENTER &&
      keyCode != goog.events.KeyCodes.SPACE;
};


/**
 * Handles the touchmove event on the button. Ensures that no short or
 * long touches are executed if the user is moving a lot, for example scrolling
 * the page.
 * @param {!TouchEvent} event A touch event.
 * @private
 */
wireless.ui.Button.prototype.onButtonTouchMove_ = function(event) {
  // If reset has already been called then we can just exit the function.
  if (!this.isLive_) {
    return;
  }

  // Multi touch is not supported.
  // If we're using click events, always reset on the first touchmove event.
  if (wireless.events.touch.getTouchCount(event) > 1 || this.useClickEvent_) {
    this.resetState_();
    return;
  }

  // As of March 2014, non-safari browsers do supress slop touch
  // moves. As a result reset the button on the first touchmove.
  // go/touch-event-behavior-details-across-browsers
  if (wireless.device.browserSupressesSlopTouchMoves()) {
    this.resetState_();
    return;
  }

  this.resetIfTouchExceedsMotionTolerance_(
      wireless.events.touch.getTouches(event)[0]);
};


/**
 * Resets the button state if the given touch is outside of the current touch
 * sequence's motion tolerence.
 * @param {Touch} touch
 * @private
 */
wireless.ui.Button.prototype.resetIfTouchExceedsMotionTolerance_ =
    function(touch) {
  if (!touch) {
    return;
  }

  if (goog.isNumber(touch.clientX) && goog.isNumber(touch.clientY) && (
      !goog.math.nearlyEquals(touch.clientX, this.touchStartX_,
                              wireless.ui.Button.MOTION_TOLERANCE_) ||
      !goog.math.nearlyEquals(touch.clientY, this.touchStartY_,
                              wireless.ui.Button.MOTION_TOLERANCE_))) {
    this.resetState_();
  }
};


/**
 * For useOnClick buttons, on touchend/cancel we need to resetState
 * after a delay since we don't know if a onclick event will follow
 * this event or not. We need the setPressed(true) from the touchstart
 * to carry over to the onclick because the setPressed(true) in onclick
 * won't render until after the onclick handler has finished (which looks
 * bad for alerts).
 * @param {!Event} event An event object.
 * @private
 */
wireless.ui.Button.prototype.delayedResetState_ =
    function(event) {
  if (!this.boundResetStateFalse_) {
    this.boundResetStateFalse_ = goog.bind(this.resetState_, this, false);
  }
  window.setTimeout(this.boundResetStateFalse_,
      wireless.ui.Button.SET_USE_CLICK_RESET_PRESSED_STATE_DELAY_);
};


/**
 * Wrapper function for resetState_ so that it can be called as an event
 * handler without the event object being misinterpreted as the
 * opt_dontSetPressed parameter.
 * @param {!Event} event An event object.
 * @private
 */
wireless.ui.Button.prototype.resetStateCallback_ =
    function(event) {
  this.resetState_(false);
};


/**
 * Does some cleanup so the button is ready to be used again.
 * @param {boolean=} opt_dontSetPressed If true, the call to setPressed(false)
 *     will be suppressed. In this case, it is the caller's responsibility to
 *     ensure that the pressed state gets cleared.
 * @private
 */
wireless.ui.Button.prototype.resetState_ = function(opt_dontSetPressed) {
  window.clearTimeout(this.longClickTimer_);
  if (!opt_dontSetPressed) {
    this.setPressed_(false);
  }
  this.isLive_ = false;
};


/**
 * Sets the pressed state by adding or removing the pressed class.
 * @param {boolean} pressed Whether the pressed class must be added or removed.
 * @private
 */
wireless.ui.Button.prototype.setPressed_ = function(pressed) {
  wireless.dom.toggleClass(this.element_, pressed,
      wireless.ui.Button.PRESSED_CLASS_);
  if (this.innerElement_) {
    wireless.dom.toggleClass(this.innerElement_, pressed,
        wireless.ui.Button.PRESSED_CLASS_);
  }
};


/**
 * Returns the bound setPressed_(false) method. Binds it if necessary.
 * @return {function()} The bound method.
 * @private
 */
wireless.ui.Button.prototype.getBoundSetPressedFalse_ = function() {
  if (!this.boundSetPressedFalse_) {
    this.boundSetPressedFalse_ = goog.bind(this.setPressed_, this, false);
  }
  return this.boundSetPressedFalse_;
};


/**
 * If there is one, schedules the long click action to be executed after a
 * delay.
 * @private
 */
wireless.ui.Button.prototype.maybeScheduleLongClick_ = function() {
  if (!this.onlongclick) {
    return;
  }

  this.longClickTimer_ = window.setTimeout(goog.bind(function() {
    this.isLive_ = false;
    this.onlongclick();
  }, this), this.getLongClickDelay_());
};


/**
 * Gets the time in milliseconds after an interaction starts at which the long
 * click action should be called.
 * @return {number} The delay in milliseconds.
 * @private
 */
wireless.ui.Button.prototype.getLongClickDelay_ = function() {
  //  Try clearing the long click timer in the touchend
  // event so that this delay does not need to be increased. The click event is
  // used for executing the click handler but the touchend event can still be
  // usd for other things.
  return this.useClickEvent_ ?
      wireless.ui.Button.LONG_CLICK_DELAY_FOR_CLICK_EVENTS_ :
      wireless.ui.Button.LONG_CLICK_DELAY_;
};



/**
 * Touch button that additionally maintains an active state.
 * @param {!Element} element The element to be used as a button.
 * @param {function()=} opt_onclick The function to call when a click is
 *     detected. By default the onclick handler attached to the button element
 *     is used.
 * @param {boolean=} opt_disableTouchEvents Use click instead of touch events.
 * @constructor
 * @extends {wireless.ui.Button}
 */
wireless.ui.StickyButton = function(element, opt_onclick,
    opt_disableTouchEvents) {
  goog.base(this, element, goog.bind(this.handleClick_, this,
      opt_onclick || /** @type {function()} */ (element.onclick)),
      opt_disableTouchEvents);

  /**
   * Active class to add to the inner element along with
   * StickyButton.ACTIVE_CLASS.
   * @type {?string}
   * @private
   */
  this.extraActiveClass_ = null;
};
goog.inherits(wireless.ui.StickyButton, wireless.ui.Button);


/**
 * CSS class to apply to the button when active.
 * @type {string}
 * @const
 */
wireless.ui.StickyButton.ACTIVE_CLASS = goog.getCssName('CSS_WUI_ACTIVE');


/**
 * The group to which this button belongs, if any.
 * @type {wireless.ui.ButtonGroup|undefined}
 * @private
 */
wireless.ui.StickyButton.prototype.group_;


/**
 * Sets an extra css class to be added for the StickyButton's active state.
 * Will be used in addition to the default active class for the inner element.
 * Set null to use the default class only.
 * @param {?string} extraActiveClass Extra class to use for active state.
 */
wireless.ui.StickyButton.prototype.setExtraActiveClass =
    function(extraActiveClass) {
  if (this.isActive()) {
    if (this.extraActiveClass_) {
      var newClass = extraActiveClass || '';
      // If active, swap the current extra active class for the new class.
      wireless.dom.toggleClass(this.getInnerElement(), false /* useFirst */,
          this.extraActiveClass_, newClass);
    } else if (extraActiveClass) {
      // Add new extra active class is none already exists.
      wireless.dom.toggleClass(this.getInnerElement(), true /* useFirst */,
          extraActiveClass);
    }
  }
  this.extraActiveClass_ = extraActiveClass;
};


/**
 * Sets the button's active state.
 * @param {boolean} active Whether the button should be active.
 */
wireless.ui.StickyButton.prototype.setActive = function(active) {
  if (active && this.group_) {
    // At most one button in a group can be active at any time.
    this.group_.clearActive(this);
  }
  wireless.dom.toggleClass(this.element_, active,
      wireless.ui.StickyButton.ACTIVE_CLASS);
  wireless.dom.toggleClass(this.getInnerElement(), active,
      wireless.ui.StickyButton.ACTIVE_CLASS);
  if (this.extraActiveClass_) {
    wireless.dom.toggleClass(this.getInnerElement(), active,
        this.extraActiveClass_);
  }
  //this.getElement().setAttribute('aria-pressed', active);
};


/**
 * Gets the button's active state.
 * @return {boolean} Whether the button is active.
 */
wireless.ui.StickyButton.prototype.isActive = function() {
  return wireless.dom.hasClass(this.element_,
      wireless.ui.StickyButton.ACTIVE_CLASS);
};


/**
 * Sets the button group to which this button belongs. Changes to the active
 * state of this button will be propagated to other buttons in the group.
 * @param {!wireless.ui.ButtonGroup} group The group.
 */
wireless.ui.StickyButton.prototype.setGroup = function(group) {
  this.group_ = group;
};


/**
 * Handles a click event on the button.
 * @param {function(Event)} clientHandler Client function to call when a click
 *     occurs.
 * @param {!Event} nativeEvent The click event from the browser.
 * @private
 */
wireless.ui.StickyButton.prototype.handleClick_ = function(clientHandler,
    nativeEvent) {
  var isActive = this.isActive();
  if (this.group_) {
    // For grouped buttons, clicking the active button reactivates
    // rather than deactivates.
    this.setActive(true);
  } else {
    this.setActive(!isActive);
  }

  if (clientHandler) {
    clientHandler(nativeEvent);
  }
};



/**
 * Collection of two or more touch buttons that are logically grouped together.
 * At most one button in a button group may be active at any time; setting any
 * button in a group to active will automatically reset all other buttons in
 * that group to inactive.
 * @constructor
 */
wireless.ui.ButtonGroup = function() {
  /**
   * The buttons in the group.
   * @type {!Array.<!wireless.ui.Button>}
   * @private
   */
  this.buttons_ = [];
};


/**
 * The CSS class applied to the left button in a pill.
 * @type {string}
 * @const
 */
wireless.ui.ButtonGroup.PILL_LEFT_CLASS =
    goog.getCssName('CSS_WUI_BUTTON_PILL_LEFT_MARKER');


/**
 * The CSS class applied to the right button in a pill.
 * @type {string}
 * @const
 */
wireless.ui.ButtonGroup.PILL_RIGHT_CLASS =
    goog.getCssName('CSS_WUI_BUTTON_PILL_RIGHT_MARKER');


/**
 * The CSS class applied to a tab bar button.
 * @type {string}
 * @const
 */
wireless.ui.ButtonGroup.TAB_CLASS = goog.getCssName('CSS_WUI_TAB_MARKER');


/**
 * Creates a new ButtonGroup representing a pill button. The group contains all
 * of the buttons found in between the first left pill button in container and
 * the closest right pill button sibling. If there are multiple pill groups
 * within container, only the first one will be found. Button objects are
 * created for each button within the pill group.
 * @param {Element} container The container to search.
 * @param {boolean=} opt_disableTouchEvents Use click instead of touch events.
 * @return {!wireless.ui.ButtonGroup} The created ButtonGroup.
 */
wireless.ui.ButtonGroup.decoratePill = function(container,
    opt_disableTouchEvents) {
  var buttonDiv = wireless.dom.getFirstElementByClassName(
      wireless.ui.ButtonGroup.PILL_LEFT_CLASS, container);
  goog.asserts.assert(buttonDiv, 'Left pill button not found.');

  var pill = new wireless.ui.ButtonGroup();
  while (buttonDiv) {
    goog.asserts.assert(wireless.dom.hasClass(buttonDiv,
        wireless.ui.Button.BUTTON_CLASS),
        'Non-button found between left and right pill buttons.');

    pill.addButton(new wireless.ui.StickyButton(buttonDiv,
        /* opt_onclick */ undefined, opt_disableTouchEvents));

    if (wireless.dom.hasClass(buttonDiv,
        wireless.ui.ButtonGroup.PILL_RIGHT_CLASS)) {
      break;
    }
    buttonDiv = /** @type {Element} */ (buttonDiv.nextSibling);
  }
  return pill;
};


/**
 * Creates a new ButtonGroup representing a tab bar. The group contains all
 * of the buttons found in between the first tab in container and the last tab
 * button sibling in a contiguous group. If there are multiple tab bars within
 * container, only the first one will be found. Button objects are created for
 * each button within the tab bar.
 * @param {Element} container The container to search.
 * @param {boolean=} opt_disableTouchEvents Use click instead of touch events.
 * @return {!wireless.ui.ButtonGroup} The created ButtonGroup.
 */
wireless.ui.ButtonGroup.decorateTabBar = function(container,
    opt_disableTouchEvents) {
  var buttons = wireless.dom.getElementsByClassName(
      wireless.ui.ButtonGroup.TAB_CLASS, container);
  goog.asserts.assert(buttons && buttons.length, 'No tab buttons found.');

  var tabs = new wireless.ui.ButtonGroup();
  for (var i = 0, button; button = buttons[i]; i++) {
    goog.asserts.assert(wireless.dom.hasClass(button,
        wireless.ui.Button.BUTTON_CLASS),
        'Non-button found in tab bar.');

    tabs.addButton(new wireless.ui.StickyButton(button,
        /* opt_onclick */ undefined, opt_disableTouchEvents));
  }
  return tabs;
};


/**
 * Adds a button to the group.
 * @param {!wireless.ui.StickyButton} button The button to add.
 */
wireless.ui.ButtonGroup.prototype.addButton = function(button) {
  this.buttons_.push(button);
  button.setGroup(this);
};


/**
 * Gets a button from the group by index. Buttons are indexed starting from 0 in
 * the order in which they were added to the group.
 * @param {number} index The desired button index.
 * @return {!wireless.ui.Button} The button at that index.
 */
wireless.ui.ButtonGroup.prototype.getButton = function(index) {
  return this.buttons_[index];
};


/**
 * Sets the active state of every button in the group to false, except for the
 * given button (if any).
 * @param {wireless.ui.Button=} opt_activeButton A button that is about to be
 *     set to active and therefore should not have its active state modified by
 *     this function.
 * @protected
 */
wireless.ui.ButtonGroup.prototype.clearActive = function(opt_activeButton) {
  for (var i = 0, button; button = this.buttons_[i]; ++i) {
    if (button != opt_activeButton) {
      button.setActive(false);
    }
  }
};
