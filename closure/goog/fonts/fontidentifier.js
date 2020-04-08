

/**
 * @fileoverview An identifier for a web font, represented by the font family
 *     name, style and weight.

 */

goog.provide('office.fonts.FontIdentifier');
goog.provide('office.fonts.FontIdentifier.Style');
goog.provide('office.fonts.FontIdentifier.Weight');

goog.require('goog.object');



/**
 * A class representing a font identifier. It is composed
 * of the name, the weight and the style of the font.
 * @param {string} family The font family.
 * @param {office.fonts.FontIdentifier.Weight=} opt_weight The weight of the
 *     font (optional).
 * @param {office.fonts.FontIdentifier.Style=} opt_style The style of the font
 *     (optional).
 * @constructor
 * @struct
 */
office.fonts.FontIdentifier = function(family, opt_weight, opt_style) {

  /**
   * The font family (e.g. font-family: 'Arial')
   * @type {string}
   * @private
   */
  this.family_ = family;

  /**
   * The font weight (e.g. font-weight: bold)
   * @type {office.fonts.FontIdentifier.Weight}
   * @private
   */
  this.weight_ = goog.isDef(opt_weight) ? opt_weight :
      office.fonts.FontIdentifier.Weight.NORMAL;

  /**
   * The font style (e.g. font-weight: italic)
   * @type {office.fonts.FontIdentifier.Style}
   * @private
   */
  this.style_ = goog.isDef(opt_style) ? opt_style :
      office.fonts.FontIdentifier.Style.NORMAL;

  /**
   * The font identifier.
   * @type {string}
   * @private
   */
  this.identifier_ = [this.family_, this.weight_, this.style_].join(
      office.fonts.FontIdentifier.SEPARATOR_);
};


/**
 * The separator string for the fields within an identifier.
 * @private {string}
 * @const
 */
office.fonts.FontIdentifier.SEPARATOR_ = '-';


/**
 * A string constant for "normal" (which could be a style or weight).
 * @type {string}
 * @private
 */
office.fonts.FontIdentifier.NORMAL_ = 'normal';


/**
 * An enum of possible weights.
 * @enum {string}
 */
office.fonts.FontIdentifier.Weight = {
  BOLD: 'bold',
  NORMAL: office.fonts.FontIdentifier.NORMAL_
};


/**
 * The set of possible weight values.
 * @private {!Object.<boolean>}
 * @const
 */
office.fonts.FontIdentifier.WEIGHT_VALUES_ = goog.object.createSet(
    office.fonts.FontIdentifier.Weight.BOLD,
    office.fonts.FontIdentifier.Weight.NORMAL);


/**
 * A map of FontIdentifier.Weight values to their numeric value.
 * @private {!Object.<office.fonts.FontIdentifier.Weight, number>}
 * @const
 */
office.fonts.FontIdentifier.WEIGHT_NUMERIC_VALUES_ = goog.object.create(
    office.fonts.FontIdentifier.Weight.NORMAL,
    400,
    office.fonts.FontIdentifier.Weight.BOLD,
    700);


/**
 * An enum of possible styles.
 * @enum {string}
 */
office.fonts.FontIdentifier.Style = {
  ITALIC: 'italic',
  NORMAL: office.fonts.FontIdentifier.NORMAL_
};


/**
 * The set of possible style values.
 * @private {!Object.<boolean>}
 * @const
 */
office.fonts.FontIdentifier.STYLE_VALUES_ = goog.object.createSet(
    office.fonts.FontIdentifier.Style.ITALIC,
    office.fonts.FontIdentifier.Style.NORMAL);


/**
 * Returns the font identifier.
 * @return {string} The string representation of the font identifier.
 */
office.fonts.FontIdentifier.prototype.getIdentifier = function() {
  return this.identifier_;
};


/**
 * Returns the font family name.
 * @return {string} The font family name.
 */
office.fonts.FontIdentifier.prototype.getFontFamily = function() {
  return this.family_;
};


/**
 * Returns the font weight.
 * @return {office.fonts.FontIdentifier.Weight} The font weight.
 */
office.fonts.FontIdentifier.prototype.getWeight = function() {
  return this.weight_;
};


/**
 * Returns the font weight as a numeric value.
 * @return {number}
 */
office.fonts.FontIdentifier.prototype.getWeightValue = function() {
  return office.fonts.FontIdentifier.WEIGHT_NUMERIC_VALUES_[this.weight_];
};


/**
 * Returns the font style.
 * @return {office.fonts.FontIdentifier.Style} The font style.
 */
office.fonts.FontIdentifier.prototype.getStyle = function() {
  return this.style_;
};


/**
 * Checks if a office.fonts.FontIdentifier is equal to another one.
 * @param {Object} fontIdentifier The object for which to test for equality.
 * @return {boolean} True if they are equal, false otherwise.
 */
office.fonts.FontIdentifier.prototype.equals = function(fontIdentifier) {
  return goog.isDefAndNotNull(fontIdentifier) &&
      goog.isDefAndNotNull(fontIdentifier.getIdentifier) &&
      this.identifier_ == fontIdentifier.getIdentifier();
};


/**
 * Creates a font identifier object from the given identifier string.
 * @param {string} identifier The string used to describe the font identifier.
 *     This should be in the same format as the result of
 *     {@code #getIdentifier}.
 * @return {!office.fonts.FontIdentifier}
 */
office.fonts.FontIdentifier.create = function(identifier) {
  var parts = identifier.split(office.fonts.FontIdentifier.SEPARATOR_);
  if (parts.length != 3) {
    throw Error('Invalid identifier string used to create a font identifier.');
  }

  if (!office.fonts.FontIdentifier.WEIGHT_VALUES_[parts[1]]) {
    throw Error('Invalid weight used to create a font identifier.');
  }

  if (!office.fonts.FontIdentifier.STYLE_VALUES_[parts[2]]) {
    throw Error('Invalid style used to create a font identifier.');
  }

  return new office.fonts.FontIdentifier(
      parts[0],
      /** @type {office.fonts.FontIdentifier.Weight} */ (parts[1]),
      /** @type {office.fonts.FontIdentifier.Style} */ (parts[2]));
};
