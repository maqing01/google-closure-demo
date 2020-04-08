

/**
 * @fileoverview Events triggered by the image processor.
 *
 * @author jonemerson@google.com (Jon Emerson)
 */

goog.provide('apps.uploader.ImageProcessorEvent');
goog.provide('apps.uploader.ImageProcessorEvent.Type');

goog.require('goog.events');
goog.require('goog.events.Event');



/**
 * A class for events dispatched by the image processor.
 * @param {!apps.uploader.ImageProcessorEvent.Type} type The event type.
 * @param {!apps.uploader.ImageProcessor.Item} item The item.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.ImageProcessorEvent = function(type, item) {
  goog.events.Event.call(this, type);

  /**
   * The item firing the event.
   * @type {!apps.uploader.ImageProcessor.Item}
   * @private
   */
  this.item_ = item;
};
goog.inherits(apps.uploader.ImageProcessorEvent, goog.events.Event);


/**
 * Event types fired by the image processor.
 * @enum {string}
 */
apps.uploader.ImageProcessorEvent.Type = {
  /**
   * Indicates processing for an item has started.
   */
  STARTED: goog.events.getUniqueId('started'),

  /**
   * Indicates processing for a file has completed.
   */
  COMPLETED: goog.events.getUniqueId('completed'),

  /**
   * Indicates processing for a file could not be completed due to error.
   */
  ERROR: goog.events.getUniqueId('error')
};


/**
 * Returns the item that fired the event.
 * @return {!apps.uploader.ImageProcessor.Item} Item that fired event.
 */
apps.uploader.ImageProcessorEvent.prototype.getItem = function() {
  return this.item_;
};

