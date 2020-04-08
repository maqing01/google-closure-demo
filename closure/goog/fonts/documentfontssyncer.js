/**
 * @fileoverview Contains the definition of
 * {@code office.fonts.DocumentFontsSyncer}.

 */

goog.provide('office.fonts.DocumentFontsSyncer');

goog.require('office.localstore.StartupHint');
goog.require('goog.json');


/**
 * Syncs the font metadata and files referenced in the local document record
 * using a font fetch trigger.
 * @param {!office.localstore.Document} localDocument The local document for
 *     which to sync fonts.
 * @param {!office.fonts.FontFetchTrigger} fontFetchTrigger The font fetch
 *     trigger used to retrieve and update the font metadata and files.
 * @param {function()} successCallback The success callback.
 * @param {function(!Error)=} opt_errorCallback The optional error callback.
 */
office.fonts.DocumentFontsSyncer.syncDocumentFonts = function(
    localDocument, fontFetchTrigger, successCallback, opt_errorCallback) {
  var errorCallback = opt_errorCallback || goog.nullFunction;
  var hintedFonts =
      office.fonts.DocumentFontsSyncer.getFontFamiliesFromStartupHints(
          localDocument);
  if (hintedFonts.length) {
    var deferredResult = fontFetchTrigger.fetch(hintedFonts);
    deferredResult.addCallbacks(successCallback, errorCallback);
  } else {
    successCallback();
  }
};


/**
 * Gets the font families listed in the startup hints for the given document.
 * @param {!office.localstore.Document} localDocument The document record.
 * @return {!Array.<string>} The font families in the startup hints.
 */
office.fonts.DocumentFontsSyncer.getFontFamiliesFromStartupHints = function(
    localDocument) {
  var startupHint = localDocument.getStartupHints() || {};
  var hintedFonts = startupHint[office.localstore.StartupHint.FONT_FAMILIES];
  try {
    return hintedFonts ?
        /** @type {!Array.<string>} */ (goog.json.parse(hintedFonts)) :
        [];
  } catch (e) {
    // One document with invalid fonts shouldn't cause the entire document sync
    // to fail.
    return [];
  }
};


/**
 * Sets the font families for the given document.
 * @param {!office.localstore.Document} localDocument The document record.
 * @param {!Array.<string>} fontFamilies The font families.
 */
office.fonts.DocumentFontsSyncer.setFontFamiliesForStartupHints = function(
    localDocument, fontFamilies) {
  localDocument.setStartupHint(
      office.localstore.StartupHint.FONT_FAMILIES,
      goog.json.serialize(fontFamilies));
};

