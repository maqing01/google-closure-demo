

goog.provide('office.net.DeferredRequest');

goog.require('office.net.RequestInternal');




office.net.DeferredRequest = function(uri, urlPrefix, content, scottyContent,
    serviceLevel, successFunction, errorFunction, errorNetStateFn,
    externalServerRequest, responseType, isExpectFlaky, timeout, method,
    jsonParser) {
  goog.base(this, uri, urlPrefix, content, scottyContent, serviceLevel,
      successFunction, errorFunction, errorNetStateFn, externalServerRequest,
      responseType, isExpectFlaky, timeout, method, jsonParser);
};
goog.inherits(office.net.DeferredRequest, office.net.RequestInternal);



office.net.DeferredRequest.prototype.sendInternal = function(requestUrlState) {
  throw Error('Send is not supported for DeferredRequest.');
};
