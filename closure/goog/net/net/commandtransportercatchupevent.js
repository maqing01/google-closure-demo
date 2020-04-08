



goog.provide('office.net.CommandTransporterCatchupEvent');

goog.require('office.net.CommandTransporterEventType');
goog.require('goog.events.Event');




office.net.CommandTransporterCatchupEvent = function(
    changeObjs, metadataMessage, opt_target) {
  goog.base(
      this, office.net.CommandTransporterEventType.CATCHUP_SUCCESS, opt_target);


  this.changeObjs = changeObjs;


  this.metadataMessage = metadataMessage;
};
goog.inherits(office.net.CommandTransporterCatchupEvent, goog.events.Event);
