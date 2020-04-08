

/**
 * @fileoverview The Docs Cloudboard UI plugin for the Cloudboard menu.
 *

 */

goog.provide('office.clipboard.ui.UiPlugin');

goog.require('office.Action');
goog.require('office.clipboard.ui.Plugin');
goog.require('goog.array');
goog.require('goog.dom.classes');



/**
 * Provides UI functionality specific to Docs clipboard UI rendered in the
 * Cloudboard menu. The menu must first be defined using
 * {@code office.menu.defineClipboardMenu}.
 *
 * @param {!apps.action.MenuManager} menuManager The menu manager to be used.
 * @constructor
 * @struct
 * @extends {office.clipboard.ui.Plugin}
 */
office.clipboard.ui.UiPlugin = function(menuManager) {
  office.clipboard.ui.Plugin.call(this, menuManager, office.Action.CLIPBOARD,
      office.Action.CLIPBOARD_COPY);
};
goog.inherits(office.clipboard.ui.UiPlugin, office.clipboard.ui.Plugin);


/**
 * The number of pastable items that have been rendered in the 'paste' section
 * of the UI.
 *
 * @type {number}
 * @private
 */
office.clipboard.ui.UiPlugin.prototype.numPastableItemsRendered_ = 0;


/**
 * The menu item index where the 'paste' section of the UI starts.
 *
 * @type {number}
 * @private
 */
office.clipboard.ui.UiPlugin.PASTE_SECTION_INDEX_ = 2;


/**
 * The index of the 'clear all items' menu item.
 *
 * @type {number}
 * @private
 */
office.clipboard.ui.UiPlugin.CLEAR_ALL_ITEM_INDEX_ = 3;


/** @override */
office.clipboard.ui.UiPlugin.prototype.init = function() {
  office.Action.CLIPBOARD_CLEAR_ITEMS.setVisible(false);
  goog.dom.classes.add(this.getMenu().getChildAt(
      office.clipboard.ui.UiPlugin.CLEAR_ALL_ITEM_INDEX_).
          getContentElement(),
      goog.getCssName('office-clipboard-clearall'));
};


/** @override */
office.clipboard.ui.UiPlugin.prototype.getPasteSectionMenu =
    function() {
  return this.getMenu();
};


/** @override */
office.clipboard.ui.UiPlugin.prototype.removeAllPastableItems =
    function() {
  var menu = this.getMenu();
  for (var i = 0; i < this.numPastableItemsRendered_; i++) {
    menu.removeChildAt(
        office.clipboard.ui.UiPlugin.PASTE_SECTION_INDEX_, true);
  }
  this.numPastableItemsRendered_ = 0;

  var clearAllMenuItem = menu.getChildAt(
      office.clipboard.ui.UiPlugin.CLEAR_ALL_ITEM_INDEX_);
  clearAllMenuItem.setVisible(false);
};


/** @override */
office.clipboard.ui.UiPlugin.prototype.addPastableItems = function(
    menuItems) {
  var menu = this.getMenu();
  var clearAllMenuItem = menu.getChildAt(
      office.clipboard.ui.UiPlugin.CLEAR_ALL_ITEM_INDEX_);

  goog.array.forEachRight(menuItems, function(menuItem) {
    menu.addChildAt(menuItem,
        office.clipboard.ui.UiPlugin.PASTE_SECTION_INDEX_, true);
  });

  clearAllMenuItem.setVisible(menuItems.length > 0);
  this.numPastableItemsRendered_ = menuItems.length;
};
