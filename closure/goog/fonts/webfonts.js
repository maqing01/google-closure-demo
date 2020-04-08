


/**
 * @fileoverview Encapsulates all of the web fonts information (available fonts
 *     used fonts, web fonts CSS, font menu link, ... etc) as returned by the
 *     server.
 *


 */
goog.provide('office.fonts.WebFonts');

goog.require('office.fonts.FontMenuInfo');
goog.require('office.fonts.WebFontsChangeEvent');
goog.require('goog.array');
goog.require('goog.events.EventTarget');



/**
 * The Web Fonts information as returned by the server.
 * @param {!Array.<string>} blacklist The elements that should be removed from
 *     the map of tracked fonts.
 * @extends {goog.events.EventTarget}
 * @constructor
 * @struct
 */
office.fonts.WebFonts = function(blacklist) {
  goog.base(this);

  var blacklistObj = {};
  for (var i = 0; i < blacklist.length; i++) {
    blacklistObj[blacklist[i]] = true;
  }

  /**
   * Elements that should not be included in tracked fonts.
   * @type {!Object.<boolean>}
   * @private
   */
  this.blacklist_ = blacklistObj;

  /**
   * A map of the FontFaceCssInfos by font family name.
   * @type {!Object.<!Array.<!office.fonts.FontFaceCssInfo>>}
   * @private
   */
  this.fontFaceCssInfosMap_ = {};

  /**
   * A map from font family name (not the menu font name) to the FontFaceCssInfo
   * for that menu font.
   * @type {!Object.<!office.fonts.FontFaceCssInfo>}
   * @private
   */
  this.menuFontFaceCssInfosMap_ = {};

  /**
   * Available font names (map of lower case to correct case).
   * @type {!Object.<string>}
   * @private
   */
  this.availableFontNames_ = {};
};
goog.inherits(office.fonts.WebFonts, goog.events.EventTarget);


/**
 * Updates the internal font map either based off of the deserialized server
 * the map of {@code office.font.FontFaceCssInfo} arrays.
 * @param {!Object.<string, !Array.<!office.fonts.FontFaceCssInfo>>}
 *     fontFaceCssInfos A map of font family name to arrays of
 *     {@code office.fonts.FontFaceCssInfo} objects.
 */
office.fonts.WebFonts.prototype.update = function(fontFaceCssInfos) {
  if (fontFaceCssInfos) {
    for (var fontFamily in fontFaceCssInfos) {
      var cssInfos = fontFaceCssInfos[fontFamily];
      this.updateMenuFont_(fontFamily, cssInfos);
      if (cssInfos.length) {
        this.fontFaceCssInfosMap_[fontFamily] = cssInfos;
        this.availableFontNames_[fontFamily.toLowerCase()] = fontFamily;
      }
    }
  }

  this.removeBlacklistedFonts_();

  // Dispatch an event with the available added fonts (those which are not
  // blacklisted). Do not fire an event if all the added fonts are blacklisted.
  var addedFontNames = [];
  for (var font in fontFaceCssInfos) {
    if (this.fontFaceCssInfosMap_[font]) {
      addedFontNames = addedFontNames.concat(font);
    }
  }
  if (addedFontNames.length > 0) {
    this.dispatchEvent(new office.fonts.WebFontsChangeEvent(
        this, addedFontNames));
  }
};


/**
 * Updates the internal state with new menu font information.
 * @param {!Object.<!Array.<!office.fonts.FontFaceCssInfo>>} fontFaceCssInfoMap
 *     A map of font family names (not menu font names) to an array of font face
 *     css infos. This array will be mutated to remove the css info for the menu
 *     font if it exists.
 */
office.fonts.WebFonts.prototype.updateMenuFonts = function(fontFaceCssInfoMap) {
  for (var fontFamily in fontFaceCssInfoMap) {
    this.updateMenuFont_(fontFamily, fontFaceCssInfoMap[fontFamily]);
  }
  this.removeBlacklistedFonts_();
};


/**
 * Updates the internal state with a menu font for the given family.
 * @param {string} fontFamily The name of the font family (not the menu font).
 * @param {!Array.<!office.fonts.FontFaceCssInfo>} cssInfos The array of font face
 *     css infos. This array will be mutated to remove the css info for the menu
 *     font if it exists.
 * @private
 */
office.fonts.WebFonts.prototype.updateMenuFont_ = function(fontFamily, cssInfos) {
  var menuFont = this.getMenuFontCssInfoFromCssInfos_(cssInfos);
  if (menuFont) {
    this.menuFontFaceCssInfosMap_[fontFamily] = menuFont;
    goog.array.remove(cssInfos, menuFont);
  }
};


/**
 * Returns a list of available font family names for display on the font
 * family menu.
 * @return {!Array.<string>} The list of available font family names.
 */
office.fonts.WebFonts.prototype.getAvailableFonts = function() {
  var availableFonts = [];
  for (var font in this.availableFontNames_) {
    availableFonts.push(this.availableFontNames_[font]);
  }
  return availableFonts;
};


/**
 * Gets whether the given font family is available.
 * @param {string} family The font family.
 * @return {boolean} Whether the font family is available.
 */
office.fonts.WebFonts.prototype.isFontAvailable = function(family) {
  return !!this.fontFaceCssInfosMap_[family];
};


/**
 * Gets whether the menu font for the given font family is available.
 * @param {string} family The font family.
 * @return {boolean} Whether the menu font for the font family is available.
 */
office.fonts.WebFonts.prototype.isMenuFontAvailable = function(family) {
  return !!this.menuFontFaceCssInfosMap_[family];
};


/**
 * Gets FontFaceCssInfo array for the given font family.
 * @param {string} family The font family.
 * @return {?Array.<!office.fonts.FontFaceCssInfo>} The FontFaceCssInfo array for
 *     the given font family. Null if there is no data for the given family.
 */
office.fonts.WebFonts.prototype.getCssInfosForFont = function(family) {
  var fontFaceCssInfos = this.fontFaceCssInfosMap_[family];
  return fontFaceCssInfos ? fontFaceCssInfos : null;
};


/**
 * Gets the FontFaceCssInfo for the given font identifier.
 * @param {!office.fonts.FontIdentifier} identifier
 * @return {office.fonts.FontFaceCssInfo} The FontFaceCssInfo for the given font
 *     identifier. Null if there is no data present.
 */
office.fonts.WebFonts.prototype.getCssInfoForIdentifier = function(identifier) {
  var fontFaceCssInfos = this.getCssInfosForFont(identifier.getFontFamily());
  if (!fontFaceCssInfos) {
    return null;
  }
  for (var i = 0; i < fontFaceCssInfos.length; i++) {
    var cssInfo = fontFaceCssInfos[i];
    if (cssInfo.getStyle() == identifier.getStyle() &&
        cssInfo.getWeight() == identifier.getWeightValue()) {
      return cssInfo;
    }
  }
  return null;
};


/**
 * @return {!Array.<!office.fonts.FontFaceCssInfo>} The list of FontFaceCssInfos
 *     that represent the available menu fonts.
 */
office.fonts.WebFonts.prototype.getMenuFontCssInfos = function() {
  var cssInfos = [];
  for (var font in this.menuFontFaceCssInfosMap_) {
    cssInfos.push(this.menuFontFaceCssInfosMap_[font]);
  }
  return cssInfos;
};


/**
 * Returns the FontFaceCssInfo that represents the menu font from the given
 * array of FontFaceCssInfos if it exists, otherwise return null.
 * @param {!Array.<!office.fonts.FontFaceCssInfo>} cssInfos An array of
 *     FontFaceCssInfos.
 * @return {office.fonts.FontFaceCssInfo} The FontFaceCssInfo that represents the
 *     menu font if it exists, otherwise null.
 * @private
 */
office.fonts.WebFonts.prototype.getMenuFontCssInfoFromCssInfos_ = function(
    cssInfos) {
  if (cssInfos) {
    for (var i = 0; i < cssInfos.length; i++) {
      var cssInfo = cssInfos[i];
      if (cssInfo.isMenuFont()) {
        return cssInfo;
      }
    }
  }
  return null;
};


/**
 * Returns a font menu info for the provided font if the font data for it
 * exists, otherwise it returns null.
 * @param {string} familyName The font family name.
 * @return {office.fonts.FontMenuInfo} The font menu info for the provided
 *    font or null if no information is available.
 */
office.fonts.WebFonts.prototype.getFontMenuInfoForFont = function(familyName) {
  var fontCssInfo = this.menuFontFaceCssInfosMap_[familyName];
  return !!fontCssInfo ?
      new office.fonts.FontMenuInfo(familyName, fontCssInfo.getFontFamily()) :
      null;
};


/**
 * Gets a canonical font name for an available font.
 * @param {string} fontName The font name (case insensitive).
 * @return {?string} Returns the canonical font name for the provided font.
 *    returns null if the font is not available.
 */
office.fonts.WebFonts.prototype.getCanonicalFontName = function(fontName) {
  return this.availableFontNames_[fontName.toLowerCase()] || null;
};


/**
 * Removes fonts in the blacklist.
 * @private
 */
office.fonts.WebFonts.prototype.removeBlacklistedFonts_ = function() {
  for (var familyName in this.fontFaceCssInfosMap_) {
    if (this.blacklist_[familyName]) {
      delete this.fontFaceCssInfosMap_[familyName];
    }
  }
  for (var familyName in this.menuFontFaceCssInfosMap_) {
    if (this.blacklist_[familyName]) {
      delete this.menuFontFaceCssInfosMap_[familyName];
    }
  }
  for (var familyName in this.availableFontNames_) {
    var canonicalName = this.availableFontNames_[familyName];
    if (this.blacklist_[canonicalName]) {
      delete this.availableFontNames_[familyName];
    }
  }
};
