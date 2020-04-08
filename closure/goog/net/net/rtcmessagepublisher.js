



goog.provide('office.net.RtcMessagePublisher');

goog.require('goog.disposable.IDisposable');




office.net.RtcMessagePublisher = function() {};
goog.mixin(office.net.RtcMessagePublisher.prototype,
    goog.disposable.IDisposable.prototype);



office.net.RtcMessagePublisher.prototype.subscribe = function(
    topic, fn, opt_context) {};



office.net.RtcMessagePublisher.prototype.unsubscribe = function(
    topic, fn, opt_context) {};
