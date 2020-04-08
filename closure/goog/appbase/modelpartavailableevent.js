

/**
 * @fileoverview Event thrown by the document loader when a part of the model
 * becomes available for use by the editor.

 */

goog.provide('office.app.ModelPartAvailableEvent');

goog.require('office.app.ModelLoadEventType');
goog.require('goog.events.Event');



/**
 * Event which signals that the document loader has loaded a part of the model,
 * and that that piece is available for use by the editor.
 * @param {!office.app.ModelPart} modelPart The model part, in whatever form is
 *     correct for the editor in question.
 * @param {number} revision The revision corresponding to the specified model
 *     object.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.app.ModelPartAvailableEvent = function(modelPart, revision) {
  goog.base(this, office.app.ModelLoadEventType.MODEL_PART_AVAILABLE);

  /**
   * The model part object. May be an incremental change or one of many chunks
   * corresponding to a single revision.
   * @type {!office.app.ModelPart}
   */
  this.modelPart = modelPart;

  /**
   * The revision corresponding to the specified model object.
   * @type {number}
   */
  this.revision = revision;
};
goog.inherits(office.app.ModelPartAvailableEvent, goog.events.Event);
