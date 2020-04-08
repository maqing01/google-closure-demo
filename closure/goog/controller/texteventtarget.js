goog.provide('office.controller.TextEventTarget');

goog.require('office.controller.ImeInputConfiguration');
goog.require('office.util.CallOnceTracker');
goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.Role');
goog.require('goog.a11y.aria.State');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.DomHelper');
goog.require('goog.dom.Range');
goog.require('goog.dom.TagName');
goog.require('goog.dom.iframe');
goog.require('goog.editor.range');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.log');
goog.require('goog.style');
goog.require('goog.userAgent');
goog.require('goog.userAgent.product');
goog.require('office.crossContext.util');

/**
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @param {!office.controller.FocusManager} focusManager
 * @param {office.html.DomProcessor=} opt_domProcessor
 * @param {goog.dom.DomHelper=} opt_domHelper
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 * @implements {office.controller.ImeInputConfiguration}
 */
office.controller.TextEventTarget = function(
    errorReporter,
    focusManager,
    opt_domProcessor,
    opt_domHelper) {
  goog.base(this);

  var dom = opt_domHelper || goog.dom.getDomHelper();

  /**
   * The dom helper.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.dom_ = dom;

  /**
   * The error reporter.
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * @type {office.html.DomProcessor}
   * @private
   */
  this.domProcessor_ = opt_domProcessor || null;

  var attributes = {
    'className': office.controller.TextEventTarget.ClassName.IFRAME,
    'src': office.controller.TextEventTarget.IFRAME_BLANK_SOURCE_,
    'id':'office-input-iframe'//添加id用于自动化测试
  };

  attributes['scrolling'] = 'no';
  var targetIframe = dom.createDom(goog.dom.TagName.IFRAME, attributes);

  if (goog.userAgent.WEBKIT) {
    targetIframe.style['-webkit-nbsp-mode'] = 'normal';
  }

  /**
   * @type {!Element}
   * @private
   */
  this.targetIframe_ = targetIframe;

  /**
   * @type {!goog.events.EventHandler.<!office.controller.TextEventTarget>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /**
   * The tracker for timer calls.
   * @type {!office.util.CallOnceTracker}
   * @private
   */
  this.callOnceTracker_ = new office.util.CallOnceTracker();

  /**
   * Whether IME composition is active.
   * @type {boolean}
   * @private
   */
  this.isImeActive_ = false;

  if (!office.controller.TextEventTarget.SYNCHRONOUS_IFRAME_LOAD_) {
    this.eventHandler_.listen(this.targetIframe_,
        goog.events.EventType.LOAD, this.initialize_);
  }
  dom.getDocument().body.appendChild(targetIframe);
  if (office.controller.TextEventTarget.SYNCHRONOUS_IFRAME_LOAD_) {
    this.initialize_();
  }
};
goog.inherits(office.controller.TextEventTarget, goog.events.EventTarget);


/**
 * @enum {string}
 */
office.controller.TextEventTarget.EventType = {
  BLUR: 'blur',
  FOCUS: 'focus',
  INITIALIZE: 'initialize'
};


/**
 * CSS class names for the text event target.
 * @enum {string}
 */
office.controller.TextEventTarget.ClassName = {
  IFRAME: goog.getCssName('office-iframe-textinputeventtarget')
};


/**
 * Whether synchronous iframe load occurs. Webkit and Gecko do not trigger an
 * async load for the iframe so the target is initialized on creation.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.SYNCHRONOUS_IFRAME_LOAD_ =
    goog.userAgent.WEBKIT;


/**
 * The source of the blank iframe to create.
 * @type {string}
 * @private
 */
office.controller.TextEventTarget.IFRAME_BLANK_SOURCE_ = goog.dom.iframe.BLANK_SOURCE;


/**
 * The maximum number of times to attempt to reload the target iframe
 * before initialization fails entirely.
 * @type {number}
 * @private
 */
office.controller.TextEventTarget.MAX_IFRAME_RELOADS_ = 3;


/**
 * Whether iframe load failures should be retried.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.SHOULD_RETRY_ON_IFRAME_LOAD_FAILURE_ =
    !goog.userAgent.WEBKIT;


/**
 * A logger.
 * @type {goog.log.Logger}
 * @private
 */
office.controller.TextEventTarget.prototype.logger_ = goog.log.getLogger(
    'office.controller.TextEventTarget');


/**
 * Whether the keystroke receiving element is active. When it is active, it can
 * be focused and blurred as necessary. When it is inactive, it cannot be
 * focused.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.active_ = false;


/**
 * Whether the keystroke receiving element is visible.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.visible_ = true;


/**
 * Whether the text event target needs to be focused after it's been
 * initialized.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.focusOnInitialize_ = false;


//  Remove this once focusForKeyStrokes and focusAndSelect
// have been reconciled.
/**
 * Whether the text event target needs to be focused and selected after it's
 * been initialized.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.focusAndSelectOnInitialize_ = false;


/**
 * Whether the text event target has been initialized.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.initialized_ = false;


/**
 * The text event target window.
 * @type {Window}
 * @private
 */
office.controller.TextEventTarget.prototype.targetWindow_ = null;


/**
 * The text event target document.
 * @type {Document}
 * @private
 */
office.controller.TextEventTarget.prototype.targetDocument_ = null;


/**
 * The text event target body.
 * @type {Element?}
 * @private
 */
office.controller.TextEventTarget.prototype.targetBody_ = null;


/**
 * The DOM helper for the target iframe.
 * @type {goog.dom.DomHelper}
 * @private
 */
office.controller.TextEventTarget.prototype.frameDom_ = null;


/**
 * Whether the target has focus.
 * @type {boolean}
 * @private
 */
office.controller.TextEventTarget.prototype.hasFocus_ = false;


/**
 * The number of attempted reloads after an initialization failure.
 * @type {number}
 * @private
 */
office.controller.TextEventTarget.prototype.reloadAttempts_ = 0;


/**
 * @return {boolean} Whether the text event target has been initialized.
 */
office.controller.TextEventTarget.prototype.isInitialized = function() {
  return this.initialized_;
};


/**
 * Get the key handling element.
 * @return {Document} The key handling element.
 */
office.controller.TextEventTarget.prototype.getKeyHandlingElement = function() {
  return this.targetDocument_;
};


/**
 * Sets the width in pixels of the text event target.  This allows the text
 * event target width to be adjusted to match the current page or box width so
 * that pasted content such as tables will wrap naturally.
 * @param {number} width The new width for the text event target in pixels.
 */
office.controller.TextEventTarget.prototype.setWidth = function(width) {
  this.targetIframe_.style.width = width + 'px';
};


/** @override */
office.controller.TextEventTarget.prototype.setPositionAndDimensions = function(
    elementPosition, width, height, cssStyle, opt_textIndent, opt_leftMargin) {
  // console.trace();
  elementPosition.apply(this.targetIframe_);

  this.targetIframe_.style.width = width + 'px';
  this.targetIframe_.style.height = height + 'px';

  var contentEl = this.getContentElement();
  contentEl.style.textIndent = (opt_textIndent || 0) + 'px';
  contentEl.style.marginLeft = (opt_leftMargin || 0) + 'px';
  contentEl.style.marginTop = '1px';

  // Synchronize the text style of this element with the one specified by the
  // caller. (We do not use the default style of a browser because it may not be
  // our expected one.)
  var cssStyleMap = goog.style.parseStyleAttribute(cssStyle);

  goog.style.setStyle(contentEl, cssStyleMap);
  this.isImeActive_ = true;
};


/** @override */
office.controller.TextEventTarget.prototype.resetPositionAndDimensions =
    function() {
  
  this.isImeActive_ = false;
  var htmlCursorElem = document.getElementById('vodka-my-cursor');
  if(htmlCursorElem){
    this.updatePositionByCursor_();
  }else{
    this.targetIframe_.style.top = '-199999px';
    this.targetIframe_.style.left = '-109999px';
  }

  
  this.targetIframe_.style.width = '1px';
  this.targetIframe_.style.height = '1px';
  //
  var contentEl = this.getContentElement();
  contentEl.style.marginTop = '1px';
  contentEl.style.marginLeft = '0px';

  contentEl.style.textIndent = '0px';
  contentEl.style.marginBottom = '';
  contentEl.style.marginRight = '';
  
};


/**
 * 跟随光标
 */
office.controller.TextEventTarget.prototype.updatePositionByCursor_ = function() {
  if(!this.isImeActive_){
    var htmlCursorElem = document.getElementById('vodka-my-cursor');
    var rect = htmlCursorElem.getBoundingClientRect();
    this.targetIframe_.style.top = rect.y + 'px';
    this.targetIframe_.style.left = rect.x + 'px';
  }
};




/**
 * @return {!Element} The content element.
 */
office.controller.TextEventTarget.prototype.getContentElement = function() {
  return /** @type {!Element} */ (this.targetBody_);
};


/** @param {!office.html.DomProcessor} domProcessor */
office.controller.TextEventTarget.prototype.setDomProcessor =
    function(domProcessor) {
  this.domProcessor_ = domProcessor;
};


/**
 * Sets HTML content for the contentEditable and updates the browser selection
 * to this content. In addition, focus is transferred to the contenteEditable in
 * view only mode. The method may omit to update the content if updating would
 * interfere with an in-progress user operation, such as IME composition.
 * @param {string} html The html content.
 * @param {boolean=} opt_noSelect Whether to NOT select the entire contents of
 *     contenteditable after populating it. This is used when setting HTML
 *     content for Braille context, because the whole context should not be
 *     selected.
 * @return {boolean} Whether the content was updated.
 */
office.controller.TextEventTarget.prototype.setHtmlContent =
    function(html, opt_noSelect) {
  // On Linux, this function is called when it receives key events (including
  // ones sent from IMEs) to update selection. (If there is not any selection,
  // its parameter is null.) Unfortunately, setting innerHTML to null not only
  // deletes IME text, which is stored in innerHTML, but also deletes an
  // internal element used for typing text with IMEs, i.e. we cannot type text
  // with IMEs any more. To avoid this problem, we exit this function now
  // when this selectionHtml is null.
  if (!this.initialized_ ||
      (this.isImeActive_ && !html && goog.userAgent.LINUX &&
      goog.userAgent.product.CHROME)) {
    return false;
  }
  this.getContentElement().innerHTML = html;

  if (!opt_noSelect) {
    // Select the range so that middle click paste to an external target works.
    this.selectRange_();
  }

  // Perform any browser actions encoded in the set HTML.
  if (this.domProcessor_) {
    goog.asserts.assert(this.frameDom_);
    this.domProcessor_.process(this.getContentElement(), this.frameDom_);
  }
  return true;
};


/**
 * Gets the text content of the target. Used for getting input from IMEs.
 * @return {string} The text content.
 */
office.controller.TextEventTarget.prototype.getTextContent = function() {
  var contentEl = this.getContentElement();
  return goog.userAgent.IE ? contentEl.innerText : contentEl.textContent;
};


/**
 * Clears the text content of the target. Used for clearing input from IMEs.
 */
office.controller.TextEventTarget.prototype.clearTextContent = function() {
  var contentEl = this.getContentElement();
  contentEl.textContent = '';
};


/**
 * Sets the active state of the target and focuses or blurs the keystroke
 * receiving element depending on active.
 * @param {boolean} active Whether the target is active and focused.
 */
office.controller.TextEventTarget.prototype.setActiveAndFocus = function(active) {
  goog.log.info(this.logger_, 'texteventtarget#setActiveAndFocus: ' + active);
  this.setActive(active);
  if (active) {
    this.focusForKeyStrokes();
  } else {
    this.blur_();
  }
};


/**
 * Sets the active state of the keystroke receiving element.
 * @param {boolean} active Whether the target is active.
 */
office.controller.TextEventTarget.prototype.setActive = function(active) {
  goog.log.info(this.logger_, 'texteventtarget#setActive: ' + active);
  this.active_ = active;
};


/**
 * Sets the visibility of the target element. Useful for preventing the target
 * element from being in the page tab order.
 * @param {boolean} visible Whether the target element should be displayed in
 *     the DOM.
 */
office.controller.TextEventTarget.prototype.setVisible = function(visible) {
  if (this.visible_ != visible) {
    this.targetIframe_.style.display = visible ? '' : 'none';
    this.visible_ = visible;
  }
};


/**
 * Checks whether the target is already initialized and if it is not then
 * call initialize internal.
 * @private
 */
office.controller.TextEventTarget.prototype.initialize_ = function() {
  if (!this.initialized_) {
    if (!this.initializeInternal_()) {
      return;
    }
    this.initialized_ = true;

    if (this.focusOnInitialize_) {
      this.focusInternal_();
    }
    if (this.focusAndSelectOnInitialize_) {
      this.focusAndSelect();
    }
    this.dispatchEvent(office.controller.TextEventTarget.EventType.INITIALIZE);
    var that = this;
    office.crossContext.util.regist('textEventTarget.myCursorMove',function(){
      that.updatePositionByCursor_();
    })
  }
};



/**
 * @return {boolean} Whether initialization succeeded.
 * @private
 */
office.controller.TextEventTarget.prototype.initializeInternal_ = function() {
  goog.log.info(this.logger_, 'texteventtarget#initializeInternal_');

  if (!this.initializeTargetIframe_()) {
    return false;
  }

  if (goog.userAgent.GECKO) {
    // Make the iframe content editable so that we can copy/paste via it.
    this.targetDocument_.designMode = 'on';
  } else {
    // Make the iframe content editable so that we can copy/paste via it.
    this.targetBody_.contentEditable = true;
  }

  //添加id用于测试
  this.targetBody_.id = 'office-input-iframe-body'


  //  Make these events work with the iPad.

  // NOTE: The opt_capture parameter below IS necessary. Without it we never
  // receive a BLUR event when something outside the HTML document (like the
  // location bar) is focused.
  this.eventHandler_.
      listen(this.targetWindow_, goog.events.EventType.FOCUS,
          this.errorReporter_.protectFunction(this.handleFocus_, this), true).
      listen(this.targetWindow_, goog.events.EventType.BLUR,
          this.errorReporter_.protectFunction(this.handleBlur_, this), true);
  office.crossContext.util.regist('textEventTarget.focusInput',this.errorReporter_.protectFunction(this.handleFocus_, this));
  return true;
};


/**
 * Initializes the target iframe.
 * @return {boolean} Whether initialization succeeded.
 * @private
 */
office.controller.TextEventTarget.prototype.initializeTargetIframe_ =
    function() {
  this.targetWindow_ = this.targetIframe_.contentWindow;

  try {
  this.targetDocument_ = this.targetWindow_.document;
  } catch (e) {
    if (!office.controller.TextEventTarget.SHOULD_RETRY_ON_IFRAME_LOAD_FAILURE_) {
      throw e;
    }

    // This check is a failsafe to prevent a badly behaved Firefox build from
    // going into an infinite loop.
    if (this.reloadAttempts_ >
        office.controller.TextEventTarget.MAX_IFRAME_RELOADS_) {
      throw new Error('Attempt to initialize target iframe failed.');
    }
    // This call below will cause the iframe LOAD event to fire, forcing
    // initialize_ to be called again.
    this.targetIframe_.src =
        office.controller.TextEventTarget.IFRAME_BLANK_SOURCE_;
    this.reloadAttempts_++;
    return false;
  }

  this.targetBody_ = this.targetDocument_.body;
  this.frameDom_ = new goog.dom.DomHelper(this.targetDocument_);
  // Text in the contentEditable does not need spellchecking because it is not
  // user-visible.
  //this.targetBody_.spellcheck = false;
  this.targetBody_.style.backgroundColor = 'transparent';
  //修复chrome下中文输入法（搜狗）选择器第一个字符位置不准，marginTop：1px 下同
  this.targetBody_.style.marginTop = '1px';
  this.targetBody_.style.marginLeft = '0px';


  // Use the textbox role to support touch-based devices.
  goog.a11y.aria.setRole(this.targetBody_, goog.a11y.aria.Role.TEXTBOX);

  return true;
};


/**
 * Handles focus events on the focus bearing element.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.controller.TextEventTarget.prototype.handleFocus_ = function(e) {
  goog.log.info(this.logger_, 'texteventtarget#handleFocus_');
  this.hasFocus_ = true;
  this.dispatchEvent(office.controller.TextEventTarget.EventType.FOCUS);
  this.focusAndSelect();
};


/**
 * Handles blur events on the focus bearing element.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.controller.TextEventTarget.prototype.handleBlur_ = function(e) {
  goog.log.info(this.logger_, 'texteventtarget#handleBlur_');
  this.hasFocus_ = false;
  this.dispatchEvent(office.controller.TextEventTarget.EventType.BLUR);
};


/**
 * Whether the target has focus.
 * @return {boolean} Whether the target has focus.
 */
office.controller.TextEventTarget.prototype.getFocusDebugDebug = function() {
  return this.hasFocus_;
};


/**
 * Focuses the keystroke element so it can receive key strokes. This method
 * should be called when the application needs to receive normal user
 * keystrokes.
 */
office.controller.TextEventTarget.prototype.focusForKeyStrokes = function() {
  goog.log.info(this.logger_, 'texteventtarget#focusForKeyStrokes. active: ' +
      this.active_);
  if (!this.active_) {
    return;
  }

  // Webkit & firefox need the focus to be deferred. IE generates an inscrutable
  // DOM error if the focus call is deferred.
  // if (!goog.userAgent.IE) {
  //   this.callOnceTracker_.callOnce(this.focusInternal_, 0, this);
  // }

  // Safari needs both a deferred call and a non-deferred call to allow us to
  // steal focus from the browser itself. Focusing is very cheap, so we just
  // go ahead and unconditionally do this non-deferred focus too.
  // We need to keep the input focus in this target during we use it for
  // typing IME text. (A focus move usually cancels an ongoing IME composotion,
  // which causes a serious typing problem on Korean IMEs.) To avoid it, we
  // steal focus from the browser with a non-deffered call.
  this.focusInternal_();
};


/**
 * @private
 */
office.controller.TextEventTarget.prototype.focusInternal_ = function() {
  if (!this.initialized_) {
    // This function can be called before the target iframe gets initialized.
    // Set the bit to focus when the target gets initialized.
    this.focusOnInitialize_ = true;
    goog.log.info(this.logger_,
        'texteventtarget#focusInternal_ not performed, text event target not ' +
        'initialized');
    return;
  }

  // Do not focus if inactive.
  if (!this.active_) {
    return;
  }

  goog.log.info(this.logger_, 'texteventtarget#focusInternal_');

  //  Figure out why it's necessary to focus the window
  // before focusing the content element on the iPad.
  this.targetWindow_.focus();

  // TODO(bbj): don't delete
  // WEBKIT has a bug where the focus can't be reset without messing with the
  // selection first.
  // NOTE: this MUST be done in a timeout.
  // If WebKit does not have a selection, we need to call focus() and update the
  // selection to move the focus. (This case also applies when we use a textarea
  // element as the content element because WebKit does not allow to create a
  // selection in its inside.) On the other hand, if WebKit has a selection, we
  // just need to update the selection to move the focus. (It does not move the
  // focus when we call focus().) To handle both cases, we call focus() and
  // change the selection.
  if (goog.userAgent.WEBKIT) {
  // if (goog.userAgent.WEBKIT) {
    // WebKit requires the iframe to be specifically focused so that the text
    // event target becomes the document's active element.
      this.targetIframe_.focus();

    this.getContentElement().focus();

    // if (!goog.userAgent.EDGE) {
      var range = document.createRange();
      range.selectNodeContents(this.getContentElement());
      if (range.toString().length == 0) {
        window.getSelection().addRange(range);
      }
    // }
  }

  // Remove any browser selection from the main window since we should now be
  // rendering internal editor selection. Note that this does not affect the
  // logic above, since this is clearing the main window selection, rather than
  // the iframe's selection.
    goog.dom.Range.clearSelection();
};


/**
 * Selects the target content.
 * @private
 */
office.controller.TextEventTarget.prototype.selectRange_ = function() {
  //console.trace();
  var contentElement = this.getContentElement();
    var range = goog.dom.Range.createFromNodeContents(contentElement);
    if (goog.userAgent.WEBKIT) {
      // In webkit the entire range has to be selected otherwise the outer
      // element is not copied. That outer element is what contains the id that
      // is used to determine if the copy/paste operation was internal.
      goog.editor.range.expand(range).select();
    } else {
      // Other browsers prevent paste if the outer element is selected but copy
      // the outer div correctly.
      range.select();
    }
};


//  Reconcile focusAndSelect and focusForKeyStrokes. It's
// likely that both are not needed and it's not clear when to use one over the
// other.
/**
 * Focuses the target element and selects all of the contents. This method
 * should be called when the browser is about to cut, copy or paste so that the
 * proper content is available to the system clipboard.
 */
office.controller.TextEventTarget.prototype.focusAndSelect = function() {
  if (!this.initialized_) {
    // This function can be called before the target iframe gets initialized.
    // Set the bit to focus when the target gets initialized.
    this.focusAndSelectOnInitialize_ = true;
    goog.log.info(this.logger_,
        'texteventtarget#focusAndSelect not performed, text event target not ' +
        'initialized');
    return;
  }
  goog.log.info(this.logger_, 'texteventtarget#focusAndSelect');

  this.targetWindow_.focus();

  // In some cases (on the iPad, in Firefox in view-only mode) it is necessary
  // to also focus the content element.
  // if (!goog.userAgent.EDGE) {
  this.getContentElement().focus();
  this.selectRange_();
  // }
};


/**
 * Blurs the target window so the target no longer receives key strokes.
 * @private
 */
office.controller.TextEventTarget.prototype.blur_ = function() {
  goog.log.info(this.logger_, 'texteventtarget#blur');
  //  Figure out why blur does not work on IE.
  if (this.hasFocus_) {
    this.getContentElement().blur();
  }
};


/**
 * Clears the body of the target element. May not have any effect if clearing
 * would distrupt ongoing user interaction (like IME composition).
 * @see {#setHtmlContent}
 * @return {boolean} Whether the body was cleared.
 */
office.controller.TextEventTarget.prototype.clear = function() {
  goog.log.info(this.logger_, 'texteventtarget#clear');
  var success = this.setHtmlContent('');
  if (success && goog.userAgent.WEBKIT) {
    // Webkit needs the clipboard body to be selected in order for the browser's
    // native paste shortcuts to be dispatched.
    goog.dom.Range.createFromNodeContents(this.getContentElement()).select();
  }
  return success;
};


/** @override */
office.controller.TextEventTarget.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  goog.dispose(this.callOnceTracker_);
  delete this.callOnceTracker_;

  this.dom_.removeNode(this.targetIframe_);
  delete this.targetIframe_;

  delete this.targetBody_;
  delete this.targetDocument_;
  delete this.targetWindow_;
  delete this.dom_;
};
