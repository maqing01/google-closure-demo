



goog.provide('office.net.DocumentSizeMonitor');
goog.provide('office.net.DocumentSizeMonitor.Reason');

goog.require('office.net.DocumentSizeMonitorEventType');
goog.require('office.net.RtcTopic');
goog.require('office.ui.ButterManager');
goog.require('goog.dom');
goog.require('goog.events.EventTarget');
goog.require('controls.ButterBar');




office.net.DocumentSizeMonitor = function(browserChannel) {
  goog.base(this);


  this.browserChannel_ = browserChannel;

  this.browserChannel_.subscribe(office.net.RtcTopic.DOCUMENT_SIZE,
      this.handleDocumentSizeMessage_, this);
};
goog.inherits(office.net.DocumentSizeMonitor, goog.events.EventTarget);



office.net.DocumentSizeMonitor.Reason = {
  SOFT_LIMIT_EXCEEDED: 0,
  UNDER_SOFT_LIMIT: 1
};



office.net.DocumentSizeMonitor.prototype.butterItem_;



office.net.DocumentSizeMonitor.prototype.handleDocumentSizeMessage_ =
    function(data) {
  var reason = data['type'];
  switch (reason) {
    case office.net.DocumentSizeMonitor.Reason.SOFT_LIMIT_EXCEEDED:

      var MSG_OFFICE_SOFT_LIMIT_EXCEEDED = goog.getMsg(
          'This document is above the file size limit. ' +
          'You must delete content to continue editing.');







      this.dispatchEvent(
          office.net.DocumentSizeMonitorEventType.SOFT_LIMIT_EXCEEDED);
      break;
    case office.net.DocumentSizeMonitor.Reason.UNDER_SOFT_LIMIT:
      if (this.butterItem_) {
        office.ui.ButterManager.getInstance().clearMessage(
            this.butterItem_.getId());
      }
      this.dispatchEvent(
          office.net.DocumentSizeMonitorEventType.UNDER_SOFT_LIMIT);
      break;
  }
};



office.net.DocumentSizeMonitor.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  if(this.browserChannel_ && !this.browserChannel_.isDisposed()){
    this.browserChannel_.unsubscribe(office.net.RtcTopic.DOCUMENT_SIZE,
        this.handleDocumentSizeMessage_, this);
  }

};
