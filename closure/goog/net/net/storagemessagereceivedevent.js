



goog.provide('office.net.StorageMessageReceivedEvent');

goog.require('office.net.CommandStorageEventType');
goog.require('goog.events.Event');




office.net.StorageMessageReceivedEvent = function(target, isAck, storageMessage) {
  goog.base(this, office.net.CommandStorageEventType.RECEIVE_STORAGE_MESSAGE,
      target);


  this.isAck = isAck;


  this.storageMessage = storageMessage;
};
goog.inherits(office.net.StorageMessageReceivedEvent, goog.events.Event);
