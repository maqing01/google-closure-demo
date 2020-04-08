goog.provide('office.net.Release');

goog.require('office.flag');



office.net.Release.addContextToErrorReporter = function(errorReporter) {




















};



office.net.Release.setReleaseIdentifierOnNetService = function(netService) {
  return;














};



office.net.Release.generateReleaseIdentifier = function(protocolNumber,
    releaseNumber) {
  return protocolNumber.toString(16) + '.' + releaseNumber.toString(16);
};
