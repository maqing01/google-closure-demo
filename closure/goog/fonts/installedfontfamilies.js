goog.provide('office.fonts.InstalledFontFamilies');

goog.require('goog.object');



/**
 * InstalledFontFamilies keeps track of requested font variations and whether
 * or not all variations have installed.
 * @constructor
 * @struct
 */
office.fonts.InstalledFontFamilies = function() {
  /**
   * Map from font family to a set of requested variations to the status of that
   * variation. When the last variation requested has been installed we'll
   * redraw all instances of that font family in the document.
   *
   * Ex: {
   * 'arial' : {
   * 'arial-bold-italic' : 'requested'
   * 'arial-normal-normal' : 'installed'
   * }
   * }
   * @private {!Object.<!Object.<
   *      office.fonts.InstalledFontFamilies.Status_>>}
   */
  this.installedFontFamilies_ = {};
};


/**
 * The set of possible statuses.
 * @enum {string}
 * @private
 */
office.fonts.InstalledFontFamilies.Status_ = {
  ERRORED: 'errored',
  INSTALLED: 'installed',
  REQUESTED: 'requested'
};


/**
 * Returns whether or not the status is considered complete.
 * @param {office.fonts.InstalledFontFamilies.Status_} status The status.
 * @return {boolean} Whether the status is complete.
 * @private
 */
office.fonts.InstalledFontFamilies.prototype.isComplete_ = function(status) {
  return status == office.fonts.InstalledFontFamilies.Status_.ERRORED ||
      status == office.fonts.InstalledFontFamilies.Status_.INSTALLED;
};


/**
 * Marks a variation of a font family as having been requested.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 */
office.fonts.InstalledFontFamilies.prototype.setRequested =
    function(fontIdentifier) {
  this.set_(
      fontIdentifier,
      office.fonts.InstalledFontFamilies.Status_.REQUESTED,
      false /* overwrite */);
};


/**
 * Marks a variation of the provided font family as having been installed.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 */
office.fonts.InstalledFontFamilies.prototype.setInstalled = function(
    fontIdentifier) {
  this.set_(
      fontIdentifier,
      office.fonts.InstalledFontFamilies.Status_.INSTALLED,
      true /* overwrite */);
};


/**
 * Marks a variation of the provided font family as having had an error.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 */
office.fonts.InstalledFontFamilies.prototype.setErrored = function(
    fontIdentifier) {
  this.set_(
      fontIdentifier,
      office.fonts.InstalledFontFamilies.Status_.ERRORED,
      true /* overwrite */);
};


/**
 * Marks a variation of the provided font family as having the given status.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 * @param {office.fonts.InstalledFontFamilies.Status_} status The status.
 * @param {boolean} overwrite Whether to overwrite the current status of the
 *     identifier.
 * @private
 */
office.fonts.InstalledFontFamilies.prototype.set_ = function(
    fontIdentifier, status, overwrite) {
  var fontFamily = fontIdentifier.getFontFamily();
  var variation = fontIdentifier.getIdentifier();

  if (!this.installedFontFamilies_[fontFamily]) {
    this.installedFontFamilies_[fontFamily] = {};
  }

  if (overwrite || !this.installedFontFamilies_[fontFamily][variation]) {
    this.installedFontFamilies_[fontFamily][variation] = status;
  }
};


/**
 * Returns whether or not any font variations were requested.
 * @param {string} fontFamily The font family.
 * @return {boolean} Whether or not any font variations were requested.
 */
office.fonts.InstalledFontFamilies.prototype.hasAnyVariationRequested =
    function(fontFamily) {
  return !!this.installedFontFamilies_[fontFamily];
};


/**
 * Returns whether or not all variations requested have been marked as
 * installed.
 * @param {string} fontFamily The font family.
 * @return {boolean} Whether or not all variations have installed. Returns false
 *    if no variations have been requested.
 */
office.fonts.InstalledFontFamilies.prototype.haveAllVariationsInstalled =
    function(fontFamily) {
  var variations = this.installedFontFamilies_[fontFamily];
  if (!variations) {
    return false;
  }

  for (var variation in variations) {
    if (variations[variation] !=
        office.fonts.InstalledFontFamilies.Status_.INSTALLED) {
      return false;
    }
  }
  return true;
};


/**
 * Returns whether or not all variations requested have completed the install
 * flow, successfully or unsuccessfully.
 * @param {string} fontFamily The font family.
 * @return {boolean} Whether or not all variations have completed. Returns false
 *    if no variations have been requested.
 */
office.fonts.InstalledFontFamilies.prototype.haveAllVariationsCompleted =
    function(fontFamily) {
  var variations = this.installedFontFamilies_[fontFamily];
  if (!variations) {
    return false;
  }

  for (var variation in variations) {
    var status = variations[variation];
    if (!this.isComplete_(status)) {
      return false;
    }
  }
  return true;
};


/**
 * Returns all the variations of this font family that have been requested.
 * @param {string} fontFamily The font family.
 * @return {!Array.<string>} The requested variations.
 */
office.fonts.InstalledFontFamilies.prototype.getRequestedVariations = function(
    fontFamily) {
  var variations = this.installedFontFamilies_[fontFamily];
  return variations ? goog.object.getKeys(variations) : [];
};


/**
 * Returns all the variations of this font family that have installed.
 * @param {string} fontFamily The font family.
 * @return {!Array.<string>} The installed variations
 */
office.fonts.InstalledFontFamilies.prototype.getInstalledVariations = function(
    fontFamily) {
  return this.getVariations_(
      fontFamily, office.fonts.InstalledFontFamilies.Status_.INSTALLED);
};


/**
 * Returns all the variations of this font family that failed to load.
 * @param {string} fontFamily The font family.
 * @return {!Array.<string>} The failed font variations.
 */
office.fonts.InstalledFontFamilies.prototype.getFailedVariations = function(
    fontFamily) {
  return this.getVariations_(
      fontFamily, office.fonts.InstalledFontFamilies.Status_.ERRORED);
};


/**
 * Returns all the variations of this font family that have the requested
 * status.
 * @param {string} fontFamily
 * @param {office.fonts.InstalledFontFamilies.Status_} targetStatus
 * @return {!Array.<string>} The variations.
 * @private
 */
office.fonts.InstalledFontFamilies.prototype.getVariations_ = function(
    fontFamily, targetStatus) {
  var variations = this.installedFontFamilies_[fontFamily];
  if (!variations) {
    return [];
  }

  var targetVariations = [];
  for (var variation in variations) {
    var status = variations[variation];
    if (status == targetStatus) {
      targetVariations.push(variation);
    }
  }
  return targetVariations;
};
