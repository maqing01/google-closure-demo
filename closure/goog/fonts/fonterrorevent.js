

/**
 * @fileoverview An event which is fired after a font has errored.

 */

goog.provide('office.fonts.FontErrorEvent');
goog.provide('office.fonts.FontErrorEvent.EventType');

goog.require('goog.events.Event');



/**
 * The font errored event.
 * @param {!office.fonts.FontInstaller} target The font loader.
 * @param {!Array.<!office.fonts.FontIdentifier>} fontIdentifiers The font
 *     identifiers.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.fonts.FontErrorEvent = function(target, fontIdentifiers) {
  goog.events.Event.call(
      this, office.fonts.FontErrorEvent.EventType.ERRORED, target);

  /**
   * The identifier of the font that has errored.
   * @type {Array.<!office.fonts.FontIdentifier>}
   */
  this.fontIdentifiers = fontIdentifiers;
};
goog.inherits(office.fonts.FontErrorEvent, goog.events.Event);


/**
 * An enum of possible font error event types.
 * @enum {string}
 */
office.fonts.FontErrorEvent.EventType = {
  ERRORED: 'errored'
};
