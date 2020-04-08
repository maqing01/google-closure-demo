



goog.provide('office.net.CommandsReceivedEvent');

goog.require('office.net.CommandStorageEventType');
goog.require('goog.events.Event');




office.net.CommandsReceivedEvent = function(target, commands,
    onBehalfOfLocalSession) {
  goog.base(this, office.net.CommandStorageEventType.RECEIVE_COMMANDS, target);


  this.commands = commands;


  this.onBehalfOfLocalSession = onBehalfOfLocalSession;
};
goog.inherits(office.net.CommandsReceivedEvent, goog.events.Event);
