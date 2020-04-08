/**
 * @fileoverview Definition of office.text.fonts.FontRequestId.

 */

goog.provide('office.fonts.FontFetchRequestId');

goog.require('office.storage.FetchRequestId');



/**
 * A {@type office.storage.FetchRequestId} with a font family.
 * @param {string} fontFamily The font family.
 * @implements {office.storage.FetchRequestId}
 * @constructor
 * @struct
 */
office.fonts.FontFetchRequestId = function(fontFamily) {
  /**
   * The font family.
   * @type {string}
   * @private
   */
  this.fontFamily_ = fontFamily;
};


/**
 * @return {string} The font family.
 */
office.fonts.FontFetchRequestId.prototype.getFontFamily = function() {
  return this.fontFamily_;
};


/** @override */
office.fonts.FontFetchRequestId.prototype.getCanonicalString = function() {
  return 'Font' + office.storage.FetchRequestId.CANONICAL_STRING_SEPARATOR +
      this.fontFamily_;
};
