/**
 * @fileoverview Concrete implementation of the WebFonts capability using an
 * IndexedDB database.


 */

goog.provide('office.localstore.idb.WebFontsCapability');

goog.require('office.localstore.FontMetadata');
goog.require('office.localstore.FontMetadataUtil');
goog.require('office.localstore.Operation');
goog.require('office.localstore.WebFontsCapability');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.object');



/**
 * Concrete implementation of the WebFonts capability using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @constructor
 * @struct
 * @extends {office.localstore.WebFontsCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.WebFontsCapability = function(db, idbUtil) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;
};
goog.inherits(office.localstore.idb.WebFontsCapability,
    office.localstore.WebFontsCapability);


/** @override */
office.localstore.idb.WebFontsCapability.prototype.readAllFontMetadata = function(
    resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.FONT_METADATA],
      'Reading all font metadata', opt_errorCallback);

  this.idbUtil_.iterateIdbCursor(transaction,
      office.localstore.idb.StoreName.FONT_METADATA,
      goog.bind(this.createFontMetadataFromStore_, this),
      function(results) {
        var allMetadata = {};
        for (var i = 0, metadata; metadata = results[i]; i++) {
          allMetadata[metadata.getFontFamily()] = metadata;
        }
        resultCallback(allMetadata);
      } /* opt_successCallback */,
      undefined /* opt_lowerBound */,
      undefined /* opt_upperBound */,
      undefined /* opt_index */,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/**
 * Reads specific font metadata records using transaction passed as an argument,
 * mapping from font family name to FontMetadata record.
 * @param {!Array.<string>} fontFamilies
 * @param {!office.localstore.idb.Transaction} transaction
 * @param {function(!Object.<!office.localstore.FontMetadata>)} resultCallback
 * @private
 */
office.localstore.idb.WebFontsCapability.prototype.readFontMetadata_ =
    function(fontFamilies, transaction, resultCallback) {
  if (fontFamilies.length == 0) {
    resultCallback({});
    return;
  }
  var store = transaction.getObjectStore(
      office.localstore.idb.StoreName.FONT_METADATA);

  var expectedResultCount = fontFamilies.length;
  var results = {};
  for (var i = 0; i < fontFamilies.length; i++) {
    var request = store.get(fontFamilies[i]);
    request.setSuccessCallback(goog.bind(function(e) {
      if (!e.target.result) {
        expectedResultCount--;
        if (expectedResultCount == 0) {
          resultCallback(results);
        }
        return;
      }
      var metadata = this.createFontMetadataFromStore_(e.target.result);
      results[metadata.getFontFamily()] = metadata;

      if (goog.object.getKeys(results).length == expectedResultCount) {
        resultCallback(results);
      }
    }, this));
  }
};


/**
 * Creates a FontMetadata object from the store object that has the record
 * fields.
 * @param {!Object} obj The object from the FontMetadata store.
 * @return {!office.localstore.FontMetadata} The new FontMetadata object.
 * @private
 */
office.localstore.idb.WebFontsCapability.prototype.createFontMetadataFromStore_ =
    function(obj) {
  return office.localstore.FontMetadataUtil.createFontMetadataFromStoreData(
      obj[office.localstore.FontMetadata.Property.FONT_FAMILY],
      obj[office.localstore.FontMetadata.Property.VERSION],
      obj[office.localstore.FontMetadata.Property.FONT_FACES]);
};


/** @override */
office.localstore.idb.WebFontsCapability.prototype.readFontMetadata =
    function(fontFamilies, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.FONT_METADATA], 'Reading font metadata',
      opt_errorCallback);

  var abandonTransactionAndResultCallback = function(result) {
    transaction.abandon();
    resultCallback(result);
  };

  this.readFontMetadata_(fontFamilies, transaction,
      goog.bind(this.handleAllFontMetadataRead_, this, transaction,
          fontFamilies, abandonTransactionAndResultCallback,
          opt_errorCallback));
};


/**
 * Once all font metadata is read, use fontFamilies to select fontMetadata.
 * @param {!office.localstore.idb.Transaction} transaction The transaction.
 * @param {!Array.<string>} fontFamilies The font families used to select
 *     the results.
 * @param {function(!Array.<!office.localstore.FontMetadata>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)|undefined} errorCallback
 *     Callback for handling errors.
 * @param {!Object.<!office.localstore.FontMetadata>} allFontMetadata A map from
 *     fontFamily to FontMetadata.
 * @private
 */
office.localstore.idb.WebFontsCapability.prototype.handleAllFontMetadataRead_ =
    function(transaction, fontFamilies, resultCallback, errorCallback,
        allFontMetadata) {
  var allFontMetadataForDoc = [];
  for (var i = 0, fontFamily; fontFamily = fontFamilies[i]; i++) {
    allFontMetadataForDoc.push(allFontMetadata[fontFamily]);
  }
  resultCallback(allFontMetadataForDoc);
};


/** @override */
office.localstore.idb.WebFontsCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.FONT_METADATA];
};


/** @override */
office.localstore.idb.WebFontsCapability.prototype.performOperation = function(
    operation, transaction) {
  var fontMetadataStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.FONT_METADATA);
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateFontMetadataOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      if (updateFontMetadataOperation.isNew()) {
        fontMetadataStore.put(updateFontMetadataOperation.getModifications());
      } else {
        throw Error('FontMetadata update is not implemented.');
      }
      break;
    case office.localstore.Operation.Type.DELETE_RECORD:
      var deleteFontMetadataOperation =
          /** @type {!office.localstore.DeleteRecordOperation} */ (operation);
      this.idbUtil_.deleteFromStore(
          fontMetadataStore, deleteFontMetadataOperation.getKey());
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};
