

/**
 * @fileoverview Event thrown by the server document loader when the docos
 * metadata has been loaded.

 */

goog.provide('office.app.DocosMetadataCompleteEvent');

goog.require('office.app.ModelLoadEventType');
goog.require('goog.events.Event');



/**
 * Event which signals that the server document loader has loaded the docos
 * metadata, and is available for use by the editor.
 * @param {number} accessLevel The document access level.
 * @param {!Array} docosKeyData The docos KeyData.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.app.DocosMetadataCompleteEvent = function(accessLevel, docosKeyData) {
  goog.base(this, office.app.ModelLoadEventType.DOCOS_METADATA_COMPLETE);

  /**
   * The document access level.
   * @type {number}
   */
  this.accessLevel = accessLevel;

  /**
   * The docos KeyData.
   * @type {!Array}
   */
  this.docosKeyData = docosKeyData;
};
goog.inherits(office.app.DocosMetadataCompleteEvent, goog.events.Event);
