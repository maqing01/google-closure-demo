goog.provide('office.fonts.FontUtil');

goog.require('office.flag.FlagService');
goog.require('office.fonts.FontFaceCssInfo');
goog.require('office.fonts.FontMetadata');
goog.require('office.fonts.FontPreference');
goog.require('office.sync.SyncObject');
goog.require('goog.array');
goog.require('goog.object');


/**
 * The key path prefix of the sync objects in which application font families
 * are stored.
 * @type {!Array.<string>}
 * @const
 */
office.fonts.FontUtil.APPLICATION_FONTS_KEY_PATH_PREFIX = [
  office.sync.SyncObject.Types.SYNC_MAP, 'applicationFonts'
];


/**
 * The key under which font families are stored in application font sync
 * objects.
 * @type {string}
 */
office.fonts.FontUtil.FONT_FAMILIES_SYNC_MAP_KEY = 'value';


/**
 * Creates office.font.FontMetadata from office.localstore.FontMetadata.
 * @param {!office.localstore.FontMetadata} fontMetadataRecord Font metadata
 *     record.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @return {!office.fonts.FontMetadata} font metadata object.
 */
office.fonts.FontUtil.createFontMetadataFromRecord = function(
    fontMetadataRecord, errorReporter) {
  var fontFamily = fontMetadataRecord.getFontFamily();
  var fontFacesFromRecord = fontMetadataRecord.getFontFaces();
  var fontFacesForMetadata = [];
  for (var i = 0; i < fontFacesFromRecord.length; i++) {
    var fontFace = fontFacesFromRecord[i];
    var sources = [];
    for (var s = 0; s < fontFace.getSource().length; s++) {
      var sourceRecord = fontFace.getSource()[s];
      sources.push(new office.fonts.FontFaceCssInfo.Source(
          sourceRecord.getUrl(),
          sourceRecord.isSystemFont(),
          sourceRecord.getFormat()));
    }
    fontFacesForMetadata.push(new office.fonts.FontFaceCssInfo(
        fontFace.getFontFamily(),
        fontFace.isMenuFont(),
        fontFace.getStyle(),
        fontFace.getWeight(),
        sources));
  }
  var fontFaceMap = {};
  fontFaceMap[fontFamily] = fontFacesForMetadata;

  return new office.fonts.FontMetadata(
      fontFaceMap, fontMetadataRecord.getVersion(), errorReporter);
};


/**
 * A regular expression for extracting fonts from a filesystem url.
 * Matches filesystem:https://path/to/fonts/$fileId$
 * @type {RegExp}
 * @private
 */
office.fonts.FontUtil.FONT_ID_EXTRACTION_RE_ = new RegExp('/fonts/([^\/]+)$');


/**
 * Extracts the file id from the font face file local URL. The file id is
 * extracted from the local URL since the file id is not stored in FontMetadata
 * records.
 * @param {string} localFontFaceUrl The local URL of a font face.
 * @return {string?} The file id corresponding to the given local URL or null
 *     if the match failed.
 */
office.fonts.FontUtil.extractFileId = function(localFontFaceUrl) {
  var match = localFontFaceUrl.match(
      office.fonts.FontUtil.FONT_ID_EXTRACTION_RE_);
  return match ? match[1] : null;
};


/**
 * Gets the default font families from the given flags.
 * @param {string} enableDefaultFontFamiliesFLag
 * @param {string} defaultFontFamiliesFlag
 * @return {!Array.<string>} The default font families.
 */
office.fonts.FontUtil.getDefaultFontFamilies = function(
    enableDefaultFontFamiliesFLag, defaultFontFamiliesFlag) {
  var flags = office.flag.FlagService.getInstance();
  return flags.getBoolean(enableDefaultFontFamiliesFLag) ?
      /** @type {!Array.<string>} */ (goog.object.getValues(
          flags.getJsonObject(defaultFontFamiliesFlag))) :
      /** @type {!Array.<string>} */ ([]);
};

