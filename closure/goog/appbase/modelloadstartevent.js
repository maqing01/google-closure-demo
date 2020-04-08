

/**
 * @fileoverview Contains the definition of the ModelLoadStartEvent class.

 */

goog.provide('office.app.ModelLoadStartEvent');

goog.require('office.app.ModelLoadEventType');
goog.require('goog.events.Event');



/**
 * An event which signals the start of a document load.
 *
 * @param {number} revision The head revision of the document being loaded.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.app.ModelLoadStartEvent = function(revision) {
  goog.base(this, office.app.ModelLoadEventType.MODEL_LOAD_START);

  /**
   * The head revision of the document being loaded.
   * @type {number}
   */
  this.revision = revision;
};
goog.inherits(office.app.ModelLoadStartEvent, goog.events.Event);
