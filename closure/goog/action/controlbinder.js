goog.provide('apps.action.ControlBinder');
goog.provide('apps.action.PropertyUpdater');

/** @suppress {extraRequire} */
goog.require('apps.action.FireActionDelegate');
goog.require('apps.action.Property');
goog.require('apps.action.SubscriptionManager');
goog.require('apps.action.Topic');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events.EventHandler');
goog.require('goog.functions');
goog.require('goog.object');
goog.require('goog.ui.Component');
goog.require('goog.userAgent.keyboard');
goog.require('controls.MenuMnemonics');
goog.require('controls.tooltipManager');


/**
 * Property updater function.  Takes the following arguments:
 * <ul>
 *   <li>{@code control} - the UI control being updated
 *   <li>{@code boundProperties} - the set of bound action properties
 *   <li>{@code action} - the action to which the control is bound
 *   <li>{@code property} - the name of the property currently being updated
 *   <li>{@code newValue} - the new value of the property being updated
 *   <li>{@code oldValue} - the old value of the property being updated
 * </li>
 * @typedef {function(!goog.ui.Control, !Object.<boolean>, !apps.action.Action,
 *     string, *, *)}
 */
apps.action.PropertyUpdater;



/**
 * Utility class for binding UI controls to actions.  This implementation
 * provides bindings suitable for most applications.  Apps with different
 * conventions can subclass this class and override its protected methods
 * as needed.
 *
 * The {@code opt_propertyUpdaters} parameter is a map of action property names
 * to custom property updater functions, which are invoked as methods on this
 * control binder instance.  See {@link apps.action.PropertyUpdater} for more
 * information.  All action properties listed in {@link apps.action.Property}
 * have default property updaters.
 *
 * The {@code opt_contentModifyingProperties} parameter is a set containing
 * the  names of those action properties that, when updated, require the
 * control's DOM contents to be destroyed and recreated.  Change events for
 * these properties are handled by {@link #updateContent} unless they have a
 * custom updater.  When binding decorated controls, {@link #initializeControl}
 * ignores these properties to preserve the decorated DOM.  If unspecified, the
 * default set contains the {@code ICON}, {@code KEYS}, and {@code LABEL}
 * properties.
 *
 * @param {Object.<!apps.action.PropertyUpdater>=} opt_propertyUpdaters Map of
 *     action property names to custom property updater functions.
 * @param {Object.<boolean>=} opt_contentModifyingProperties Set of properties
 *     that, when updated, require the control's DOM contents to be recreated.
 * @param {boolean=} opt_enableKennedy Whether kennedy is enabled.
 * @param {!apps.action.FireActionDelegate=} opt_fireActionDelegate The delegate
 *     that processes the firing of actions.
 * @constructor
 * @extends {goog.Disposable}
 */
apps.action.ControlBinder = function(opt_propertyUpdaters,
    opt_contentModifyingProperties, opt_enableKennedy, opt_fireActionDelegate) {
  goog.Disposable.call(this);

  /**
   * Event handler to manage event bindings.
   * @type {!goog.events.EventHandler}
   * @private
   */
  this.handler_ = new goog.events.EventHandler(this);

  /**
   * Subscription manager to manage action subscriptions.
   * @type {!apps.action.SubscriptionManager}
   * @private
   */
  this.subscriptionManager_ = new apps.action.SubscriptionManager(this);

  /**
   * Map of action property names to property updater functions.
   * @type {!Object.<!apps.action.PropertyUpdater>}
   * @private
   */
  this.propertyUpdaters_ = {};

  /**
   * @type {boolean}
   * @private
   */
  this.kennedyEnabled_ = !!opt_enableKennedy;

  /**
   * Delegate that processes the firing of actions.
   * @type {apps.action.FireActionDelegate}
   * @private
   */
  this.fireActionDelegate_ = opt_fireActionDelegate || null;

  /**
   * Set of properties that, when changed, cause the control's DOM content
   * to be destroyed and recreated.  When binding decorated controls, these
   * properties are ignored.  Changes to these properties are handled by
   * calling {@link #updateContent} unless they have custom updaters.
   * @type {!Object}
   * @private
   */
  this.contentModifyingProperties_ = opt_contentModifyingProperties ||
      goog.object.createSet(apps.action.Property.ICON,
          apps.action.Property.KEYS,
          apps.action.Property.LABEL);

  // Set default updater for content-modifying properties.
  for (var property in this.contentModifyingProperties_) {
    this.propertyUpdaters_[property] = this.updateContent;
  }

  // Set default updater for the enabled state.
  this.propertyUpdaters_[apps.action.Property.ENABLED] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    control.setEnabled(!!newValue);
  };

  // Set default updater for the hint text.
  this.propertyUpdaters_[apps.action.Property.HINT] = this.updateTooltip;

  // Update the tooltip from keys, in addition to whatever previous property
  // updater we had (presumably for the content).
  this.propertyUpdaters_[apps.action.Property.KEYS] = goog.functions.sequence(
      this.updateTooltip,
      this.propertyUpdaters_[apps.action.Property.KEYS] || goog.nullFunction);

  // Set default updater for the value.
  this.propertyUpdaters_[apps.action.Property.VALUE] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    if (goog.isFunction(control.setValue)) {
      control.setValue(newValue);
    }
  };

  // Set default updater for visibility.
  this.propertyUpdaters_[apps.action.Property.VISIBLE] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    control.setVisible(!!newValue);
  };

  // Set default updater for the selected property.
  this.propertyUpdaters_[apps.action.Property.SELECTED] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    control = /** @type {goog.ui.Control} */ (control);
    if (control.isSupportedState(goog.ui.Component.State.CHECKED)) {
      // NB: control.setCheck guards against redundant sets.
      control.setChecked(!!newValue);
    }
    //  Consider how to work with setSelected and also with
    // tri-state menu items.
  };

  // Set default updater for mnemonics.
  this.propertyUpdaters_[apps.action.Property.MNEMONIC] =
      function(control, boundProperties, action, property, newValue, oldValue) {
    if (goog.isFunction(control.setMnemonic)) {
      control.setMnemonic(newValue);
    }
  };

  // Set custom property updaters (may override some/all of the default ones).
  if (opt_propertyUpdaters) {
    goog.object.extend(this.propertyUpdaters_, opt_propertyUpdaters);
  }
};
goog.inherits(apps.action.ControlBinder, goog.Disposable);


/** @override */
apps.action.ControlBinder.prototype.disposeInternal = function() {
  apps.action.ControlBinder.superClass_.disposeInternal.call(this);
  this.handler_.dispose();
  this.subscriptionManager_.dispose();
  delete this.handler_;
  delete this.subscriptionManager_;
  delete this.propertyUpdaters_;
  delete this.contentModifyingProperties_;
};


/**
 * Updates the DOM of the UI control based on the given set of bound properties,
 * replacing the current DOM contents, if any.  Creates the following DOM
 * structure:
 * <pre>
 *   <div class="office-icon goog-inline-block (base class)">
 *     <div class="office-icon-img-container (icon)"> </div>
 *   </div>
 *   <span class="(base class)-accel">(shortcut text)</span>
 *   (label)
 * </pre>
 * where
 * <ul>
 *   <li>{@code base class} is the value returned by the renderer's
 *     {@code getStructuralCssClass} method (e.g. 'goog-button' or
 *     'goog-menuitem'),
 *   <li>{@code shortcut text} is a language- and locale-neutral string
 *     describing the shortcut key associated with the action (e.g. 'Ctrl-X'),
 *   <li>and {@code label} is the text label describing the action (e.g. 'Cut').
 * </ul>
 * This is the default updater functon for {@link apps.action.Property.ICON},
 * {@link apps.action.Property.KEYS}, and {@link apps.action.Property.LABEL}.
 *
 * @param {!goog.ui.Control} control Control being updated.
 * @param {!Object.<boolean>} boundProperties Set of bound property names.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {string} property Name of the property currently being updated.
 * @param {*} newValue New value of the property being updated.
 * @param {*} oldValue Old value of the property being updated.
 * @protected
 */
apps.action.ControlBinder.prototype.updateContent = function(control,
    boundProperties, action, property, newValue, oldValue) {
  if (!(property in boundProperties)) {
    // Double-check that the property is bound, because we special-case
    // KEYS so that we still listen to it even if it is not bound.
    return;
  }

  var content = [];

  var icon = action.getProperty(apps.action.Property.ICON);
  if (icon && apps.action.Property.ICON in boundProperties) {
    content.push(this.createControlIconElement(control, icon));
  }

  var label = action.getProperty(apps.action.Property.LABEL);
  if (label && apps.action.Property.LABEL in boundProperties) {
    var labelContent;
    if (!goog.dom.isNodeLike(label)) {
      labelContent = this.prepareLabelContent_(control, String(label), action,
          boundProperties);
    } else {
      // Clone the node, so that it isn't reparented and owned by the component.
      //  Replace this with an HTML solution that doesn't
      // require nodes here.
      // Note (ziegs): The node must be wrapped in an array since it is going
      // to be added to the content array. Adding a NodeLike object directly to
      // an array with goog.array.extend will try to flatten the node, which
      // results in bad behavior as the extend function will treat a NodeLike
      // object as an array and try to expand its children, which are pointers
      // into the DOM.
      labelContent = [label.cloneNode(true)];
    }
    goog.array.extend(content, labelContent);
  }

  //if (action.areKeysVisible()) {
  //  var keys = action.getProperty(apps.action.Property.KEYS);
  //  if (keys && apps.action.Property.KEYS in boundProperties) {
  //    content.push(
  //        apps.action.ControlBinder.createShortcutElement(control, action,
  //            /** @type {string} */ (keys)));
  //  }
  //}

  control.setContent(content);
};


/**
 * Prepares the label for a control, adding a mnemonic hint if necessary.
 * @param {!goog.ui.Control} control The control being bound.
 * @param {!string} label The label text.
 * @param {!apps.action.Action} action The action being updated.
 * @param {!Object.<boolean>} boundProperties Set of bound property names.
 * @return {!goog.ui.ControlContent} The label content.
 * @private
 */
apps.action.ControlBinder.prototype.prepareLabelContent_ = function(control,
    label, action, boundProperties) {
  var mnemonic = /** @type {goog.events.KeyCodes} */ (
      action.getProperty(apps.action.Property.MNEMONIC));

  if (mnemonic && apps.action.Property.MNEMONIC in boundProperties &&
      goog.isFunction(control.setMnemonic)) {
    return controls.MenuMnemonics.createCaption(label, mnemonic);
  } else {
    return [control.getDomHelper().createTextNode(label)];
  }
};


/**
 * Updates the tooltip of the UI control based on the hint and keyboard
 * shortcuts.
 *
 * The keyboard shortcuts are only shown if there is a hint.
 *
 * @param {!goog.ui.Control} control Control being updated.
 * @param {!Object.<boolean>} boundProperties Set of bound property names.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {string} property Name of the property currently being updated.
 * @param {*} newValue New value of the property being updated.
 * @param {*} oldValue Old value of the property being updated.
 * @protected
 */
apps.action.ControlBinder.prototype.updateTooltip = function(control,
    boundProperties, action, property, newValue, oldValue) {
  // TODO(jcai):
  //return;
  if (!control.setTooltip) {
    // No tooltip support.
    return;
  }
//
  var hintToSet = apps.action.ControlBinder.createTooltipText(action);
  control.setTooltip(hintToSet);
  var el = control.getElement();
  if (this.kennedyEnabled_ && el) {
    controls.tooltipManager.setTooltipText(el, hintToSet);
  }
};


/**
 * Creates tooltip text from an action's hint and keyboard shorcut(s).
 * @param {!apps.action.Action} action The action to create tooltip text for.
 * @return {string} Relevant tooltip text or the empty string.
 */
apps.action.ControlBinder.createTooltipText = function(action) {
  var tooltipText = action.getProperty(apps.action.Property.HINT);
  if (tooltipText) {
    var keys = action.areKeysVisible() ? action.getKeys() : null;
    if (keys) {
      tooltipText += ' (' +
          apps.action.ControlBinder.createShortcutText(action, keys) + ')';
    }
  }

  return /** @type {string} */ (tooltipText || '');
};


/**
 * Creates a DOM element containing an icon, suitable to be displayed in an
 * action-bound control.  This default implementation creates the following
 * structure:
 * <pre>
 *   <div class="office-icon goog-inline-block (base class)">
 *     <div class="office-icon-img-container (icon)"> </div>
 *   </div>
 * </pre>
 * where {@code base class} is the value returned by the renderer's {@code
 * getStructuralCssClass} method, and {@code icon} is the value of the icon
 * parameter, coerced to a String, and interpreted as an icon-specific CSS
 * class name.  Apps that use a different scheme for icons should override
 * this method in a subclass.
 *
 * This approach supports high-contrast mode, for a11y. For details, see
 * http://go/shellyicons.
 *
 * @param {!goog.ui.Control} control The control.
 * @param {*} icon Icon-specific CSS class name (coerced to String).
 * @return {!Element} Icon element.
 * @protected
 */
apps.action.ControlBinder.prototype.createControlIconElement = function(control,
    icon) {
  var structuralClass = goog.getCssName(
      control.getRenderer().getStructuralCssClass(), 'icon');
  return apps.action.ControlBinder.createIconElement(
      /** @type {string} */ (icon), control.getDomHelper(), structuralClass);
};


//  The method below is redundant with the Soy template ui.icon()
// in docs/chrome/soy/ui.soy. Consider using that template here instead. It is
// not currently used because it would cause all Shelly clients to necessarily
// load Soy, which would impact performance on those not yet using it.
//  This icon approach is so widely used we should consider making
// a Closure utility for it, and using that everywhere instead of ui.soy and
// ControlBinder.createIconElement.
/**
 * Creates a DOM for an icon, using the classes specified in icon.
 *
 * This approach supports high-contrast mode, for a11y. For details, see
 * http://go/shellyicons.
 *
 * @param {string} icon The icon class, like 'office-icon-img office-icon-save'.
 * @param {goog.dom.DomHelper} domHelper DomHelper to create DOM with.
 * @param {string=} opt_extraClass An optional extra class to apply to the
 *     outer DIV. Useful for structural classes that some controls might need.
 * @param {string=} opt_title An optional title for the icon, which browsers
 *     usually display as a tooltip.
 * @return {!Element} Icon element.
 */
apps.action.ControlBinder.createIconElement = function(icon, domHelper,
    opt_extraClass, opt_title) {
  domHelper = domHelper || goog.dom.getDomHelper();
  var innerDivProperties = {};
  innerDivProperties['class'] = goog.getCssName('office-icon-img') +
      ' ' + icon;
  if (opt_title) {
    innerDivProperties['title'] = opt_title;
  }
  return domHelper.createDom(goog.dom.TagName.DIV,
      {'class': goog.getCssName('office-icon') + ' ' +
            goog.getCssName('goog-inline-block') +
            (opt_extraClass ? ' ' + opt_extraClass : '')
        /*,
        'aria-hidden': true*/
      },
      domHelper.createDom(goog.dom.TagName.DIV, innerDivProperties));
};


/**
 * Creates a DOM element containing a keyboard shortcut description, suitable to
 * be displayed in an action-bound control.  This default implementation creates
 * the following structure:
 * <pre>
 *   <span class="(base class)-accel">(shortcut text)</span>
 * </pre>
 * where {@code base class} is the value returned by the renderer's {@code
 * getStructuralCssClass} method, and {@code shortcut text} is a user-friendly
 * description of the primary keyboard shortcut for the action.
 * @param {!goog.ui.Control} control The control.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {string|!Array.<string>} keys A keyboard shortcut descriptor or an
 *     array of shortcut descriptors.
 * @return {!Element} Keyboard shortcut description element.
 */
apps.action.ControlBinder.createShortcutElement = function(
    control, action, keys) {
  //var shortcutText = apps.action.ControlBinder.createShortcutText(action, keys);
  //return control.getDomHelper().createDom(goog.dom.TagName.SPAN, {
  //  'class': goog.getCssName(
  //    control.getRenderer().getStructuralCssClass(),
  //    'accel')
  //  //'aria-label':
  //  //    apps.action.ControlBinder.createShortcutAriaLabel(shortcutText)
  //}, shortcutText);
};


//  This function has a subset of ChromeVox's character
// dictionary. These symbols are replaced with their human readable equivalents.
// Remove once ChromeVox has better support for single-character utterances in
// aria-label attributes. (b/8098554)
/**
 * Returns a screen-reader-friendly keyboard shortcut description to be used in
 * the aria-label attribute, based on the given keyboard shortcut text.
 * @param {string} shortcutText The human-readable keyboard shortcut
 *     description, to be made screen-reader-friendly.
 * @return {string} Representation of the shortcut key with symbols replaced
 *     by their human readable equivalents.
 */
//apps.action.ControlBinder.createShortcutAriaLabel = function(shortcutText) {
//  //  The page up and page down replacements need to happen before
//  // the 'hyphen' replacement. This method and {@createShortcutText} could be
//  // refactored to both take in the original keyboard shortcut to avoid this
//  // method translating the result of {@createShortcutText}.
//  /** @desc The 'page up' key used in keyboard shortcuts. */
//  var MSG_KEY_PAGE_UP = goog.getMsg('page up');
//  shortcutText = shortcutText.replace(new RegExp(
//      'pg-' + apps.action.ControlBinder.SHORTCUT_SYMBOLS_['up'], 'i'),
//      MSG_KEY_PAGE_UP);
//
//  /** @desc The 'page down' key used in keyboard shortcuts. */
//  var MSG_KEY_PAGE_DOWN = goog.getMsg('page down');
//  shortcutText = shortcutText.replace(new RegExp(
//      'pg-' + apps.action.ControlBinder.SHORTCUT_SYMBOLS_['down'], 'i'),
//      MSG_KEY_PAGE_DOWN);
//
//  /** @desc The '`' key used in keyboard shortcuts. */
//  var MSG_KEY_BACKTICK = goog.getMsg('backtick');
//  shortcutText = shortcutText.replace('`', MSG_KEY_BACKTICK);
//
//  /** @desc The '~' key used in keyboard shortcuts. */
//  var MSG_KEY_TILDE = goog.getMsg('tilde');
//  shortcutText = shortcutText.replace('~', MSG_KEY_TILDE);
//
//  /** @desc The '-' key used in keyboard shortcuts. */
//  var MSG_KEY_HYPHEN = goog.getMsg('hyphen');
//  shortcutText = shortcutText.replace('-', MSG_KEY_HYPHEN);
//
//  /** @desc The '_' key used in keyboard shortcuts. */
//  var MSG_KEY_UNDERSCORE = goog.getMsg('underscore');
//  shortcutText = shortcutText.replace('_', MSG_KEY_UNDERSCORE);
//
//  /** @desc The '=' key used in keyboard shortcuts. */
//  var MSG_KEY_EQUALS = goog.getMsg('equals');
//  shortcutText = shortcutText.replace('=', MSG_KEY_EQUALS);
//
//  /** @desc The '[' key used in keyboard shortcuts. */
//  var MSG_KEY_LEFT_BRACKET = goog.getMsg('left bracket');
//  shortcutText = shortcutText.replace('\[', MSG_KEY_LEFT_BRACKET);
//
//  /** @desc The ']' key used in keyboard shortcuts. */
//  var MSG_KEY_RIGHT_BRACKET = goog.getMsg('right bracket');
//  shortcutText = shortcutText.replace('\]', MSG_KEY_RIGHT_BRACKET);
//
//  /** @desc The ';' key used in keyboard shortcuts. */
//  var MSG_KEY_SEMICOLON = goog.getMsg('semicolon');
//  shortcutText = shortcutText.replace(';', MSG_KEY_SEMICOLON);
//
//  /** @desc The ':' key used in keyboard shortcuts. */
//  var MSG_KEY_COLON = goog.getMsg('colon');
//  shortcutText = shortcutText.replace(':', MSG_KEY_COLON);
//
//  /** @desc The ',' key used in keyboard shortcuts. */
//  var MSG_KEY_COMMA = goog.getMsg('comma');
//  shortcutText = shortcutText.replace(',', MSG_KEY_COMMA);
//
//  /** @desc The '.' key used in keyboard shortcuts. */
//  var MSG_KEY_PERIOD = goog.getMsg('period');
//  shortcutText = shortcutText.replace('.', MSG_KEY_PERIOD);
//
//  /** @desc The '/' key used in keyboard shortcuts. */
//  var MSG_KEY_SLASH = goog.getMsg('slash');
//  shortcutText = shortcutText.replace('/', MSG_KEY_SLASH);
//
//  /** @desc The '\' key used in keyboard shortcuts. */
//  var MSG_KEY_BACKSLASH = goog.getMsg('backslash');
//  shortcutText = shortcutText.replace('\\', MSG_KEY_BACKSLASH);
//
//  /** @desc The up arrow key used in keyboard shortcuts. */
//  var MSG_KEY_UP = goog.getMsg('up');
//  shortcutText = shortcutText.replace(
//      apps.action.ControlBinder.SHORTCUT_SYMBOLS_['up'], MSG_KEY_UP);
//
//  /** @desc The down arrow key used in keyboard shortcuts. */
//  var MSG_KEY_DOWN = goog.getMsg('down');
//  shortcutText = shortcutText.replace(
//      apps.action.ControlBinder.SHORTCUT_SYMBOLS_['down'], MSG_KEY_DOWN);
//
//  /** @desc The left arrow key used in keyboard shortcuts. */
//  var MSG_KEY_LEFT = goog.getMsg('left');
//  shortcutText = shortcutText.replace(
//      apps.action.ControlBinder.SHORTCUT_SYMBOLS_['left'], MSG_KEY_LEFT);
//
//  /** @desc The right arrow key used in keyboard shortcuts. */
//  var MSG_KEY_RIGHT = goog.getMsg('right');
//  shortcutText = shortcutText.replace(
//      apps.action.ControlBinder.SHORTCUT_SYMBOLS_['right'], MSG_KEY_RIGHT);
//
//  /**
//   * @desc The message to verbalize when announcing a shortcut, as in "shortcut
//   * Ctrl-X".
//   */
//  var MSG_SHORTCUT_ARIA = goog.getMsg('');
////      goog.getMsg('shortcut {$shortcutText}', {'shortcutText': shortcutText});
//
//  // Period at the end to ensure a pause when reading along with description.
//  return MSG_SHORTCUT_ARIA + '.';
//};


/**
 * Returns a user-friendly keyboard shortcut description, based on the given
 * shortcut key spec.  The argument is expected to be one or an array of
 * of shortcut keys, e.g. "Ctrl+Y" etc.  Apps that use a different format for
 * keyboard shortcuts should override this method in a subclass.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {string|!Array.<string>} keys A single string shortcut or an array of
 *     shortcuts.
 * @return {string} Language-neutral representation of the first (primary)
 *     shortcut key.
 */
apps.action.ControlBinder.createShortcutText = function(action,
    keys) {
  // Discard all but the first.
  //if (goog.isArray(keys)) {
  //  keys = keys[0];
  //}
  //
  //// Replace text with Unicode symbols.
  //for (var key in apps.action.ControlBinder.SHORTCUT_SYMBOLS_) {
  //  keys = keys.replace(new RegExp(key, 'gi'),
  //      apps.action.ControlBinder.SHORTCUT_SYMBOLS_[key]);
  //}
  //
  //// On Mac, use the command key (⌘) for either a not forced Ctrl key or a Meta
  //// key.
  //if (goog.userAgent.keyboard.MAC_KEYBOARD) {
  //  // Replace Ctrl with ⌘ if Ctrl is not forced.
  //  var replaceCtrl = !action.getProperty(apps.action.Property.FORCE_CTRL_KEY);
  //
  //  // This pattern will match Meta+[X] where [X] is no longer than one
  //  // character and is either followed by a + sign or the end of the string.
  //  var metaPattern;
  //  if (replaceCtrl) {
  //    // Also take into account Ctrl.
  //    metaPattern = /(Meta|Ctrl)\+.(\+.*)?$/;
  //  } else {
  //    metaPattern = /Meta\+.(\+.*)?$/;
  //  }
  //
  //  if (keys.match(metaPattern)) {
  //    // Remove the + sign after the ⌘ if the following string is only one
  //    // char long. e.g. ⌘A or ⌘A+B.
  //    keys = keys.replace(/Meta\+/g, '\u2318');
  //    if (replaceCtrl) {
  //      keys = keys.replace(/Ctrl\+/g, '\u2318');
  //    }
  //  } else {
  //    // Do not remove the + sign after the ⌘ if the following string is more
  //    // than one char long. e.g. ⌘+Space.
  //    keys = keys.replace(/Meta\+/g, '\u2318+');
  //    if (replaceCtrl) {
  //      keys = keys.replace(/Ctrl\+/g, '\u2318+');
  //    }
  //  }
  //}

  // Internationalize any remaining text.

  ///** @desc The 'ctrl' modifier key used in keyboard shortcuts. */
  //var MSG_KEY_CTRL = goog.getMsg('Ctrl');
  //keys = keys.replace(/Ctrl/g, MSG_KEY_CTRL);
  //
  ///** @desc The 'shift' modifier key used in keyboard shortcuts. */
  //var MSG_KEY_SHIFT = goog.getMsg('Shift');
  //keys = keys.replace(/Shift/g, MSG_KEY_SHIFT);
  //
  ///** @desc The 'alt' modifier key used in keyboard shortcuts. */
  //var MSG_KEY_ALT = goog.getMsg('Alt');
  //keys = keys.replace(/Alt/g, MSG_KEY_ALT);
  //
  ///** @desc The 'meta' modifier key used in keyboard shortcuts. */
  //var MSG_KEY_META = goog.getMsg('Meta');
  //keys = keys.replace(/Meta/g, MSG_KEY_META);
  //
  ///** @desc The 'backspace' key used in keyboard shortcuts. */
  //var MSG_KEY_BACKSPACE = goog.getMsg('backspace');
  //keys = keys.replace(/backspace/g, MSG_KEY_BACKSPACE);
  //
  ///** @desc The 'tab' key used in keyboard shortcuts. */
  //var MSG_KEY_TAB = goog.getMsg('tab');
  //keys = keys.replace(/tab/g, MSG_KEY_TAB);
  //
  ///** @desc The 'enter' key used in keyboard shortcuts. */
  //var MSG_KEY_ENTER = goog.getMsg('enter');
  //keys = keys.replace(/enter/g, MSG_KEY_ENTER);
  //
  ///** @desc The 'pause' key used in keyboard shortcuts. */
  //var MSG_KEY_PAUSE = goog.getMsg('pause');
  //keys = keys.replace(/pause/g, MSG_KEY_PAUSE);
  //
  ///** @desc The 'Caps Lock' key used in keyboard shortcuts. */
  //var MSG_KEY_CAPSLOCK = goog.getMsg('caps-lock');
  //keys = keys.replace(/caps-lock/g, MSG_KEY_CAPSLOCK);
  //
  ///** @desc The 'escape' key used in keyboard shortcuts. */
  //var MSG_KEY_ESC = goog.getMsg('esc');
  //keys = keys.replace(/esc/g, MSG_KEY_ESC);
  //
  ///** @desc The spacebar, as used in keyboard shortcuts. */
  //var MSG_KEY_SPACE = goog.getMsg('space');
  //keys = keys.replace(/space/g, MSG_KEY_SPACE);
  //
  ////  The pg-up, pg-down, home and end localizations are currently
  //// not being replaced. @see http://b/12954944
  ///** @desc The 'page up' key used in keyboard shortcuts. */
  //var MSG_KEY_PG_UP = goog.getMsg('pg-up');
  //keys = keys.replace(/pg-up/g, MSG_KEY_PG_UP);
  //
  ///** @desc The 'page down' key used in keyboard shortcuts. */
  //var MSG_KEY_PG_DOWN = goog.getMsg('pg-down');
  //keys = keys.replace(/pg-down/g, MSG_KEY_PG_DOWN);
  //
  ///** @desc The 'end' key used in keyboard shortcuts. */
  //var MSG_KEY_END = goog.getMsg('end');
  //keys = keys.replace(/end/g, MSG_KEY_END);
  //
  ///** @desc The 'home' key used in keyboard shortcuts. */
  //var MSG_KEY_HOME = goog.getMsg('home');
  //keys = keys.replace(/home/g, MSG_KEY_HOME);
  //
  ///** @desc The 'insert' key used in keyboard shortcuts. */
  //var MSG_KEY_INSERT = goog.getMsg('insert');
  //keys = keys.replace(/insert/g, MSG_KEY_INSERT);
  //
  ///** @desc The 'delete' key used in keyboard shortcuts. */
  //var MSG_KEY_DELETE = goog.getMsg('delete');
  //keys = keys.replace(/delete/g, MSG_KEY_DELETE);

  return keys;
};


/**
 * Map of shortcut key codes to language-neutral Unicode symbols.  See e.g.
 * http://unicode.org/cldr/utility/list-unicodeset.jsp?a=[:Block=Arrows:]
 * @type {!Object.<string>}
 * @private
 */
//apps.action.ControlBinder.SHORTCUT_SYMBOLS_ = {
//  'close-square-bracket': ']',
//  'dash': '-',
//  'down': '\u2193',
//  'equals': '=',
//  'left': '\u2190',
//  'num-minus': '-',
//  'num-plus': '+',
//  'open-square-bracket': '[',
//  'right': '\u2192',
//  'semicolon': ';',
//  'single-quote': '\'',
//  'up': '\u2191'
//};
//

/**
 * Binds a UI control to an action.  An action-bound control updates its
 * appearance when the associated action changes, and fires its action when
 * activated by the user.
 * @param {!goog.ui.Control} control Control to be bound to the action.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {Object.<boolean>=} opt_boundProperties Set of properties to be bound,
 *     or {@link apps.action.ControlBinder.BASIC_PROPERTIES} if unspecified.
 *     These determine primarily which properties are relevant to the control's
 *     primary display, and do not affect properties that only affect the
 *     tooltip.
 * @param {function(!goog.events.Event): *=} opt_valueFn Function to extract
 *     data from {@link goog.ui.Component.EventType.ACTION} events dispatched
 *     by the control, or {@link goog.nullFunction} if unspecified.
 * @param {!Object=} opt_diagnosticsData Diagnostics data to use when firing
 *     the action.
 */
apps.action.ControlBinder.prototype.bindControl = function(control, action,
    opt_boundProperties, opt_valueFn, opt_diagnosticsData) {
  var boundProperties = opt_boundProperties ||
      apps.action.ControlBinder.BASIC_PROPERTIES;
  var valueFn = opt_valueFn || goog.nullFunction;

  // Intialize the control's state and appearance.
  this.initializeControl(control, action, boundProperties);

  // Update the control in response to changes in the action.  No-op if the
  // changed property isn't bound to the control or if no updater function
  // is registered for the property.
  this.subscriptionManager_.subscribe(action, apps.action.Topic.CHANGE,
      function(property, newValue, oldValue) {
        // HACK(gboyer): boundProperties is generally used to control the main
        // behavior and apperance of the control.  However, KEYS should still
        // be able to update the tooltip, even if it's not in the main UI.  In
        // the future, this could be solvable by decoupling properties that are
        // bound in general by having a context-sensitive getContent that knew
        // what to do in a button versus a menu item.
        if (!control.isDisposed() && (property in boundProperties ||
            property == apps.action.Property.KEYS)) {
          this.propertyUpdaters_[property].call(this, control, boundProperties,
              action, property, newValue, oldValue);
        }
      });

  // Fire the action when the user activates the control.
  this.handler_.listen(control, goog.ui.Component.EventType.ACTION,
      function(e) {
        if (!action.getProperty(apps.action.Property.REQUIRE_DIRECT_TARGET) ||
            e.currentTarget == e.target) {
          var actionData = valueFn(e);
          if (this.fireActionDelegate_) {
            this.fireActionDelegate_.processAndFireAction(
                action, actionData, control, opt_diagnosticsData);
          } else {
            action.fireAction(actionData);
          }
        }
      });
};


/**
 * Initializes the appearance and state of the control based on an action.
 * Called from {@link #bindControl}.
 * @param {!goog.ui.Control} control Control to be initialized.
 * @param {!apps.action.Action} action Action to which the control is bound.
 * @param {!Object} properties Set of action properties that are to be bound
 *     to the control.
 * @protected
 */
apps.action.ControlBinder.prototype.initializeControl = function(control,
    action, properties) {

  if (goog.isBoolean(action.getProperty(apps.action.Property.SELECTED)) &&
      goog.isFunction(control.setCheckable)) {
    // If SELECTED property is set to a valid Boolean value, and the control
    // supports setCheckable (like menu items), go ahead and turn on
    // checkability.  This is only honored if the control is initialized
    // with a valid boolean value.
    control.setCheckable(true);
  }

  // Decorated controls don't need to have their contents recreated.  Non-
  // decorated controls only need to have their contents created once.
  var hasContent = control.wasDecorated();
  for (var property in properties) {
    if (property in this.propertyUpdaters_) {
      if (this.isContentModifying(property)) {
        if (hasContent) {
          // The control already has content, either because it was decorated
          // or because it was set while updating another content-modifying
          // property.
          continue;
        } else {
          // Proceed to setting the control's content, but set the flag to
          // prevent duplicate DOM operations.
          hasContent = true;
        }
      }
      this.propertyUpdaters_[property].call(
          this, control, properties, action, property,
          /* newValue */ action.getProperty(property), /* oldValue */ null);
    }
  }
};


/**
 * Returns true if modifying the value of the given property requires destroying
 * and recreating the control's DOM contents, false otherwise.  By default, only
 * the {@code ICON}, {@code KEYS}, and {@code LABEL} properties are content-
 * modifying, but subclasses may override this method to add new properties as
 * needed.
 * @param {string} property Property to check.
 * @return {boolean} Whether the property is content-modifying or not.
 * @protected
 */
apps.action.ControlBinder.prototype.isContentModifying = function(property) {
  return property in this.contentModifyingProperties_;
};


/**
 * Default set of bound properties, suitable for any action-bound control.
 * @type {!Object}
 */
apps.action.ControlBinder.BASIC_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);


/**
 * Set of bound properties recommended for action-bound non-toolbar buttons.
 * @type {!Object}
 */
apps.action.ControlBinder.BUTTON_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.HINT,
    apps.action.Property.LABEL,
    apps.action.Property.SELECTED,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);


/**
 * Set of bound properties recommended for action-bound menu items.
 * @type {!Object}
 */
apps.action.ControlBinder.MENU_ITEM_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.ICON,
    apps.action.Property.KEYS,
    apps.action.Property.LABEL,
    apps.action.Property.MNEMONIC,
    apps.action.Property.SELECTED,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);


/**
 * Set of bound properties recommended for action-bound popup menu items.
 * @type {!Object}
 */
apps.action.ControlBinder.POPUP_MENU_ITEM_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.ICON,
    apps.action.Property.KEYS,
    apps.action.Property.LABEL,
    apps.action.Property.SELECTED,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);


/**
 * Set of bound properties recommended for action-bound select controls.
 * @type {!Object}
 */
apps.action.ControlBinder.SELECT_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.HINT,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);


/**
 * Set of bound properties recommended for action-bound toolbar buttons.
 * @type {!Object}
 */
apps.action.ControlBinder.TOOLBAR_BUTTON_PROPERTIES = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.HINT,
    apps.action.Property.ICON,
    apps.action.Property.SELECTED,
    apps.action.Property.VALUE,
    apps.action.Property.VISIBLE);
