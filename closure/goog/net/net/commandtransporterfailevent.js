



goog.provide('office.net.CommandTransporterFailEvent');

goog.require('goog.events.Event');




office.net.CommandTransporterFailEvent = function(type, netEvent, opt_target) {
  goog.base(this, type, opt_target);


  this.netEvent = netEvent;
};
goog.inherits(office.net.CommandTransporterFailEvent, goog.events.Event);
