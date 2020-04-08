goog.provide('office.net.CommandStorageEventType');

goog.require('goog.events');



office.net.CommandStorageEventType = {

  MESSAGE_PROCESSING_CHANGE:
      goog.events.getUniqueId('suspendMessageProcessing'),


  PRE_PROCESS_STORAGE_MESSAGE:
      goog.events.getUniqueId('preProcessStorageMessage'),


  RECEIVE_COMMANDS: goog.events.getUniqueId('receiveCommands'),


  RECEIVE_SELECTION: goog.events.getUniqueId('receiveSelection'),


  RECEIVE_STORAGE_MESSAGE: goog.events.getUniqueId('receiveStorageMessage')
};
