



goog.provide('office.net.StatusEvent');

goog.require('goog.events');
goog.require('goog.events.Event');




office.net.StatusEvent = function(oldState, newState) {
  goog.events.Event.call(this, office.net.StatusEvent.TYPE);


  this.oldState = oldState;


  this.newState = newState;
};
goog.inherits(office.net.StatusEvent, goog.events.Event);



office.net.StatusEvent.TYPE = goog.events.getUniqueId('StatusChangeEvent');
