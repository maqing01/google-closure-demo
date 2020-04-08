

/**
 * @fileoverview Class definition for Menu Reference.

 */

goog.provide('apps.action.MenuReference');

/**
 * Reference to a menu.
 * @param {string} menuId the id of the menu.
 * @constructor
 */
apps.action.MenuReference = function(menuId) {
  /**
   * The menu id the reference points to.
   * @type {string}
   * @private
   */
  this.id_ = menuId;
};


/**
 * Returns the id of the referenced menu.
 * @return {string} the id of the referenced menu.
 */
apps.action.MenuReference.prototype.getId = function() {
  return this.id_;
};
