
/**
 * @fileoverview Contains the definition of the office.localstore.FontMetadata
 * class.

 */

goog.provide('office.localstore.FontMetadata');

goog.require('office.localstore.Record');



/**
 * A font metadata record.
 * @param {string} fontFamily The font family name.
 * @param {string} version The version.
 * @param {!Array.<!office.localstore.FontMetadata.FontFace>} fontFaces The font
 *     faces.
 * @param {boolean} isNew Whether this is a new record, with no presence in
 *      local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.FontMetadata = function(fontFamily, version, fontFaces, isNew) {
  goog.base(this, office.localstore.Record.Type.FONT_METADATA, isNew);

  this.
      setProperty(office.localstore.FontMetadata.Property.FONT_FAMILY,
          fontFamily).
      setProperty(office.localstore.FontMetadata.Property.VERSION, version).
      setProperty(office.localstore.FontMetadata.Property.FONT_FACES,
          this.createFontFaceRecords_(fontFaces));
};
goog.inherits(office.localstore.FontMetadata, office.localstore.Record);


/**
 * Properties in v6 of the schema.
 * @enum {string}
 */
office.localstore.FontMetadata.Property = {
  FONT_FACES: '11',
  FONT_FAMILY: '12',
  VERSION: '13'
};


/**
 * @param {string} fontFamily The font family name.
 */
office.localstore.FontMetadata.prototype.setFontFamily = function(fontFamily) {
  this.setProperty(
      office.localstore.FontMetadata.Property.FONT_FAMILY, fontFamily);
};


/**
 * @return {string} The font family name.
 */
office.localstore.FontMetadata.prototype.getFontFamily = function() {
  return this.getStringProperty(
      office.localstore.FontMetadata.Property.FONT_FAMILY);
};


/**
 * @return {string} The version.
 */
office.localstore.FontMetadata.prototype.getVersion = function() {
  return this.getStringProperty(office.localstore.FontMetadata.Property.VERSION);
};


/**
 * @param {string} version The version.
 */
office.localstore.FontMetadata.prototype.setVersion = function(version) {
  this.setProperty(office.localstore.FontMetadata.Property.VERSION, version);
};


/**
 * @return {!Array.<!office.localstore.FontMetadata.FontFace>} The font faces.
 */
office.localstore.FontMetadata.prototype.getFontFaces = function() {
  var fontFaceRecords = this.getProperty(
      office.localstore.FontMetadata.Property.FONT_FACES);
  var fontFaces = [];
  for (var i = 0; i < fontFaceRecords.length; i++) {
    var fontFaceRecord = fontFaceRecords[i];
    var sources = [];
    var sourceRecords = fontFaceRecord[
        office.localstore.FontMetadata.FontFace.Property.SOURCE];
    for (var j = 0; j < sourceRecords.length; j++) {
      var sourceRecord = sourceRecords[j];
      sources.push(new office.localstore.FontMetadata.Url(
          sourceRecord[office.localstore.FontMetadata.Url.Property.FORMAT],
          sourceRecord[
              office.localstore.FontMetadata.Url.Property.IS_SYSTEM_FONT],
          sourceRecord[office.localstore.FontMetadata.Url.Property.URL]));
    }

    fontFaces.push(new office.localstore.FontMetadata.FontFace(
        fontFaceRecord[
            office.localstore.FontMetadata.FontFace.Property.FONT_FAMILY],
        fontFaceRecord[
            office.localstore.FontMetadata.FontFace.Property.IS_MENU_FONT],
        fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.STYLE],
        fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.WEIGHT],
        sources));
  }

  return fontFaces;
};


/**
 * @param {!Array.<!office.localstore.FontMetadata.FontFace>} fontFaces The font
 *     faces.
 */
office.localstore.FontMetadata.prototype.setFontFaces = function(fontFaces) {
  this.setProperty(office.localstore.FontMetadata.Property.FONT_FACES,
      this.createFontFaceRecords_(fontFaces));
};


/**
 * @param {!Array.<!office.localstore.FontMetadata.FontFace>} fontFaces The font
 *     faces.
 * @return {!Array.<!Object>} Simple objects suitable for persisting to the db.
 * @private
 */
office.localstore.FontMetadata.prototype.createFontFaceRecords_ = function(
    fontFaces) {
  var fontFaceRecords = [];
  for (var i = 0; i < fontFaces.length; i++) {
    var fontFace = fontFaces[i];
    var sources = fontFace.getSource();
    var sourceRecords = [];
    for (var j = 0; j < sources.length; j++) {
      var source = sources[j];
      var sourceRecord = {};
      sourceRecord[office.localstore.FontMetadata.Url.Property.FORMAT] =
          source.format_;
      sourceRecord[office.localstore.FontMetadata.Url.Property.IS_SYSTEM_FONT] =
          source.isSystemFont_;
      sourceRecord[office.localstore.FontMetadata.Url.Property.URL] =
          source.url_;
      sourceRecords.push(sourceRecord);
    }

    var fontFaceRecord = {};
    fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.FONT_FAMILY] =
        fontFace.fontFamily_;
    fontFaceRecord[
        office.localstore.FontMetadata.FontFace.Property.IS_MENU_FONT] =
        fontFace.isMenuFont_;
    fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.SOURCE] =
        sourceRecords;
    fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.STYLE] =
        fontFace.style_;
    fontFaceRecord[office.localstore.FontMetadata.FontFace.Property.WEIGHT] =
        fontFace.weight_;
    fontFaceRecords.push(fontFaceRecord);
  }

  return fontFaceRecords;
};



/**
 * A wrapper for the FontMetadata's child font faces.
 * @param {string} fontFamily The font family name.
 * @param {boolean} isMenuFont Whether this is a menu font.
 * @param {string} style The font style.
 * @param {number} weight The font weight.
 * @param {!Array.<!office.localstore.FontMetadata.Url>} source The source urls.
 * @constructor
 * @struct
 */
office.localstore.FontMetadata.FontFace = function(
    fontFamily, isMenuFont, style, weight, source) {
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
   * @type {!Array.<!office.localstore.FontMetadata.Url>}
   * @private
   */
  this.source_ = source;
};


/**
 * Properties in v6 of the schema.
 * @enum {string}
 */
office.localstore.FontMetadata.FontFace.Property = {
  FONT_FAMILY: '11',
  IS_MENU_FONT: '12',
  SOURCE: '13',
  STYLE: '14',
  WEIGHT: '15'
};


/**
 * @return {string} The font family name.
 */
office.localstore.FontMetadata.FontFace.prototype.getFontFamily = function() {
  return this.fontFamily_;
};


/**
 * @return {boolean} Whether this is a menu font.
 */
office.localstore.FontMetadata.FontFace.prototype.isMenuFont = function() {
  return this.isMenuFont_;
};


/**
 * @return {string} The font style.
 */
office.localstore.FontMetadata.FontFace.prototype.getStyle = function() {
  return this.style_;
};


/**
 * @return {number} The font weight.
 */
office.localstore.FontMetadata.FontFace.prototype.getWeight = function() {
  return this.weight_;
};


/**
 * @return {!Array.<!office.localstore.FontMetadata.Url>} The source urls.
 */
office.localstore.FontMetadata.FontFace.prototype.getSource = function() {
  return this.source_;
};



/**
 * A wrapper for the FontMetadata.FontFace child source URLs.
 * @param {string} format The font format.
 * @param {boolean} isSystemFont Whether this is a system font.
 * @param {string} url The url for the font.
 * @constructor
 * @struct
 */
office.localstore.FontMetadata.Url = function(format, isSystemFont, url) {
  /**
   * @type {string}
   * @private
   */
  this.format_ = format;

  /**
   * @type {boolean}
   * @private
   */
  this.isSystemFont_ = isSystemFont;

  /**
   * @type {string}
   * @private
   */
  this.url_ = url;
};


/**
 * Properties in v6 of the schema.
 * @enum {string}
 */
office.localstore.FontMetadata.Url.Property = {
  FORMAT: '11',
  IS_SYSTEM_FONT: '12',
  URL: '13'
};


/**
 * @return {string} The font format.
 */
office.localstore.FontMetadata.Url.prototype.getFormat = function() {
  return this.format_;
};


/**
 * @return {boolean} Whether this is a system font.
 */
office.localstore.FontMetadata.Url.prototype.isSystemFont = function() {
  return this.isSystemFont_;
};


/**
 * @return {string} The url for the font.
 */
office.localstore.FontMetadata.Url.prototype.getUrl = function() {
  return this.url_;
};
