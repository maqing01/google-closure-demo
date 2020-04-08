/**
 * @fileoverview Utility functions for converting between the internal
 * object representations in the database for font metadata and corresponding
 * localstore objects.
 */

goog.provide('office.localstore.FontMetadataUtil');

goog.require('office.localstore.FontMetadata');


/**
 * Creates a FontMetadata object from the store object.
 * @param {string} fontFamily The font family
 * @param {string} version The font version
 * @param {!Array.<!Object>} fontFaceRecords The font face object from the
 *     store object, in the format determined by {@code
 *     office.localstore.FontMetadata.setFontFaces}.
 * @return {!office.localstore.FontMetadata} The new FontMetadata object.
 */
office.localstore.FontMetadataUtil.createFontMetadataFromStoreData =
    function(fontFamily, version, fontFaceRecords) {
  var fontFaces = [];
  for (var i = 0, fontFaceObj; fontFaceObj = fontFaceRecords[i]; i++) {
    var sourceObjects =
        fontFaceObj[office.localstore.FontMetadata.FontFace.Property.SOURCE];
    var sources = [];
    for (var j = 0, sourceObj; sourceObj = sourceObjects[j]; j++) {
      var fontMetadataUrl = new office.localstore.FontMetadata.Url(
          sourceObj[office.localstore.FontMetadata.Url.Property.FORMAT],
          sourceObj[office.localstore.FontMetadata.Url.Property.IS_SYSTEM_FONT],
          sourceObj[office.localstore.FontMetadata.Url.Property.URL]);
      sources.push(fontMetadataUrl);
    }
    var fontFace = new office.localstore.FontMetadata.FontFace(
        fontFaceObj[office.localstore.FontMetadata.FontFace.Property.FONT_FAMILY],
        fontFaceObj[
            office.localstore.FontMetadata.FontFace.Property.IS_MENU_FONT],
        fontFaceObj[office.localstore.FontMetadata.FontFace.Property.STYLE],
        fontFaceObj[office.localstore.FontMetadata.FontFace.Property.WEIGHT],
        sources);
    fontFaces.push(fontFace);
  }
  var fontMetadata = new office.localstore.FontMetadata(
      fontFamily, version, fontFaces, false /* isNew */);
  fontMetadata.markAsInitialized();
  return fontMetadata;
};

