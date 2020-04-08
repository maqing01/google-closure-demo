goog.provide('office.net.XsrfTokenProvider');




office.net.XsrfTokenProvider = function() {};



office.net.XsrfTokenProvider.prototype.getXsrfToken = goog.abstractMethod;



office.net.XsrfTokenProvider.prototype.getDeferredXsrfToken = goog.abstractMethod;
