goog.provide('office.net.CommandTransporter');

goog.require('goog.events.EventTarget');




office.net.CommandTransporter = function() {
  goog.base(this);
};
goog.inherits(office.net.CommandTransporter, goog.events.EventTarget);



office.net.CommandTransporter.prototype.isPendingCommandsRequest =
    goog.abstractMethod;



office.net.CommandTransporter.prototype.isPendingCatchupRequest =
    goog.abstractMethod;



office.net.CommandTransporter.prototype.sendCommandBundles = goog.abstractMethod;



office.net.CommandTransporter.prototype.sendCatchup = goog.abstractMethod;



office.net.CommandTransporter.prototype.getDebugContext = goog.abstractMethod;
