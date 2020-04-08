



goog.provide('office.net.SelectionReceivedEvent');

goog.require('office.net.CommandStorageEventType');
goog.require('goog.events.Event');




office.net.SelectionReceivedEvent = function(target, selection, sid, isMe,
    isOnBehalfOfLocalSession) {
  goog.base(this, office.net.CommandStorageEventType.RECEIVE_SELECTION, target);


  this.selection = selection;


  this.sid = sid;


  this.isMe = isMe;


  this.isOnBehalfOfLocalSession = isOnBehalfOfLocalSession;
};
goog.inherits(office.net.SelectionReceivedEvent, goog.events.Event);
