

/**
 * @fileoverview An interface for retrieving menu fonts.

 */

goog.provide('office.fonts.MenuFontProvider');
goog.provide('office.fonts.MenuFontProvider.EventType');

goog.require('goog.events.EventTarget');



/**
 * An interface for a class that provides font menu infos.
 * @extends {goog.events.EventTarget}
 * @constructor
 * @struct
 */
office.fonts.MenuFontProvider = function() {
  goog.base(this);
};
goog.inherits(office.fonts.MenuFontProvider, goog.events.EventTarget);


/**
 * The event dispatched by the menu font provider.
 * @enum {string}
 */
office.fonts.MenuFontProvider.EventType = {
  CHANGE: 'change'
};


/**
 * Gets the menu fonts.
 * @return {!Array.<!office.fonts.FontMenuInfo>} The menu fonts.
 */
office.fonts.MenuFontProvider.prototype.getMenuFonts = goog.abstractMethod;


/**
 * Gets recent menu fonts.
 * @return {!Array.<!office.fonts.FontMenuInfo>} Recent menu fonts.
 */
office.fonts.MenuFontProvider.prototype.getRecentMenuFonts = goog.abstractMethod;


/**
 * Gets whether or not to show the add more item.
 * @return {boolean} Whether or not to show the add more item.
 */
office.fonts.MenuFontProvider.prototype.getIncludeAddMoreItem =
    goog.abstractMethod;


/**
 * Gets the newly added user fonts.
 * @return {!Array.<string>} The newly added user fonts.
 */
office.fonts.MenuFontProvider.prototype.getNewlyAddedUserFonts =
    goog.abstractMethod;


/**
 * Clears the newly added user fonts.
 */
office.fonts.MenuFontProvider.prototype.clearNewlyAddedUserFonts =
    goog.abstractMethod;
