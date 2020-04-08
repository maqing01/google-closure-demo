goog.provide('office.controller.BrowserFocusManager');

goog.require('office.controller.FocusManager');
goog.require('office.controller.FocusState');
goog.require('office.controller.ServiceId');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.userAgent');



/**
 * @param {office.controller.FocusState} defaultState
 * @param {boolean=} opt_ignoreWindowFocus True to not handle window focus and
 *     blur events. In this case, the distinction between NOTHING and EDITOR
 *     states is lost.
 * @param {!Node=} opt_windowTarget The window target to use instead of the
 *     global one.
 * @constructor
 * @struct
 * @extends {office.controller.FocusManager}
 */
office.controller.BrowserFocusManager = function(
    defaultState, opt_ignoreWindowFocus, opt_windowTarget) {
  goog.base(this);

  /** @private {office.controller.FocusState} */
  this.defaultState_ = defaultState;

  /**
   * @private {!goog.events.EventHandler.<
   *     !office.controller.BrowserFocusManager>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /** @private {boolean} */
  this.isWindowFocused_ = true;

  /**
   * Whether we are currently in a call to setState.
   * This is used to prevent the flood of browser events fired when we modify
   * the browser focus from triggering superfluous FocusStateChange events.
   * @private {boolean}
   */
  this.settingState_ = false;

  //  Figure out a way to maintain all three focus states
  // properly in the punch viewer.
  if (!opt_ignoreWindowFocus) {
    var windowTarget;
    if (opt_windowTarget) {
      windowTarget = opt_windowTarget;
    } else if (goog.userAgent.WEBKIT) {
      windowTarget = window;
    } else {
      windowTarget = document.body;
    }

    if (goog.userAgent.GECKO && windowTarget.tagName.toLowerCase() == 'body') {
      windowTarget = windowTarget.ownerDocument;
    }

    windowTarget[office.controller.BrowserFocusManager.FOCUS_EVENT_NAME] =
        goog.bind(this.handleWindowFocus_, this);
    windowTarget[office.controller.BrowserFocusManager.BLUR_EVENT_NAME] =
        goog.bind(this.handleWindowBlur_, this);
  }
};
goog.inherits(office.controller.BrowserFocusManager,
    office.controller.FocusManager);


/**
 * The focus event name.
 * @type {string}
 * @protected
 */
office.controller.BrowserFocusManager.FOCUS_EVENT_NAME =
    goog.userAgent.IE && !goog.userAgent.isVersionOrHigher('10.0') ?
        'onfocusin' : 'onfocus';


/**
 * The blur event name.
 * @type {string}
 * @protected
 */
office.controller.BrowserFocusManager.BLUR_EVENT_NAME =
    goog.userAgent.IE && !goog.userAgent.isVersionOrHigher('10') ?
        'onfocusout' : 'onblur';


/** @override */
office.controller.BrowserFocusManager.prototype.logger =
    goog.log.getLogger('office.controller.BrowserFocusManager');


/**
 * @return {!goog.events.EventHandler}
 * @protected
 */
office.controller.BrowserFocusManager.prototype.getEventHandler = function() {
  return this.eventHandler_;
};


/** @override */
office.controller.BrowserFocusManager.prototype.setState = function(
    state, opt_reason) {
  if (this.settingState_) {
    //  Wire up ErrorReporter in FocusManager, report as error.
    goog.log.warning(this.logger,
        'setState() called while handling event fired from setState().');
  }
  var oldSettingState = this.settingState_;
  this.settingState_ = true;
  office.controller.BrowserFocusManager.base(this, 'setState', state, opt_reason);
  this.settingState_ = oldSettingState;
};


/**
 * Update the focus state based on a browser focus event. This will not fire a
 * state change event if we are in the middle of modifying the browser focus.
 * Depending on state (current focus state, dialog open, etc), the resultant
 * state might not be set. For example, if a dialog is open and the state is set
 * to office.controller.FocusState.EDITOR, the new state will be ignored and the
 * text event target will not be focused.
 * @param {office.controller.FocusState} state The new focus state.
 * @protected
 */
office.controller.BrowserFocusManager.prototype.updateStateFromBrowser = function(
    state) {
  goog.log.info(this.logger, 'updateStateFromBrowser(' + state + ')');
  if (this.setStateInternal(state) && !this.settingState_) {
    // Don't dispatch any event unless the focus state has actually changed AND
    // we are not in the middle of modifying it.
    this.dispatchStateChangeEvent();
  }
};


/**
 * Whether the window is focused.
 * @return {boolean} Whether the window is focused.
 * @protected
 */
office.controller.BrowserFocusManager.prototype.isWindowFocused = function() {
  return this.isWindowFocused_;
};


/**
 * Handles the window focus event.
 * @param {!goog.events.Event} e The event.
 * @private
 */
office.controller.BrowserFocusManager.prototype.handleWindowFocus_ = function(e) {
  goog.log.info(this.logger, 'handleWindowFocus_()');
  this.isWindowFocused_ = true;
  this.updateStateFromBrowser(this.defaultState_);
};


/**
 * Handles the window focus event.
 * @param {!goog.events.Event} e The event.
 * @private
 */
office.controller.BrowserFocusManager.prototype.handleWindowBlur_ = function(e) {
  goog.log.info(this.logger, 'handleWindowBlur_()');
  this.isWindowFocused_ = false;
  this.updateStateFromBrowser(office.controller.FocusState.NOTHING);
};


/** @override */
office.controller.BrowserFocusManager.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  goog.base(this, 'disposeInternal');
};


/**
 * @param {!fava.AppContext} appContext The app context to register in.
 * @param {office.controller.FocusState} defaultState The default focus state.
 * @param {boolean=} opt_ignoreWindowFocus True to not handle window focus and
 *     blur events. In this case, the distinction between NOTHING and EDITOR
 *     states is lost.
 * @param {!Node=} opt_windowTarget The window target to use instead of the
 *     global one.
 * @return {!office.controller.BrowserFocusManager} The focus manager.
 */
office.controller.BrowserFocusManager.register = function(appContext,
    defaultState, opt_ignoreWindowFocus, opt_windowTarget) {
  var focusManager = new office.controller.BrowserFocusManager(
      defaultState, opt_ignoreWindowFocus, opt_windowTarget);
  appContext.registerService(office.controller.ServiceId.FOCUS_MANAGER,
      focusManager);
  return focusManager;
};
