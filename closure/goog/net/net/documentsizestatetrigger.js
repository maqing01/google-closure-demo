goog.provide('office.net.DocumentSizeStateTrigger');

goog.require('office.controller.StateTrigger');
goog.require('office.net.DocumentSizeMonitorEventType');




office.net.DocumentSizeStateTrigger = function() {
  goog.base(this);


  this.documentSizeMonitor_ = null;

  this.initializeState(
      office.net.DocumentSizeStateTrigger.State.UNDER_SOFT_LIMIT, true);
};
goog.inherits(
    office.net.DocumentSizeStateTrigger, office.controller.StateTrigger);



office.net.DocumentSizeStateTrigger.State = {
  UNDER_SOFT_LIMIT: goog.events.getUniqueId('documentSize-under-soft-limit')
};



office.net.DocumentSizeStateTrigger.prototype.setDocumentSizeMonitor = function(
    documentSizeMonitor) {
  this.documentSizeMonitor_ = documentSizeMonitor;

  this.getHandler().
      listen(this.documentSizeMonitor_,
          office.net.DocumentSizeMonitorEventType.SOFT_LIMIT_EXCEEDED,
          this.handleDocumentSizeSoftLimitExceeded_).
      listen(this.documentSizeMonitor_,
          office.net.DocumentSizeMonitorEventType.UNDER_SOFT_LIMIT,
          this.handleDocumentSizeUnderSoftLimit_);
};



office.net.DocumentSizeStateTrigger.prototype.handleDocumentSizeUnderSoftLimit_ =
    function(e) {
  var newStates = {};
  newStates[office.net.DocumentSizeStateTrigger.State.UNDER_SOFT_LIMIT] = true;
  this.updateStates(newStates);
};



office.net.DocumentSizeStateTrigger.prototype.
    handleDocumentSizeSoftLimitExceeded_ = function(e) {
  var newStates = {};
  newStates[office.net.DocumentSizeStateTrigger.State.UNDER_SOFT_LIMIT] = false;
  this.updateStates(newStates);
};
