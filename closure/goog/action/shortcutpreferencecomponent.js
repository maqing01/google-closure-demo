

/**
 * @fileoverview Class that shows banner which displays and can be used to
 * toggle whether shortcuts are enabled.
 *

 */

goog.provide('apps.action.ShortcutPreferenceComponent');

goog.require('apps.action.prefLinkTemplate');
goog.require('apps.action.prefTextTemplate');
goog.require('apps.action.shortcutPrefComponentTemplate');
goog.require('goog.dom.classes');
goog.require('goog.events.actionEventWrapper');
goog.require('goog.soy');
goog.require('goog.ui.Component');



/**
 * Banner that displays and toggles whether shortcuts are enabled.
 * @param {Function} prefEnabledFn Function to call to
 *     determine whether shortcuts are enabled.
 * @param {Function} prefToggleFn Function to call to toggle
 *     whether shortcuts are enabled.
 * @param {goog.dom.DomHelper} domHelper DOM helper.
 * @constructor
 * @extends {goog.ui.Component}
 */
apps.action.ShortcutPreferenceComponent = function(prefEnabledFn,
    prefToggleFn, domHelper) {
  goog.base(this, domHelper);

  /**
   * @type {Function}
   * @private
   */
  this.enabledFn_ = prefEnabledFn;

  /**
   * @type {Function}
   * @private
   */
  this.toggleFn_ = prefToggleFn;

  /**
   * @type {goog.dom.DomHelper}
   * @private
   */
  this.domHelper_ = domHelper;
};
goog.inherits(apps.action.ShortcutPreferenceComponent, goog.ui.Component);


/**
 * Prefixes used for DOM ids of elements in this widget
 * @enum {string}
 */
apps.action.ShortcutPreferenceComponent.Id = {
  CONTAINER: 'spc_cont',
  TEXT: 'spc_text',
  LINK: 'spc_link'
};


/** @override */
apps.action.ShortcutPreferenceComponent.prototype.createDom = function() {
  this.decorateInternal(this.dom_.createElement('div'));
};


/** @override */
apps.action.ShortcutPreferenceComponent.prototype.decorateInternal =
    function(element) {
  this.setElementInternal(element);
  goog.soy.renderElement(element, apps.action.shortcutPrefComponentTemplate, {
    enabled: this.enabledFn_(),
    containerId:
        this.makeId(apps.action.ShortcutPreferenceComponent.Id.CONTAINER),
    textId:
        this.makeId(apps.action.ShortcutPreferenceComponent.Id.TEXT),
    linkId:
        this.makeId(apps.action.ShortcutPreferenceComponent.Id.LINK)
  });
};


/** @override */
apps.action.ShortcutPreferenceComponent.prototype.enterDocument = function() {
  this.getHandler().listenWithWrapper(
      this.domHelper_.getElement(
          this.makeId(apps.action.ShortcutPreferenceComponent.Id.LINK)),
      goog.events.actionEventWrapper,
      this.toggleFn_);
};


/**
 * Ensure the banner accurately displays the current status of keyboard
 * shortcuts.
 */
apps.action.ShortcutPreferenceComponent.prototype.refreshShortcutsEnabled =
    function() {
  var enabled = this.enabledFn_();

  var textEl = this.domHelper_.getElement(
      this.makeId(apps.action.ShortcutPreferenceComponent.Id.TEXT));
  goog.soy.renderElement(textEl, apps.action.prefTextTemplate, {
    enabled: enabled
  });

  var linkEl = this.domHelper_.getElement(
      this.makeId(apps.action.ShortcutPreferenceComponent.Id.LINK));
  goog.soy.renderElement(linkEl, apps.action.prefLinkTemplate, {
    enabled: enabled
  });

  var containerEl = this.domHelper_.getElement(
      this.makeId(apps.action.ShortcutPreferenceComponent.Id.CONTAINER));
  goog.dom.classes.enable(containerEl,
      goog.getCssName('CSS_SHORTCUTS_HELP_POPUP_PREF_ENABLED'),
      enabled);
};

