

goog.provide('office.net.BrowserChannelStateChangedEvent');

goog.require('goog.events');
goog.require('goog.events.Event');




office.net.BrowserChannelStateChangedEvent =
    function(target, isHealthy, lastHttpStatusCode) {
  goog.base(this, office.net.BrowserChannelStateChangedEvent.TYPE, target);


  this.isHealthy = isHealthy;


  this.lastHttpStatusCode = lastHttpStatusCode;
};
goog.inherits(office.net.BrowserChannelStateChangedEvent, goog.events.Event);



office.net.BrowserChannelStateChangedEvent.TYPE =
    goog.events.getUniqueId('browserchannel_state_changed');
