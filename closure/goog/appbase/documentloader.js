goog.provide('office.app.DocumentLoader');

goog.require('office.app.ModelLoadEventType');
goog.require('office.app.ModelLoadStartEvent');
goog.require('office.app.ModelPartAvailableEvent');
goog.require('goog.events.EventTarget');



/**
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.app.DocumentLoader = function() {
  goog.base(this);
};
goog.inherits(office.app.DocumentLoader, goog.events.EventTarget);


/**
 * Dispatches a model load start event,
 * @param {number} revision The head revision of the document being loaded.
 * @protected
 */
office.app.DocumentLoader.prototype.dispatchModelLoadStartEvent =
    function(revision) {
  this.dispatchEvent(new office.app.ModelLoadStartEvent(revision));
};


/**
 * Dispatches a model available event, with the given payload. The loader
 * is expected to dispatch a non-zero number of these events with fragments
 * of the model, followed by a single model loaded event signalling load
 * completion.
 * @param {!office.app.ModelPart} modelPart The model part, the nature of which
 *     will be specific to the editor.
 * @param {number} revision The revision corresponding to the last command in
 *     the specified model object.
 * @protected
 */
office.app.DocumentLoader.prototype.dispatchModelPartAvailableEvent =
    function(modelPart, revision) {
  // Dispatch events which will cause the model to be loaded into the
  // editor.
  this.dispatchEvent(
      new office.app.ModelPartAvailableEvent(modelPart, revision));
};


/**
 * Dispatches a model loaded event. The writer is expected to dispatch exactly
 * one of these once the model load is complete.
 * @protected
 */
office.app.DocumentLoader.prototype.dispatchModelLoadCompleteEvent = function() {
  this.dispatchEvent(office.app.ModelLoadEventType.MODEL_LOAD_COMPLETE);
};
