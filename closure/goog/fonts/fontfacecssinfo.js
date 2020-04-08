/**
 * @fileoverview A class used to hold CSS info for fonts.

 */

goog.provide('office.fonts.FontFaceCssInfo');
goog.provide('office.fonts.FontFaceCssInfo.Source');



/**
 * An object that represents the set of metadata associated with a font
 * identifier used to generate CSS for that font.
 * @param {string} fontFamily The font family name.
 * @param {boolean} isMenuFont Whether this represents a menu font.
 * @param {string} style The font style.
 * @param {number} weight The font weight.
 * @param {!Array.<!office.fonts.FontFaceCssInfo.Source>} sources Source
 *     information for the font identifier.
 * @constructor
 * @struct
 */
office.fonts.FontFaceCssInfo = function(
    fontFamily, isMenuFont, style, weight, sources) {
  /**
   * @type {string}
   * @private
   */
  this.fontFamily_ = fontFamily;

  /**
   * @type {boolean}
   * @private
   */
  this.isMenuFont_ = isMenuFont;

  /**
   * @type {string}
   * @private
   */
  this.style_ = style;

  /**
   * @type {number}
   * @private
   */
  this.weight_ = weight;

  /**
   * @type {!Array.<!office.fonts.FontFaceCssInfo.Source>}
   * @private
   */
  this.sources_ = sources;
};


/** @return {string} The font family name. */
office.fonts.FontFaceCssInfo.prototype.getFontFamily = function() {
  return this.fontFamily_;
};


/** @return {boolean} Whether or not the font is a menu font. */
office.fonts.FontFaceCssInfo.prototype.isMenuFont = function() {
  return this.isMenuFont_;
};


/** @return {string} The font style. */
office.fonts.FontFaceCssInfo.prototype.getStyle = function() {
  return this.style_;
};


/** @return {number} The font weight. */
office.fonts.FontFaceCssInfo.prototype.getWeight = function() {
  return this.weight_;
};


/**
 * @return {!Array.<!office.fonts.FontFaceCssInfo.Source>} The font source
 *     information.
 */
office.fonts.FontFaceCssInfo.prototype.getSources = function() {
  return this.sources_;
};


/**
 * @return {office.fonts.FontFaceCssInfo.Source} The non-local source information.
 */
office.fonts.FontFaceCssInfo.prototype.getNonLocalSource = function() {
  var sources = this.getSources();
  for (var i = 0; i < sources.length; i++) {
    if (!sources[i].isLocal()) {
      return sources[i];
    }
  }
  return null;
};


/**
 * Creates the source urls in a single string for css generation or null the
 * sources do not contain exactly one non-local url.
 * @return {?string}
 */
office.fonts.FontFaceCssInfo.prototype.getSourceString = function() {
  var sourceString = '';

  // We have to find exactly one non-local source.
  var nonLocalUrl = null;
  var sources = this.getSources();
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    if (source.isLocal()) {
      var name = source.getUrl();
      sourceString += 'local(\'' + name + '\'), ';
    } else {
      if (nonLocalUrl) {
        // Multiple non-local urls are defined.
        return null;
      }
      nonLocalUrl = source.getUrl();
    }
  }
  if (!nonLocalUrl) {
    // No non-local urls are defined.
    return null;
  }
  sourceString += 'url(' + nonLocalUrl + ')';

  return sourceString;
};



/**
 * An object that represents source information for a font identifier.
 * @param {string} url The source url for the font.
 * @param {boolean} isLocal Whether this source entry is locally-addressable.
 * @param {string} format The font format.
 * @constructor
 * @struct
 */
office.fonts.FontFaceCssInfo.Source = function(url, isLocal, format) {
  /**
   * @type {string}
   * @private
   */
  this.url_ = url;

  /**
   * @type {boolean}
   * @private
   */
  this.isLocal_ = isLocal;

  /**
   * @type {string}
   * @private
   */
  this.format_ = format;
};


/** @return {string} The source url for the font. */
office.fonts.FontFaceCssInfo.Source.prototype.getUrl = function() {
  return this.url_;
};


/** @return {boolean} Whether this source entry is locally-addressable. */
office.fonts.FontFaceCssInfo.Source.prototype.isLocal = function() {
  return this.isLocal_;
};


/** @return {string} The font format. */
office.fonts.FontFaceCssInfo.Source.prototype.getFormat = function() {
  return this.format_;
};
