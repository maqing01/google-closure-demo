

/**
 * @fileoverview An event which is fired after a font has been installed.

 */

goog.provide('office.fonts.FontInstalledEvent');
goog.provide('office.fonts.FontInstalledEvent.EventType');

goog.require('goog.events.Event');



/**
 * The font installed event.
 * @param {!office.fonts.FontInstaller} target The font loader.
 * @param {!Array.<!office.fonts.FontIdentifier>} fontIdentifiers The font
 *     identifiers.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.fonts.FontInstalledEvent = function(target, fontIdentifiers) {
  goog.events.Event.call(
      this, office.fonts.FontInstalledEvent.EventType.INSTALLED, target);

  /**
   * The identifier of the font that has been installed.
   * @type {Array.<!office.fonts.FontIdentifier>}
   */
  this.fontIdentifiers = fontIdentifiers;
};
goog.inherits(office.fonts.FontInstalledEvent, goog.events.Event);


/**
 * An enum of possible font install event types.
 * @enum {string}
 */
office.fonts.FontInstalledEvent.EventType = {
  INSTALLED: 'installed'
};
