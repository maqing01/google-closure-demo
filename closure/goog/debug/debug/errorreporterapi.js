




goog.provide('office.debug.ErrorReporterApi');




office.debug.ErrorReporterApi = function() {};



office.debug.ErrorReporterApi.prototype.fatalError = function(
    error, opt_context, opt_sendAfterFatal) {};



office.debug.ErrorReporterApi.prototype.warning = function(
    error, opt_context, opt_sendAfterFatal) {};



office.debug.ErrorReporterApi.prototype.info = function(
    error, opt_context, opt_sendAfterFatal) {};



office.debug.ErrorReporterApi.prototype.log = function(
    error, opt_context, opt_sendAfterFatal) {};



office.debug.ErrorReporterApi.prototype.assert = function(condition, error) {};



office.debug.ErrorReporterApi.prototype.assertCritical = function(condition,
    error) {};



office.debug.ErrorReporterApi.prototype.protectFunction = function(fn,
    selfObj, opt_rethrow) {};
