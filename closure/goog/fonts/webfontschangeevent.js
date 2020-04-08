

/**
 * @fileoverview Contains the definition of the WebFontsChangeEvent class.

 */

goog.provide('office.fonts.WebFontsChangeEvent');

goog.require('goog.events.Event');



/**
 * A web fonts change event that is fired when the font metadata is loaded for
 * new webfonts.
 * @param {!Object} target The object that fired this event.
 * @param {!Array.<string>} fontNames The font names.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.fonts.WebFontsChangeEvent = function(target, fontNames) {
  goog.base(this, office.fonts.WebFontsChangeEvent.TYPE, target);

  /**
   * The font names.
   * @type {!Array.<string>}
   */
  this.fontNames = fontNames;
};
goog.inherits(office.fonts.WebFontsChangeEvent, goog.events.Event);


/**
 * The event type.
 * @type {string}
 */
office.fonts.WebFontsChangeEvent.TYPE = 'changed';
