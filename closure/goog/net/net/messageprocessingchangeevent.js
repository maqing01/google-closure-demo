

goog.provide('office.net.MessageProcessingChangeEvent');

goog.require('office.net.CommandStorageEventType');
goog.require('goog.events.Event');




office.net.MessageProcessingChangeEvent = function(target, suspend) {
  goog.base(this, office.net.CommandStorageEventType.MESSAGE_PROCESSING_CHANGE,
      target);


  this.suspend = suspend;
};
goog.inherits(office.net.MessageProcessingChangeEvent, goog.events.Event);
