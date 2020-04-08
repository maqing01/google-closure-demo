/**
 * @fileoverview Contains a class for filtering out webfonts that are already
 * installed to the WebFonts object.

 */

goog.provide('office.fonts.FontFilter');



/**
 * Filters lists of fonts to remove ones that are already installed.
 * @param {!office.fonts.SupportedFonts} systemSupportedFonts
 * @param {office.fonts.WebFonts=} opt_webFonts The webfonts object.
 * @constructor
 * @struct
 */
office.fonts.FontFilter = function(systemSupportedFonts, opt_webFonts) {
  /** @private {!office.fonts.SupportedFonts} */
  this.systemSupportedFonts_ = systemSupportedFonts;

  /**
   * The web fonts object.
   * @type {office.fonts.WebFonts}
   * @private
   */
  this.webFonts_ = opt_webFonts || null;
};


/**
 * Given a set of fonts, returns the fonts that have not already been installed.
 * @param {!Array.<string>} fonts The fonts to check.
 * @return {!Array.<string>} The fonts that have not already been installed.
 */
office.fonts.FontFilter.prototype.filter = function(fonts) {
  var filteredFonts = [];
  for (var i = 0; i < fonts.length; i++) {
    // Filter out all system fonts.
    var isSystemFont =
        this.systemSupportedFonts_.isFontFamilySupported(fonts[i]);
    var fontInstalled = this.webFonts_ ?
        this.webFonts_.isFontAvailable(fonts[i]) :
        false;
    if (!isSystemFont && !fontInstalled) {
      filteredFonts.push(fonts[i]);
    }
  }

  return filteredFonts;
};
