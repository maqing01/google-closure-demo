/**
 * @fileoverview Contains the definition of the FontConverterUtil utility.

 */

goog.provide('office.fonts.FontConverterUtil');

goog.require('office.fonts.FontFaceCssInfo');


/**
 * Returns an array of FontFaceCssInfos from the given JSON object.
 * @param {!Object} json The JSON object encapsulating one font family's
 *     metadata.
 * @return {!Array.<!office.fonts.FontFaceCssInfo>} An array of FontFaceCssInfos.
 */
office.fonts.FontConverterUtil.convertJsonToFontFaceCssInfos = function(json) {
  var fontFaceCssInfos = [];
  var fontFaces = /** @type {!Array.<!Object>} */ (json['fontFaces']);
  for (var i = 0; i < fontFaces.length; i++) {
    fontFaceCssInfos.push(
        office.fonts.FontConverterUtil.createFontFaceCssInfo_(fontFaces[i]));
  }
  return fontFaceCssInfos;
};


/**
 * Creates a FontFaceCssInfo object from JSON object.
 * @param {!Object} json The JSON object encapsulating one font face.
 * @return {!office.fonts.FontFaceCssInfo} The FontFaceCssInfo.
 * @private
 */
office.fonts.FontConverterUtil.createFontFaceCssInfo_ = function(json) {
  var jsonSources = json['sources'];
  var sources = [];
  for (var i = 0; i < jsonSources.length; i++) {
    sources.push(new office.fonts.FontFaceCssInfo.Source(
        jsonSources[i]['url'],
        !!jsonSources[i]['isLocal'],
        jsonSources[i]['format']));
  }
  return new office.fonts.FontFaceCssInfo(
      json['fontFamily'],
      !!json['menuFont'],
      json['style'],
      json['weight'],
      sources);
};


/**
 * Generates a json object by serializing an array of FontFaceCssInfos.
 * @param {!Array.<!office.fonts.FontFaceCssInfo>} fontFaceCssInfos An array of
 *     FontFaceCssInfos.
 * @return {!Object} The JSON object encapsulating metadata for font families.
 */
office.fonts.FontConverterUtil.convertFontFaceCssInfosToJson = function(
    fontFaceCssInfos) {
  var fontFaces = [];
  for (var i = 0; i < fontFaceCssInfos.length; i++) {
    fontFaces.push(
        office.fonts.FontConverterUtil.createJson_(fontFaceCssInfos[i]));
  }

  var json = {};
  json['fontFaces'] = fontFaces;
  return json;
};


/**
 * Creates a json object using the given FontFaceCssInfo object.
 * @param {!office.fonts.FontFaceCssInfo} fontFaceCssInfo The FontFaceCssInfo.
 * @return {!Object} The JSON object encapsulating one font face.
 * @private
 */
office.fonts.FontConverterUtil.createJson_ = function(fontFaceCssInfo) {
  var fontFaceCssInfoSources = fontFaceCssInfo.getSources();
  var jsonSources = [];
  for (var i = 0; i < fontFaceCssInfoSources.length; i++) {
    var jsonSource = {};
    jsonSource['url'] = fontFaceCssInfoSources[i].getUrl();
    jsonSource['isLocal'] = fontFaceCssInfoSources[i].isLocal() ? 1 : 0;
    jsonSource['format'] = fontFaceCssInfoSources[i].getFormat();
    jsonSources.push(jsonSource);
  }

  var json = {};
  json['fontFamily'] = fontFaceCssInfo.getFontFamily();
  json['style'] = fontFaceCssInfo.getStyle();
  json['weight'] = fontFaceCssInfo.getWeight();
  json['menuFont'] = fontFaceCssInfo.isMenuFont() ? 1 : 0;
  json['sources'] = jsonSources;

  return json;
};
