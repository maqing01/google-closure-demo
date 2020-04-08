/**
 * @fileoverview Information for displaying fonts in the menu.
 *
 * For a better user experience, fonts in the font menu are displayed using
 * the actual font.  By default, to display the font name for a web font
 * using the font, the web font would need to be downloaded.  As the menu
 * could contain many fonts, many downloads would take place, and the menu
 * would take a long time to load.
 *
 * To optimize the display of the font menu, rather than retrieving the
 * full web font from the server, a highly optimized font file (containing
 * just the glyphs of the font family name) is retrieved.  Further, to reduce
 * the number of requests, the optimized font files are inlined and returned
 * in a single font menu CSS file.
 *
 * Some browers (in particular Internet Explorer) only retrieve a single
 * web font per font family name.  Thus, for the font menu the server
 * specifies an alternate font family name (for use in styling the font
 * menu item).
 *
 * Thus, each FontMenuInfo contains three fields:
 *  o  displayName - the name to display in the menu, e.g. "Inconsolata"
 *  o  menuFont - the font family name which is used to style the
 *                menu item (e.g. "Inconsolata::Menu"), and maps to the
 *                highly optimized font file.
 *  o  appFont - the font family which is used by the application throughout
 *               the document.
 *
 * Note: Certain fonts (in particular the symbol fonts like WingDings)
 * require a different (or translated) displayName.
 *

 */

goog.provide('office.fonts.FontMenuInfo');



/**
 * A data object used in displaying the fonts in an application menu.
 * @param {string} displayName The display name of the font family.
 * @param {string=} opt_menuFont The font to use to render the display name in
 *     the menu. If unspecified the default value is displayName.
 * @param {string=} opt_appFont A font family if it is different than the
 *     display name. If unspecified the default value is displayName.
 * @constructor
 * @struct
 */
office.fonts.FontMenuInfo = function(displayName, opt_menuFont, opt_appFont) {
  this.displayName_ = displayName;
  this.menuFont_ = opt_menuFont || displayName;
  this.appFont_ = opt_appFont || displayName;
};


/**
 * @return {string} The display name of the font which will appear in the menu.
 */
office.fonts.FontMenuInfo.prototype.getDisplayName = function() {
  return this.displayName_;
};


/**
 * @return {string} The font family to use when styling the font in the menu.
 */
office.fonts.FontMenuInfo.prototype.getMenuFont = function() {
  return this.menuFont_;
};


/**
 * @return {string} The font family.
 */
office.fonts.FontMenuInfo.prototype.getAppFont = function() {
  return this.appFont_;
};
