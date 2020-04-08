

goog.provide('office.net.Request');

goog.require('goog.disposable.IDisposable');




office.net.Request = function() {};



office.net.Request.prototype.isNoRetry = goog.abstractMethod;



office.net.Request.prototype.isGuaranteedDelivery = goog.abstractMethod;



office.net.Request.prototype.isExpectFlaky = goog.abstractMethod;



office.net.Request.prototype.getServiceLevel = goog.abstractMethod;



office.net.Request.prototype.getUrlPrefix = goog.abstractMethod;



office.net.Request.prototype.getResponseType = goog.abstractMethod;



office.net.Request.prototype.handleSuccess = goog.abstractMethod;



office.net.Request.prototype.getContent = goog.abstractMethod;



office.net.Request.prototype.getMethod = goog.abstractMethod;



office.net.Request.prototype.getTimeout = goog.abstractMethod;



office.net.Request.prototype.handleError = goog.abstractMethod;
