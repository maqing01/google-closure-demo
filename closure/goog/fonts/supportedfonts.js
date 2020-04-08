

/**
 * @fileoverview Contains an interface for mapping font names to supported
 * font names.

 */

goog.provide('office.fonts.SupportedFonts');



/**
 * An interface that designates whether a font is both installed and able to be
 * rendered by the application.
 * @interface
 */
office.fonts.SupportedFonts = function() {};


/**
 * Determines if a font face is supported, and retrieves its canonical font face
 * name. The method recognizes generic names such as 'monospace', and will
 * return the default substitute for that font.
 * @param {string} face Font face to look up.
 * @return {?string} Canonical name, or null if font not recognized.
 */
office.fonts.SupportedFonts.prototype.getSupportedFontFace =
    goog.abstractMethod;


/**
 * Checks whether the input font is supported.
 * @param {string} fontFamily The input font family.
 * @return {boolean} Whether the input font family is supported.
 */
office.fonts.SupportedFonts.prototype.isFontFamilySupported = goog.abstractMethod;


/**
 * Returns the fonts supported for the given language.
 * @param {string} language
 * @return {!Array.<string>} The names of the supported fonts for the given
 *     language.
 */
office.fonts.SupportedFonts.prototype.getSupportedFontsForLanguage =
    goog.abstractMethod;
