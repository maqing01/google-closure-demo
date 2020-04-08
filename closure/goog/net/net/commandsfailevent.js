



goog.provide('office.net.CommandsFailEvent');

goog.require('office.net.CommandTransporterEventType');
goog.require('office.net.CommandTransporterFailEvent');




office.net.CommandsFailEvent = function(netEvent, requestHadCommands,
    opt_target) {
  goog.base(this, office.net.CommandTransporterEventType.COMMANDS_FAIL, netEvent,
      opt_target);


  this.requestHadCommands = requestHadCommands;
};
goog.inherits(office.net.CommandsFailEvent, office.net.CommandTransporterFailEvent);
