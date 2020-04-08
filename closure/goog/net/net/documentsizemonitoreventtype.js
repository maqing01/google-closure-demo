goog.provide('office.net.DocumentSizeMonitorEventType');

goog.require('goog.events');



office.net.DocumentSizeMonitorEventType = {
  SOFT_LIMIT_EXCEEDED: goog.events.getUniqueId('softLimitExceeded'),
  UNDER_SOFT_LIMIT: goog.events.getUniqueId('underSoftLimit')
};
