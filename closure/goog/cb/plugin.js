goog.provide('office.clipboard.ui.Plugin');



/**
 * Superclass for all Docs clipboard UI plugins, which provide UI
 * functionality specific to a given context. Context in this case refers to
 * the possible location of the Docs clipboard UI, i.e. within the Docs
 * Clouboard toolbar menu, or within the Shelly 'edit' menu.
 *
 * @param {!apps.action.MenuManager} menuManager The menu manager to be used.
 * @param {!apps.action.Action} menuAction The action that corresponds to the
 *    menu in which Docs clipboard UI is rendered.
 * @param {!apps.action.Action} copyAction The action that corresponds to the
 *    'copy' operation.
 * @constructor
 * @struct
 */
office.clipboard.ui.Plugin = function(menuManager, menuAction, copyAction) {
  /**
   * The menu manager.
   * @type {!apps.action.MenuManager}
   * @protected
   */
  this.menuManager = menuManager;

  /**
   * The action corresponding to the menu containing the Docs clipboard UI.
   * @type {!apps.action.Action}
   * @private
   */
  this.menuAction_ = menuAction;

  /**
   * The action corresponding to the 'copy' operation.
   * @type {!apps.action.Action}
   * @private
   */
  this.copyAction_ = copyAction;
};


/**
 * Returns the menu containing the Docs Clipboard UI.
 *
 * @return {!goog.ui.Menu} The returned menu.
 */
office.clipboard.ui.Plugin.prototype.getMenu = function() {
  return this.menuManager.getMenu(this.menuAction_.getId());
};


/**
 * Returns the action corresponding to the 'copy' operation.
 *
 * @return {!apps.action.Action} The returned action.
 */
office.clipboard.ui.Plugin.prototype.getCopyAction = function() {
  return this.copyAction_;
};


/**
 * Initializes this paste layout with using the given menu manager.
 */
office.clipboard.ui.Plugin.prototype.init = goog.abstractMethod;


/**
 * Returns the menu containing the 'paste' section of the UI.
 *
 * @return {!goog.ui.Menu} The returned menu.
 */
office.clipboard.ui.Plugin.prototype.getPasteSectionMenu = goog.abstractMethod;


/**
 * Removes all the pastable items from the 'paste' section of the UI.
 */
office.clipboard.ui.Plugin.prototype.removeAllPastableItems =
    goog.abstractMethod;


/**
 * Adds the specified pastable menu items to the 'paste' section of the UI.
 * NOTE: The assumption is that {@link #removeAllPastableItems} was called
 * prior to calling this method.
 *
 * @param {!Array.<!goog.ui.MenuItem>} menuItems The given pastable menu items.
 */
office.clipboard.ui.Plugin.prototype.addPastableItems = goog.abstractMethod;
