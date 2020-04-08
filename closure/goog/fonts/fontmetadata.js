goog.provide('office.fonts.FontMetadata');



/**
 * @param {!Object.<!Array.<!office.fonts.FontFaceCssInfo>>} fontFaceMap
 *     Information required for generating the font-faces for each font family
 *     in the map.
 * @param {string} version The font version.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @constructor
 * @struct
 */
office.fonts.FontMetadata = function(fontFaceMap, version, errorReporter) {
  /**
   * Information required for generating the font-faces for each font family in
   * the map.
   * @type {!Object.<!Array.<!office.fonts.FontFaceCssInfo>>}
   * @private
   */
  this.fontFaceMap_ = fontFaceMap;

  /**
   * The version.
   * @type {string}
   * @private
   */
  this.version_ = version;

  /**
   * The map from remote URLs to fileIds.
   * @type {!Object.<string>}
   * @private
   */
  this.urlToFileIdMap_ = this.buildUrlToFileIdMap_(errorReporter);
};


/**
 * The map from font format type to file extension.
 * Keep this in sync with the map in
 * {@code java/com/google/apps/themes/v2/common/Type.java}.
 * @type {!Object.<string>}
 * @private
 */
office.fonts.FontMetadata.formatToExtensionMap_ = {
  'truetype': '.ttf',
  'embedded-opentype': '.eot',
  'svg': '.svg',
  'swf': '.swf',
  'woff': '.woff',
  'woff2': '.woff2'
};


/**
 * Gets the information required for generating font-face rules for a font
 * family.
 * @return {!Object.<!Array.<!office.fonts.FontFaceCssInfo>>} The font face map.
 */
office.fonts.FontMetadata.prototype.getFontFaceMap = function() {
  return this.fontFaceMap_;
};


/** @return {string} The font version. */
office.fonts.FontMetadata.prototype.getVersion = function() {
  return this.version_;
};


/** @return {!Object.<string>} The map from remote URLs to fileIds. */
office.fonts.FontMetadata.prototype.getUrlToFileIdMap = function() {
  return this.urlToFileIdMap_;
};


/**
 * Returns the map from remote source urls to fileIds. File Ids are extracted
 * from remote source url, located between version and format.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @return {!Object.<string>} The map from remote urls to fileIds.
 * @private
 */
office.fonts.FontMetadata.prototype.buildUrlToFileIdMap_ = function(
    errorReporter) {
  var urlToFileIdMap = {};
  for (var fontFamily in this.fontFaceMap_) {
    var fontFaces = this.fontFaceMap_[fontFamily];
    for (var i = 0, fontFace; fontFace = fontFaces[i]; i++) {
      for (var j = 0, source; source = fontFace.getSources()[j]; j++) {
        if (!source.isLocal()) {
          // Font urls come in three forms: .../version/FILE_ID.format,
          // .../licensed/font?kit=FILE_ID and .../licensed/font/FILE_ID.
          var url = source.getUrl();
          var extension =
              office.fonts.FontMetadata.formatToExtensionMap_[source.getFormat()];
          //var re = '(licensed\\/font\\/|licensed\\/font\\?kit=|' +
          //    this.version_ + '\\/)([^\/.]+)(' + extension + ')?$';
          var re = '';
          var found = url.match(re);
          // found[0] contains ['licensed'|version, end of url],
          // found[1] contains ['licensed'|version, beginning of fileId),
          // found[2] contains the entire fileId
          // found[3] contains (fileId, end of url) which is either '.'+format
          // or undefined.
          var fileId = (found && found.length == 4) ? found[2] : null;
          // Use both the fileId and extension when available. When a valid
          // extension is not available, save the font without one and rely on
          // chrome to use it as a generic binary file. This will likely cause
          // MIME type warnings on the console but the webfont will still
          // render.
          urlToFileIdMap[url] = fileId ? fileId + (extension || '') : null;
          if (!extension) {
            errorReporter.log(
                Error('Missing font file extension for format ' +
                    source.getFormat()));
          }
        }
      }
    }
  }
  return urlToFileIdMap;
};
