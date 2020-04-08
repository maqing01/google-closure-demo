goog.provide('office.net.CommandTransporterCommandsEvent');

goog.require('office.net.CommandTransporterEventType');
goog.require('goog.events.Event');




office.net.CommandTransporterCommandsEvent = function(
    ranges, opt_additionalInfo, opt_target) {
  goog.base(
      this, office.net.CommandTransporterEventType.COMMANDS_SUCCESS, opt_target);


  this.ranges = ranges;


  this.additionalInfo = opt_additionalInfo || {};
};
goog.inherits(office.net.CommandTransporterCommandsEvent, goog.events.Event);
