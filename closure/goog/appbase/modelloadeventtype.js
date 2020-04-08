

/**
 * @fileoverview Event types dispatched during the model load process.

 */

goog.provide('office.app.ModelLoadEventType');

goog.require('goog.events');


/**
 * Event types dispatched during model load.
 * @enum {string}
 */
office.app.ModelLoadEventType = {
  // Signals that docos metadata (acl and docos key data) has been loaded.
  DOCOS_METADATA_COMPLETE: goog.events.getUniqueId('docos_metadata_complete'),
  // Signals that embedded object data has has been loaded.
  EMBEDDED_OBJECTS_AVAILABLE:
      goog.events.getUniqueId('embedded_objects_available'),
  // Signals that the last portion of the model was the final one.
  MODEL_LOAD_COMPLETE: goog.events.getUniqueId('model_load_complete'),
  // Signals that a model load has started.
  MODEL_LOAD_START: goog.events.getUniqueId('model_load_start'),
  // Signals that a portion of the model has become available.
  MODEL_PART_AVAILABLE: goog.events.getUniqueId('model_part_available'),
  // Signals that startup hints are available.
  STARTUP_HINTS_AVAILABLE: goog.events.getUniqueId('startup_hints_available')
};
