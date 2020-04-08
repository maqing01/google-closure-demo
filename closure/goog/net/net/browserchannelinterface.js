goog.provide('office.net.BrowserChannelInterface');

goog.require('office.net.RtcMessagePublisher');

office.net.BrowserChannelInterface = function() {};
goog.mixin(office.net.BrowserChannelInterface.prototype,
    office.net.RtcMessagePublisher.prototype);


office.net.BrowserChannelInterface.prototype.connectIfNeeded = function(
    opt_id, opt_sid, opt_urlPrefix) {};

office.net.BrowserChannelInterface.prototype.disconnectIfNeeded = function() {};

office.net.BrowserChannelInterface.prototype.getErrorStatus = function() {};

office.net.BrowserChannelInterface.prototype.getLastStatusCode = function() {};

office.net.BrowserChannelInterface.prototype.registerErrorStatusCallback = function(
    errorStatusCallback) {};

office.net.BrowserChannelInterface.prototype.unregisterErrorStatusCallback =
    function() {};

office.net.BrowserChannelInterface.prototype.registerChannelOpenedCallback =
    function(channelOpenedCallback) {};

office.net.BrowserChannelInterface.prototype.unregisterChannelOpenedCallback =
    function() {};

office.net.BrowserChannelInterface.prototype.setUserId = function(userId) {};

office.net.BrowserChannelInterface.prototype.setExpectWriteAccess = function(
    expectWriteAccess) {};

office.net.BrowserChannelInterface.prototype.setExpectCommentAccess = function(
    expectCommentAccess) {};

office.net.BrowserChannelInterface.prototype.setIsLegacyView = function(
    isLegacyView) {};

office.net.BrowserChannelInterface.prototype.setInfoParams = function(params) {};

office.net.BrowserChannelInterface.prototype.setLastSequenceNumber = function(
    lastSequenceNumber) {};
