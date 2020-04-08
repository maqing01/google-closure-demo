goog.provide('office.fonts.SupportedFontsImpl');

goog.require('office.fonts.SupportedFonts');



/**
 * A {@code office.fonts.SupportedFonts} instance that is aware of only the
 * given system fonts. For these fonts, it is assumed that they are both
 * installed and renderable without any additional work by the application.
 * @param {!Array.<string>} systemFonts
 * @param {!Object.<!Array.<string>>} localizedFonts A map of localized fonts by
 *     language.
 * @constructor
 * @struct
 * @implements {office.fonts.SupportedFonts}
 */
office.fonts.SupportedFontsImpl = function(systemFonts, localizedFonts) {
  /** @private {!Array.<string>} */
  this.systemFonts_ = systemFonts;

  /**
   * A map from a language code to an array of font families available for that
   * language.
   * @private {!Object.<!Array.<string>>}
   */
  this.localizedFonts_ = localizedFonts;

  /**
   * A map of the system font families in lower case to canonical name (standard
   * casing) for efficient lookup.
   * @private {!Object}
   */
  this.fontFamiliesMap_ = {};
  for (var i = 0; i < systemFonts.length; i++) {
    var font = systemFonts[i];
    this.fontFamiliesMap_[font.toLowerCase()] = font;
  }
  for (var language in localizedFonts) {
    var localFontFamilies = localizedFonts[language];
    for (i = 0; i < localFontFamilies.length; i++) {
      var localFontFamily = localFontFamilies[i];
      this.fontFamiliesMap_[localFontFamily.toLowerCase()] = localFontFamily;
    }
  }
};


/**
 * A map of generic families (Sans, etc.) in lower case to canonical name for
 * a substituted Vodka default font.
 * @type {!Object.<string>}
 */
office.fonts.SupportedFontsImpl.SUBSTITUTED_FONT_FAMILIES_MAP = {
  'serif' : 'Times New Roman',
  'sans-serif' : 'Arial',
  // This should ideally be a "handwriting" font like Zapf Chancery.
  'cursive' : 'Times New Roman',
  // This should be "decorative"
  // CSS2 Spec mentions Alpha Geometrique, Critter, Cottonwood, FB Reactor.
  'fantasy' : 'Comic Sans MS',
  'monospace' : 'Verdana'
};


/** @override */
office.fonts.SupportedFontsImpl.prototype.getSupportedFontFace = function(face) {
  var substitutedFonts_ =
      office.fonts.SupportedFontsImpl.SUBSTITUTED_FONT_FAMILIES_MAP;

  var canonicalName = this.getDefaultFontForFamily_(face) ||
      substitutedFonts_[face.toLowerCase()];
  return canonicalName || null;
};


/**
 * @param {string} fontFamily The font family.
 * @return {?string} Canonical name of default font, or null if not
 *     a default font.
 * @private
 */
office.fonts.SupportedFontsImpl.prototype.getDefaultFontForFamily_ =
    function(fontFamily) {
  if (fontFamily) {
    var canonicalName = this.fontFamiliesMap_[fontFamily.toLowerCase()];
    return canonicalName || null;
  }
  return null;
};


/** @override */
office.fonts.SupportedFontsImpl.prototype.getSupportedFontsForLanguage =
    function(language) {
  var localizedFontFamilies = this.localizedFonts_[language];
  if (localizedFontFamilies) {
    return localizedFontFamilies.concat(this.systemFonts_);
  }
  return this.systemFonts_;
};


/** @override */
office.fonts.SupportedFontsImpl.prototype.isFontFamilySupported =
    function(fontFamily) {
  return !!this.fontFamiliesMap_[fontFamily.toLowerCase()];
};
