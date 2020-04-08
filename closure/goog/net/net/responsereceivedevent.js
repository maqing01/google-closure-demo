

goog.provide('office.net.ResponseReceivedEvent');

goog.require('goog.events');
goog.require('goog.events.Event');




office.net.ResponseReceivedEvent = function(request, response) {
  goog.base(this, office.net.ResponseReceivedEvent.TYPE, request);


  this.response = response;
};
goog.inherits(office.net.ResponseReceivedEvent, goog.events.Event);



office.net.ResponseReceivedEvent.TYPE =
    goog.events.getUniqueId('response_received');
