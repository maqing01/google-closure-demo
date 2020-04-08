

/**
 * @fileoverview Abstract base class for a menu item provider.

 */

goog.provide('apps.action.MenuItemProvider');

goog.require('apps.action.Action');
goog.require('goog.Disposable');



/**
 * Abstract base class for menu item providers.
 * @constructor
 * @extends {goog.Disposable}
 */
apps.action.MenuItemProvider = function() {
  goog.Disposable.call(this);
};
goog.inherits(apps.action.MenuItemProvider, goog.Disposable);


/**
 * A clone of apps.action.MenuManager.Item to avoid circular dependencies.
 * @typedef {null|!apps.action.Action|function(goog.ui.Menu)|
 *      !Array.<apps.action.MenuItemProvider.Item>|
 *      apps.action.MenuItemProvider|goog.ui.MenuItem}
 */
apps.action.MenuItemProvider.Item;


/**
 * Provides the menu items.
 * @param {!apps.action.ControlBinder} controlBinder The control binder to use
 *     for binding to provided menu items.
 * @return {!Array.<apps.action.MenuItemProvider.Item>} The menu items.
 */
apps.action.MenuItemProvider.prototype.provide = goog.abstractMethod;
