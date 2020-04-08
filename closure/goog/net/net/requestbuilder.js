



goog.provide('office.net.RequestBuilder');




office.net.RequestBuilder = function() {};



office.net.RequestBuilder.prototype.withParams = goog.abstractMethod;



office.net.RequestBuilder.prototype.withSessionData = goog.abstractMethod;



office.net.RequestBuilder.prototype.setUrlPrefix = goog.abstractMethod;



office.net.RequestBuilder.prototype.setContent = goog.abstractMethod;



office.net.RequestBuilder.prototype.setContentObject = goog.abstractMethod;



office.net.RequestBuilder.prototype.setScottyContent = goog.abstractMethod;



office.net.RequestBuilder.prototype.setResponseType = goog.abstractMethod;



office.net.RequestBuilder.prototype.setExpectFlaky = goog.abstractMethod;



office.net.RequestBuilder.prototype.setErrorFunction = goog.abstractMethod;



office.net.RequestBuilder.prototype.setErrorNetStateFn = goog.abstractMethod;



office.net.RequestBuilder.prototype.setExternalServerRequest =
    goog.abstractMethod;



office.net.RequestBuilder.prototype.setMethod = goog.abstractMethod;



office.net.RequestBuilder.prototype.setServiceLevel = goog.abstractMethod;



office.net.RequestBuilder.prototype.setSuccessFunction = goog.abstractMethod;



office.net.RequestBuilder.prototype.setTimeout = goog.abstractMethod;



office.net.RequestBuilder.prototype.setUploadAllowed = goog.abstractMethod;



office.net.RequestBuilder.prototype.setJsonParser = goog.abstractMethod;



office.net.RequestBuilder.prototype.buildAndSend = goog.abstractMethod;



office.net.RequestBuilder.prototype.getUri = goog.abstractMethod;



office.net.RequestBuilder.prototype.getUriWithXsrfToken = goog.abstractMethod;
