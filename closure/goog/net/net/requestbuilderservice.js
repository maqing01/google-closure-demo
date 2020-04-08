

goog.provide('office.net.RequestBuilderService');




office.net.RequestBuilderService = function() {};



office.net.RequestBuilderService.prototype.newRequestBuilder =
    goog.abstractMethod;



office.net.RequestBuilderService.prototype.setUrlPrefix = goog.abstractMethod;
