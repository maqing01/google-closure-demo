goog.provide('apps.action.ShortcutsHelpModalPopup');

goog.require('apps.action.ControlBinder');
goog.require('apps.action.Property');
goog.require('apps.action.ShortcutPreferenceComponent');
goog.require('apps.action.ShortcutsHelpPopup');
goog.require('apps.action.shortcutBannerTemplate');
goog.require('apps.action.shortcutKeyTemplate');
goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.State');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.actionEventWrapper');
goog.require('goog.soy');
goog.require('goog.style');
goog.require('goog.ui.IdGenerator');
goog.require('goog.ui.ModalPopup');
goog.require('goog.userAgent.keyboard');



/**
 * @param {!apps.action.ShortcutsHelpPopup.Data} data Shortcut help data.
 * @param {string} helpUrl Link to the external help page.
 * @param {boolean=} opt_useIframeMask Work around windowed controls z-index
 *     issue by using an iframe instead of a div for bg element.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {function(): boolean=} opt_prefEnabledFn Optional function to
 *     call to determine whether shortcuts are enabled.  Required to show the
 *     "Keyboard shortcuts are enabled/disabled" banner.
 * @param {function()=} opt_prefToggleFn Optional function to call to
 *     toggle whether shortcuts are enabled.  Required to show the "Keyboard
 *     shortcuts are enabled/disabled" banner.
 * @constructor
 * @extends {goog.ui.ModalPopup}
 */
apps.action.ShortcutsHelpModalPopup =
    function(data, helpUrl, opt_useIframeMask, opt_domHelper, opt_prefEnabledFn,
        opt_prefToggleFn) {
  goog.base(this, opt_useIframeMask, opt_domHelper);

  /**
   * The shortcut help data.
   * @type {!apps.action.ShortcutsHelpPopup.Data}
   * @private
   */
  this.data_ = data;

  /**
   * Link to the external help page.
   * @type {string}
   * @private
   */
  this.helpUrl_ = helpUrl;

  var idGenerator = goog.ui.IdGenerator.getInstance();
  /**
   * The new window link element ID.
   * @type {string}
   * @private
   */
  this.newWindowLinkId_ = idGenerator.getNextUniqueId();

  /**
   * The close link element ID.
   * @type {string}
   * @private
   */
  this.closeLinkId_ = idGenerator.getNextUniqueId();

  /**
   * The preference component element ID, if such a component is to be made.
   * @type {string|undefined}
   * @private
   */
  this.prefComponentId_ = (opt_prefEnabledFn && opt_prefToggleFn) ?
      idGenerator.getNextUniqueId() : undefined;

  /**
   * The new window link element.
   * @type {Element}
   * @private
   */
  this.newWindowLinkElement_ = null;

  /**
   * The visibility of the new window link element;
   * @type {boolean}
   * @private
   */
  this.newWindowLinkVisibility_ = true;

  /**
   * The shortcut preference component, if it exists.
   * @type {apps.action.ShortcutPreferenceComponent}
   * @private
   */
  //this.prefComponent_ = goog.isDefAndNotNull(this.prefComponentId_) ?
  //    new apps.action.ShortcutPreferenceComponent(
  //        /** @type {Function} */(opt_prefEnabledFn),
  //        /** @type {Function} */(opt_prefToggleFn),
  //        this.getDomHelper()) :
  //    null;
  //if (this.prefComponent_) {
  //  this.registerDisposable(this.prefComponent_);
  //}
};
goog.inherits(apps.action.ShortcutsHelpModalPopup, goog.ui.ModalPopup);


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.getCssClass = function() {
  return goog.getCssName('shortcuts-modalpopup');
};


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.canDecorate = function() {
  return false;
};


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.createDom = function() {
  goog.base(this, 'createDom');

  var element = this.getElementStrict();
  goog.dom.classes.add(element, goog.getCssName('CSS_SHORTCUTS_HELP_POPUP'));
  //goog.style.setOpacity(element, 0.85);
  goog.style.setElementShown(element, false);

  // Set the popup's role to dialog so screen readers will verbalize closing
  // with the keyboard.
  //goog.a11y.aria.setRole(element, 'dialog');
  // Generate the title id per-instance and store in this class.
  //goog.a11y.aria.setState(
  //    element, goog.a11y.aria.State.LABELLEDBY, 'office-shortcuts-dialog-title');

  //Create element contents by calling template.
  goog.soy.renderElement(element, apps.action.shortcutBannerTemplate,
      apps.action.ShortcutsHelpModalPopup.createTemplateData_(
          this.data_,
          this.helpUrl_,
          this.newWindowLinkId_,
          this.closeLinkId_,
          this.prefComponentId_));
};


/**
 * @param {!apps.action.ShortcutsHelpPopup.Data} data Shortcut help data.
 * @param {string} helpUrl The help URL.
 * @param {string} newWindowLinkId The ID for the new window link element.
 * @param {string} closeLinkId The ID for the close link element.
 * @param {string|undefined} prefComponentId The ID for the preference
 *     component. Undefined if no such component is to be made.
 * @return {Object} The shortcut popup template data object.
 *  Move the shortcut data formatting into its own object.
 * @private
 */
apps.action.ShortcutsHelpModalPopup.createTemplateData_ = function(
    data, helpUrl, newWindowLinkId, closeLinkId, prefComponentId) {

  // Format the shortcut data into a form expected by the template.
  var formattedData = goog.array.map(data, function(column) {
    return goog.array.map(column, function(group) {
      var shortcuts = goog.array.map(group.shortcuts,
          apps.action.ShortcutsHelpModalPopup.formatShortcut_);
      return {title: group.title, shortcuts: shortcuts};
    });
  });

  var isPrivate = office.flag.FlagService.getInstance().getBoolean('is-env-pri');
  return {
    shortcutsHelpUrl: helpUrl,
    tearOffLinkId: newWindowLinkId,
    closeLinkId: closeLinkId,
    columns: formattedData,
    isPrivate: isPrivate,
    prefComponentId: prefComponentId
  };
};


/**
 * Formats a shortcut.
 *
 * @param {apps.action.ShortcutsHelpPopup.Shortcut} shortcut Shortcut.
 * @return {{key: string, description: string}} Formatted key data.
 * @private
 */
apps.action.ShortcutsHelpModalPopup.formatShortcut_ = function(shortcut) {
  var key;
  var desc;
  var opt_forceCtrl = false;
  if (goog.isArray(shortcut)) {
    key = shortcut[0];
    desc = shortcut[1];
    if (shortcut[2]) {
      opt_forceCtrl = true;
    }
  } else {
    key = shortcut.getKeys();
    desc = /** @type {string} */ (
        shortcut.getProperty(apps.action.Property.LABEL));
    opt_forceCtrl = /** @type {boolean} */ (
        shortcut.getProperty(apps.action.Property.FORCE_CTRL_KEY));
  }
  // If there are multiple shortcuts, only use the first one.
  //  We should support multiple shortcuts, concatenated with
  // "or". For this, we need to modify the soy to be able to support languages
  // in which "or" behaves differently than just "a or ".
  key = goog.isArray(key) ? key[0] : key;

  var words = apps.action.ShortcutsHelpModalPopup.makeReadableShortcut(key,
      true /* opt_array */, opt_forceCtrl);

  //Add a screen-reader friendly description for the aria-label attribute.
  //var shortcutText = apps.action.ShortcutsHelpModalPopup.makeReadableShortcut(
  //    key, false /* opt_array */, opt_forceCtrl);
  //var ariaLabelText = apps.action.ControlBinder.createShortcutAriaLabel(
  //    /** @type {string} */ (shortcutText));

  key = apps.action.shortcutKeyTemplate({
    words: words,
    ariaLabelText: ''
  });
  return {key: key, description: desc};
};


/**
 * Converts a string keyboard shortcut string into a human readable description.
 * @param {string} keys The shortcut.
 * @param {boolean=} opt_array Whether the description should be returned as an
 *     array of tokens, instead of a space-delimited string.
 * @param {boolean=} opt_forceCtrl Whether to disable the automatic aliasing of
 *     Ctrl to \u2318 for goog.userAgent.keyboard.MAC_KEYBOARD.
 * @return {Array.<string>|string} A human readable description of the shortcut.
 */
apps.action.ShortcutsHelpModalPopup.makeReadableShortcut = function(keys, opt_array, opt_forceCtrl) {
  // Normalize whitespace.
  keys = keys.replace(/[ +]*\+[ +]*/g, '+').replace(/[ ]+/g, ' ');

  /**
   * @desc Message for word that joins 2 alternative keywords. ex - The "or" in
   *     "k or Up".
   */
  var MSG_APPS_SHORTCUT_OR = goog.getMsg('or');

  var processToken = function(token) {
    // If the token is a single space then it's part of a two stroke keyboard
    // shortcut that must be joined by a token indicating separation ("then" vs
    // "+").
    token = (token == ' ') ?
        apps.action.ShortcutsHelpPopup.
            MSG_APPS_ACTION_SHORTCUT_STROKE_DELIMITER :
        token;
    token = (token == '\t') ? MSG_APPS_SHORTCUT_OR : token;

    var alias = ((!opt_forceCtrl || token != 'Ctrl') &&
        goog.userAgent.keyboard.MAC_KEYBOARD) ?
            apps.action.ShortcutsHelpPopup.MAC_ALIASES[token] :
            '';
    return alias || token;
  };

  var tokens = goog.array.map(keys.match(/[+ \t,\/]|[^+ \t,\/]+/g),
      processToken);
  return opt_array ? tokens : tokens.join(' ');
};


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var dom = this.getDomHelper();
  this.newWindowLinkElement_ = dom.getElement(this.newWindowLinkId_);
  this.setNewWindowLinkVisible(this.newWindowLinkVisibility_);
  var closeLinkElement = dom.getElement(this.closeLinkId_);

  //if (this.prefComponent_) {
  //  this.prefComponent_.render(
  //      dom.getElement(/** @type {string} */(this.prefComponentId_)));
  //}

  // Note: The new window link element is an anchor element, so CLICK should
  // cover the "Enter" keystroke that activates it.  The actionEventWrapper is
  // not used as keydown will trigger before click, and changing focus prevents
  // the click from following up. Fixes http://b/7955902.
  this.getHandler().listen(this.newWindowLinkElement_,
      goog.events.EventType.CLICK, this.handleLinkAction_);
  this.getHandler().listenWithWrapper(closeLinkElement,
      goog.events.actionEventWrapper, this.handleLinkAction_);

  var doc = dom.getOwnerDocument(this.getElement());
  this.getHandler().listen(
      doc,
      goog.events.EventType.MOUSEDOWN,
      this.onDocumentMouseDown_,
      true /* opt_capture */);
  this.getHandler().listen(
      this.getElement(), goog.events.EventType.KEYDOWN, this.onKeyDown_);
};


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.exitDocument = function() {
  goog.base(this, 'exitDocument');
  this.newWindowLinkElement_ = null;
};


/**
 * Handles an action on a link. Closes the popup.
 * @param {!goog.events.Event} e The event.
 * @private
 */
apps.action.ShortcutsHelpModalPopup.prototype.handleLinkAction_ = function(e) {
  this.setVisible(false);
};


/**
 * Sets the visibility of the new window link element.
 * @param {boolean} visible Whether the new window link element should be
 *     visible.
 */
apps.action.ShortcutsHelpModalPopup.prototype.setNewWindowLinkVisible =
    function(visible) {
  this.newWindowLinkVisibility_ = visible;
  if (this.newWindowLinkElement_) {
    goog.style.setElementShown(
        this.newWindowLinkElement_, this.newWindowLinkVisibility_);
  }
};


/**
 * @return {boolean} If the new window link element is to be displayed when the
 *     popup is shown.
 */
apps.action.ShortcutsHelpModalPopup.prototype.isNewWindowLinkVisible =
    function() {
  return this.newWindowLinkVisibility_;
};


/** @override */
apps.action.ShortcutsHelpModalPopup.prototype.reposition = function() {
  goog.base(this, 'reposition');
  var element = this.getElement();
  if (element) {
    // Add a max-height restriction to this element, which will allow it to
    // scroll gracefully.
    var maxHeight;
    if (this.isVisible()) {
      var viewportElt = goog.style.getClientViewportElement(element);
      var viewport = goog.style.getVisibleRectForElement(viewportElt);
      maxHeight = (viewport.bottom - viewport.top) * 0.9;
    } else {
      var doc = this.getDomHelper().getDocument();
      var win = goog.dom.getWindow(doc) || window;
      var viewSize = goog.dom.getViewportSize(win);
      maxHeight = viewSize.height * 0.9;
    }

    goog.style.setStyle(element, 'maxHeight', maxHeight + 'px');
    // Override the left and top styles that were changed by the base
    // reposition.
    goog.style.setStyle(element, 'left', '10%');
    goog.style.setStyle(element, 'top', '10%');
  }
};


/**
 * Handles mousedown on the document to close the popup if they occur outside
 * it.
 * @param {!goog.events.Event} e The event object.
 * @private
 */
apps.action.ShortcutsHelpModalPopup.prototype.onDocumentMouseDown_ =
    function(e) {
  if (!goog.dom.contains(this.getElement(), /** @type {Node} */ (e.target))) {
    this.setVisible(false);
  }
};


/**
 * Handles keydown on the popup element to close the popup if escape is pressed.
 * @param {!goog.events.Event} e The event object.
 * @private
 */
apps.action.ShortcutsHelpModalPopup.prototype.onKeyDown_ = function(e) {
  if (e.keyCode == goog.events.KeyCodes.ESC) {
    this.setVisible(false);
    e.stopPropagation();
    e.preventDefault();
  } else if (e.keyCode == goog.events.KeyCodes.TAB && e.shiftKey &&
      e.target == this.getElement()) {
    // Mirroring code in goog.ui.Dialog.
    this.setupBackwardTabWrap();
  }
};


/**
 * Ensure the popup accurately displays the current status of keyboard
 * shortcuts.
 */
apps.action.ShortcutsHelpModalPopup.prototype.refreshShortcutsEnabled =
    function() {
  //if (this.prefComponent_ && this.prefComponent_.isInDocument()) {
  //  this.prefComponent_.refreshShortcutsEnabled();
  //}
};
