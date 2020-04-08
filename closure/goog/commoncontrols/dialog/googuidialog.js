goog.provide('controls.googdialog');

goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.Role');
goog.require('goog.a11y.aria.State');
goog.require('goog.asserts');
goog.require('goog.dispose');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.css3');
goog.require('goog.html.legacyconversions');
goog.require('goog.math.Box');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Rect');
goog.require('goog.style');
goog.require('goog.ui.Dialog');
goog.require('goog.ui.PopupBase');
goog.require('goog.ui.Prompt');
goog.require('goog.userAgent');


/**
 * Default opacity to apply for goog.ui.Dialog.
 * @type {number}
 * @const
 */
controls.googdialog.DEFAULT_OPACITY = 0.35;


/**
 * Whether to enable transitions when showing and hiding.
 *
 *  Remove this flag once people have time to fix all tests.
 *
 * @type {boolean}
 */
controls.googdialog.enableTransitions = true;


/**
 * Default transition duration to use for goog.ui.Dialog.
 * @type {number}
 * @const
 * @private
 */
controls.googdialog.TRANSITION_DURATION_ = 0.130;


/**
 * CSS class for action button.
 * @type {string}
 * @const
 */
controls.googdialog.ACTION_BUTTON_CSS_CLASS = goog.getCssName(
    'goog-buttonset-action');


/**
 * Applies CONTROLS dialog specification to a {@link goog.ui.Dialog}. Also add
 * a dragger around the padding of the dialog. Note that calling the
 * dialog's setDraggable while the dialog is visible will only take
 * effect the next time the dialog is made visible.
 *
 * @param {goog.ui.Dialog} dialog The dialog to apply controls style to.
 * @param {string} actionButtonKey The key for action button (blue button).
 */
controls.googdialog.applyDialogStyle = function(dialog, actionButtonKey) {
  var helper = goog.partial(controls.googdialog.applyDialogStyleHelper_,
                            dialog, actionButtonKey);
  if (dialog.isInDocument()) {
    helper();
  } else {
    //  Don't use goog.ui.PopupBase.EventType.BEFORE_SHOW in IE
    // because it causes timeouts in
    // javatests/com/google/trix/client:TrixJsTests-JsTests-shard1_ie8-winxp.
    // Since transition support is not needed pre-IE10, address this once our
    // testing framework supports IE10.
    if (goog.userAgent.IE) {
      goog.events.listenOnce(dialog, goog.ui.Dialog.EventType.AFTER_SHOW,
          helper);
    } else {
      goog.events.listenOnce(dialog, goog.ui.PopupBase.EventType.BEFORE_SHOW,
          helper);
    }
  }

  var dragger = null;
  goog.events.listen(dialog, goog.ui.Dialog.EventType.AFTER_SHOW, function() {
    if (dialog.getDraggable()) {
      dragger = new controls.googdialog.Dragger_(dialog);
    }
  });
  goog.events.listen(dialog, goog.ui.Dialog.EventType.AFTER_HIDE, function() {
    goog.dispose(dragger);
  });
};


/**
 * Sets a transition on the dialog. The transition changes the opacity of the
 * background and the opacity of the dialog on show and hide.
 * @param {goog.ui.Dialog} dialog The dialog to add transitions to.
 * @private
 */
controls.googdialog.setTransition_ = function(dialog) {
  var popupShowTransition = goog.fx.css3.fadeIn(
      dialog.getElement(),
      controls.googdialog.TRANSITION_DURATION_);
  var popupHideTransition = goog.fx.css3.fadeOut(
      dialog.getElement(),
      controls.googdialog.TRANSITION_DURATION_);
  var bgShowTransition = goog.fx.css3.fade(
      dialog.getBackgroundElement(),
      controls.googdialog.TRANSITION_DURATION_,
      'ease-out',
      0 /* startOpacity */,
      controls.googdialog.DEFAULT_OPACITY);
  var bgHideTransition = goog.fx.css3.fade(
      dialog.getBackgroundElement(),
      controls.googdialog.TRANSITION_DURATION_,
      'ease-in',
      controls.googdialog.DEFAULT_OPACITY,
      0 /* endOpacity */);

  dialog.setTransition(popupShowTransition, popupHideTransition,
      bgShowTransition, bgHideTransition);
};


/**
 * Applies CONTROLS dialog specification to a {@link goog.ui.Dialog}. Please make
 * sure that the dialog has been rendered/decorated before calling this.
 *
 * @param {goog.ui.Dialog} dialog The dialog to apply controls style to.
 * @param {string} actionButtonKey The key for action button (blue button).
 * @private
 */
controls.googdialog.applyDialogStyleHelper_ = function(dialog, actionButtonKey) {
  dialog.setBackgroundElementOpacity(controls.googdialog.DEFAULT_OPACITY);
  var buttonSet = dialog.getButtonSet();
  if (buttonSet) {
    var actionButton = buttonSet.getButton(actionButtonKey);
    if (actionButton) {
      goog.dom.classlist.add(actionButton,
          controls.googdialog.ACTION_BUTTON_CSS_CLASS);
    }
  }

  if (controls.googdialog.enableTransitions) {
    controls.googdialog.setTransition_(dialog);
  }
};


/**
 * A replacement for the window.alert functionality.
 * @param {string} title The title of the alert.
 * @param {!goog.html.SafeHtml} html The html content of the alert.
 * @param {Function=} opt_callback Optional callback function to call after the
 *     alert is dismissed.
 * @param {Object=} opt_scope The scope to call the callback in.
 * @param {string=} opt_okButtonText Optional custom text for the ok/dismiss
 *     button on the alert dialog.
 * @param {string=} opt_className Additional class name to apply to the
 *     dialog, if not specified, 'controls-alert' will be used.
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.ui.Dialog} The dialog, in case you want to customize
 *     it further.
 */
controls.googdialog.alertWithHtmlContent = function(
    title, html, opt_callback, opt_scope,
    opt_okButtonText, opt_className, opt_domHelper) {
  var callback = opt_callback || null;
  var buttonSet = opt_okButtonText ?
      new goog.ui.Dialog.ButtonSet().addButton(
          {key: goog.ui.Dialog.DefaultButtonKeys.OK, caption: opt_okButtonText},
          true, true) :
      goog.ui.Dialog.ButtonSet.createOk();

  return controls.googdialog.confirmWithHtmlContent(
      title, html, callback, callback, opt_scope,
      opt_className || goog.getCssName('controls-alert'),
      buttonSet, opt_domHelper);
};


/**
 * A replacement for the window.alert functionality.
 *
 * <p>This method uses an unsafe string parameter to pass HTML content. This
 * creates a risk of allowing improperly escaped HTML, thus creating XSS bugs.
 * Please use {@code alertWithHtmlContent} instead.
 * @param {string} title The title of the alert.
 * @param {string} message The html content of the alert.
 * @param {Function=} opt_callback Optional callback function to call after the
 *     alert is dismissed.
 * @param {Object=} opt_scope The scope to call the callback in.
 * @param {string=} opt_okButtonText Optional custom text for the ok/dismiss
 *     button on the alert dialog.
 * @param {string=} opt_className Additional class name to apply to the
 *     dialog, if not specified, 'controls-alert' will be used.
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.ui.Dialog} The dialog, in case you want to customize
 *     it further.
 * @deprecated Use alertWithHtmlContent. See method documentation for details.
 */
controls.googdialog.alert = function(
    title, message, opt_callback, opt_scope,
    opt_okButtonText, opt_className, opt_domHelper) {
  var safeHtml = goog.html.legacyconversions.safeHtmlFromString(message);
  return controls.googdialog.alertWithHtmlContent(
      title, safeHtml, opt_callback, opt_scope,
      opt_okButtonText, opt_className, opt_domHelper);
};


/**
 * A replacement for the window.confirm functionality. The okCallback
 * will be called if the user chooses the default option, otherwise the
 * cancelCallback is called.
 * @param {string} title The title of the confirm dialog.
 * @param {!goog.html.SafeHtml} html The html content of the confirm dialog.
 * @param {?Function} okCallback The callback function to call after the alert
 *     is dismissed by pressing the default button (OK).
 * @param {?Function} cancelCallback The callback function to call after the
 *     alert is dismissed with the non-default button (Cancel).
 * @param {Object=} opt_scope The scope to call the callback in.
 * @param {string=} opt_className Additional class name to apply to the
 *     dialog, if not specified, 'controls-confirm' will be used.
 * @param {goog.ui.Dialog.ButtonSet=} opt_buttonSet A button set to use. Only
 *     use a button set with 2 buttons. Any non-default buttons will call
 *     cancelCallback.
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.ui.Dialog} The dialog, in case you want to customize
 *     it further.
 */
controls.googdialog.confirmWithHtmlContent = function(
    title, html, okCallback, cancelCallback, opt_scope, opt_className,
    opt_buttonSet, opt_domHelper) {
  var className = opt_className || goog.getCssName('controls-confirm');

  var dialog = new goog.ui.Dialog(undefined, true, opt_domHelper);
  dialog.setTitle(title);
  dialog.setSafeHtmlContent(html);
  dialog.setButtonSet(
      opt_buttonSet || goog.ui.Dialog.ButtonSet.createOkCancel());
  dialog.setDisposeOnHide(true);
  dialog.render();
  var dialogElement = dialog.getElement();
  goog.asserts.assert(dialogElement, 'The dialog element cannot be null');
  goog.dom.classlist.add(dialogElement, className);
  controls.googdialog.applyDialogStyle(dialog, goog.ui.Dialog.DefaultButtonKeys.OK);

  // Set Aria roles as explained here:
  // http://www.w3.org/TR/wai-aria/roles#alertdialog
  var msgId = dialog.makeId('msg');
  dialog.getContentElement().id = msgId;
  //goog.a11y.aria.setRole(dialogElement,
  //    goog.a11y.aria.Role.ALERTDIALOG);
  //goog.a11y.aria.setState(dialogElement,
  //    goog.a11y.aria.State.DESCRIBEDBY,
  //    msgId);

  goog.events.listenOnce(dialog, goog.ui.Dialog.EventType.SELECT,
      function(e) {
        if (okCallback && e.key == dialog.getButtonSet().getDefault()) {
          okCallback.call(opt_scope);
        } else if (cancelCallback) {
          cancelCallback.call(opt_scope);
        }
      });

  dialog.setVisible(true);
  return dialog;
};


/**
 * A replacement for the window.confirm functionality. The okCallback
 * will be called if the user chooses the default option, otherwise the
 * cancelCallback is called.
 *
 * <p>This method uses an unsafe string parameter to pass HTML content. This
 * creates a risk of allowing improperly escaped HTML, thus creating XSS bugs.
 * Please use {@code confirmWithHtmlContent} instead.
 * @param {string} title The title of the confirm dialog.
 * @param {string} message The html content of the confirm dialog.
 * @param {?Function} okCallback The callback function to call after the alert
 *     is dismissed by pressing the default button (OK).
 * @param {?Function} cancelCallback The callback function to call after the
 *     alert is dismissed with the non-default button (Cancel).
 * @param {Object=} opt_scope The scope to call the callback in.
 * @param {string=} opt_className Additional class name to apply to the
 *     dialog, if not specified, 'controls-confirm' will be used.
 * @param {goog.ui.Dialog.ButtonSet=} opt_buttonSet A button set to use. Only
 *     use a button set with 2 buttons. Any non-default buttons will call
 *     cancelCallback.
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.ui.Dialog} The dialog, in case you want to customize
 *     it further.
 * @deprecated Use confirmWithHtmlContent. See method documentation for details.
 */
controls.googdialog.confirm = function(
    title, message, okCallback, cancelCallback, opt_scope, opt_className,
    opt_buttonSet, opt_domHelper) {
  var safeHtml = goog.html.legacyconversions.safeHtmlFromString(message);
  return controls.googdialog.confirmWithHtmlContent(
      title, safeHtml, okCallback, cancelCallback, opt_scope, opt_className,
      opt_buttonSet, opt_domHelper);
};


/**
 * A replacement for the window.prompt functionality.
 * @param {string} title The title of the prompt.
 * @param {string|!goog.html.SafeHtml} html The HTML body of the prompt.
 *     The variable is trusted and it should be already properly escaped.
 * @param {!Function} callback The function to call when the user selects Ok or
 *     Cancel. The function should expect a single argument which represents
 *     what the user entered into the prompt. If the user presses cancel, the
 *     value of the argument will be null.
 * @param {string} defaultValue Default value that should be in the text box
 *     when the prompt appears.
 * @param {string=} opt_className Additional class name to apply to the
 *     prompt, if not specified, 'controls-prompt' will be used.
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.ui.Prompt} The prompt, in case you want to customize
 *     it further.
 */
controls.googdialog.prompt = function(
    title, html, callback, defaultValue, opt_className, opt_domHelper) {
  var className = opt_className || goog.getCssName('controls-prompt');

  var prompt = new goog.ui.Prompt(title, html, callback, defaultValue,
      undefined, true, opt_domHelper);
  prompt.setDisposeOnHide(true);
  prompt.render();
  var promptElement = prompt.getElement();
  goog.asserts.assert(promptElement, 'The promptElement cannot be null.');
  goog.dom.classlist.add(promptElement, className);
  var inputElement = prompt.getInputElement();
  goog.dom.classlist.add(inputElement, goog.getCssName('controls-textinput'));
  controls.googdialog.applyDialogStyle(prompt, goog.ui.Dialog.DefaultButtonKeys.OK);

  return prompt;
};



/**
 * Specialized dragger that supports dragging only on the padding of the
 * dialog.
 * @param {!goog.ui.Dialog} dialog The target dialog to be made draggable.
 * @constructor
 * @extends {goog.fx.Dragger}
 * @private
 */
controls.googdialog.Dragger_ = function(dialog) {
  controls.googdialog.Dragger_.base(this, 'constructor', dialog.getElement());

  /**
   * @type {!goog.ui.Dialog}
   * @private
   */
  this.dialog_ = dialog;
  goog.events.listen(
      this, goog.fx.Dragger.EventType.START, this.shouldDrag_, false, this);
};
goog.inherits(controls.googdialog.Dragger_, goog.fx.Dragger);


/**
 * Whether dragging should be performed.
 * @param {!goog.fx.DragEvent} dragEvent The drag event.
 * @return {boolean} True if dragging should be performed, false otherwise.
 * @private
 */
controls.googdialog.Dragger_.prototype.shouldDrag_ = function(dragEvent) {
  var e = dragEvent.browserEvent;
  if (this.dialog_.getDraggable() &&
      goog.dom.classlist.contains(/** @type {Element} */ (e.target),
          this.dialog_.getClass())) {
    // Only allow dragging if the user is dragging from the dialog's padding.
    var size = goog.style.getSize(this.dialog_.getElement());
    var box = new goog.math.Box(0, size.width, size.height, 0);
    var padding = goog.style.getPaddingBox(this.dialog_.getElement());
    box.expand(-1 * padding.top, -1 * padding.right, -1 * padding.bottom,
        -1 * padding.left);
    if (!box.contains(new goog.math.Coordinate(e.offsetX, e.offsetY))) {
      this.setDraggerLimits_();
      return true;
    }
  }
  return false;
};


/**
 * Sets dragger limits when dragging is started.
 * @private
 */
controls.googdialog.Dragger_.prototype.setDraggerLimits_ = function() {
  var doc = this.dialog_.getDomHelper().getDocument();
  var win = goog.dom.getWindow(doc);
  var viewSize = goog.dom.getViewportSize(win);
  var dialogSize = goog.style.getSize(this.dialog_.getElement());

  var widthLimit;
  var heightLimit;

  if (goog.style.getComputedPosition(this.dialog_.getElement()) == 'fixed') {
    // Ensure position:fixed dialogs can't be dragged beyond the viewport.
    widthLimit = viewSize.width - dialogSize.width;
    heightLimit = viewSize.height - dialogSize.height;
  } else {
    // Take the max of scroll height and view height for cases in which
    // document does not fill screen.
    var width = Math.max(doc.body.scrollWidth, viewSize.width);
    var height = Math.max(doc.body.scrollHeight, viewSize.height);
    widthLimit = width - dialogSize.width;
    heightLimit = height - dialogSize.height;
  }

  this.setLimits(new goog.math.Rect(0, 0,
      Math.max(0, widthLimit), Math.max(0, heightLimit)));
};
