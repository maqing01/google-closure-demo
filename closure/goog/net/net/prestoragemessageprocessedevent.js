

goog.provide('office.net.PreStorageMessageProcessedEvent');

goog.require('office.net.CommandStorageEventType');
goog.require('goog.events.Event');




office.net.PreStorageMessageProcessedEvent = function(target, isAck,
    storageMessage) {
  goog.base(this, office.net.CommandStorageEventType.PRE_PROCESS_STORAGE_MESSAGE,
      target);


  this.isAck = isAck;


  this.storageMessage = storageMessage;
};
goog.inherits(office.net.PreStorageMessageProcessedEvent, goog.events.Event);
