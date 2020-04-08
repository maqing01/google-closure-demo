goog.provide('office.localstore.WebFontsCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');



/**
 * Base class for the WebFonts capability which manages reading and writing the
 * office.localstore.FontMetadata record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.WebFontsCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.WebFontsCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.WebFontsCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.FONT_METADATA];
};


/**
 * Reads all font metadata records from the database, mapping from font family
 * name to FontMetadata record.
 * @param {function(!Object.<!office.localstore.FontMetadata>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.WebFontsCapability.prototype.readAllFontMetadata =
    goog.abstractMethod;


/**
 * Gets font metadata records for a document.
 * @param {!Array.<string>} fontFamilies Font families for which to deliver the
 *     results.
 * @param {function(!Array.<!office.localstore.FontMetadata>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.WebFontsCapability.prototype.readFontMetadata =
    goog.abstractMethod;


/** @override */
office.localstore.WebFontsCapability.prototype.getKeyForRecord =
    function(record) {
  var fontMetadata = /** @type {!office.localstore.FontMetadata} */ (record);
  return fontMetadata.getFontFamily();
};


/** @override */
office.localstore.WebFontsCapability.prototype.isOperationSupported =
    function(operation) {
  if (!goog.base(this, 'isOperationSupported', operation)) {
    return false;
  }
  if (operation.getType() == office.localstore.Operation.Type.UPDATE_RECORD) {
    // FontMetadata update is not implemented.
    var updateFontMetadataOperation =
        /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
    return updateFontMetadataOperation.isNew();
  }
  return true;
};
