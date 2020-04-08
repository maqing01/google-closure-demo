goog.provide('office.fonts.FontPreferenceChangeEvent');

goog.require('office.fonts.EventType');
goog.require('goog.events.Event');



/**
 * A web fonts preference change event that is fired when the font preference
 * changes.
 * @param {boolean} isRecentFont Whether the added fonts were recent fonts.
 * @param {!Array.<string>} userFontsAdded The user added fonts.
 * @param {!Array.<string>} userFontsRemoved The user removed fonts.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.fonts.FontPreferenceChangeEvent = function(
    isRecentFont, userFontsAdded, userFontsRemoved) {
  goog.base(this, office.fonts.EventType.FONT_PREFERENCE_CHANGE);

  /**
   * Whether the added fonts were recent fonts.
   * @type {boolean}
   * @private
   */
  this.isRecentFont_ = isRecentFont;

  /**
   *  The user added fonts.
   * @type {!Array.<string>}
   * @private
   */
  this.userFontsAdded_ = userFontsAdded;

  /**
   * The user removed fonts.
   * @type {!Array.<string>}
   * @private
   */
  this.userFontsRemoved_ = userFontsRemoved;
};
goog.inherits(office.fonts.FontPreferenceChangeEvent, goog.events.Event);


/**
 * @return {boolean} Whether the added fonts were recent fonts.
 */
office.fonts.FontPreferenceChangeEvent.prototype.getIsRecentFont = function() {
  return this.isRecentFont_;
};


/**
 * Gets the user added fonts.
 * @return {!Array.<string>} The user added fonts.
 */
office.fonts.FontPreferenceChangeEvent.prototype.getUserFontsAdded =
    function() {
  return this.userFontsAdded_;
};


/**
 * Gets the user removed fonts.
 * @return {!Array.<string>} The user removed fonts.
 */
office.fonts.FontPreferenceChangeEvent.prototype.getUserFontsRemoved =
    function() {
  return this.userFontsRemoved_;
};
