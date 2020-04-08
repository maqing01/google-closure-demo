



goog.provide('office.net.CommandTransporterEventType');

goog.require('goog.events');



office.net.CommandTransporterEventType = {

  CATCHUP_FAIL: goog.events.getUniqueId('catchup-fail'),


  CATCHUP_SUCCESS: goog.events.getUniqueId('catchup-success'),


  COMMANDS_FAIL: goog.events.getUniqueId('commands-fail'),


  COMMANDS_SUCCESS: goog.events.getUniqueId('commands-success')
};
