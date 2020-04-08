

goog.provide('office.net.BrowserChannelService');

goog.require('office.net.BrowserChannelStateChangedEvent');
goog.require('office.net.RequestUrlState');
goog.require('office.net.RtcTopic');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.net.BrowserChannel');




office.net.BrowserChannelService = function(requestUrlState) {
  goog.base(this);


  this.requestUrlState_ = requestUrlState;


  this.browserChannel_ = null;


  this.logger_ = goog.log.getLogger('office.net.BrowserChannelService');


  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.listen(this.requestUrlState_,
    office.net.RequestUrlState.EventType.INFO_PARAMETERS_UPDATED,
    this.updateBrowserChannelInfoParams_);
};
goog.inherits(office.net.BrowserChannelService, goog.events.EventTarget);



office.net.BrowserChannelService.prototype.registerBrowserChannel = function(
    browserChannel) {
  goog.asserts.assert(!this.browserChannel_, 'Only one browser channel may be' +
      ' registered with a BrowserChannelService');
  this.browserChannel_ = browserChannel;
  browserChannel.registerErrorStatusCallback(
      goog.bind(this.handleBrowserChannelError_, this));
  this.updateBrowserChannelInfoParams_();
};



office.net.BrowserChannelService.prototype.hasBrowserChannel = function() {
  return this.browserChannel_ != null;
};



office.net.BrowserChannelService.prototype.isBrowserChannelOk = function() {
  goog.asserts.assert(this.hasBrowserChannel(),
      'isBrowserChannelOk() called when browser channel is not present');

  return !this.browserChannel_.getErrorStatus();
};



office.net.BrowserChannelService.prototype.recycleBrowserChannel = function() {
  goog.asserts.assert(this.hasBrowserChannel(),
      'recycleBrowserChannel() called when browser channel is not present');


  this.browserChannel_.disconnectIfNeeded();
  this.browserChannel_.connectIfNeeded();
};


office.net.BrowserChannelService.prototype.updateBrowserChannelInfoParams_ =
    function() {
  if (this.browserChannel_) {
    this.browserChannel_.setInfoParams(
        this.requestUrlState_.getInfoParamsMap());
  }
};

office.net.BrowserChannelService.prototype.handleBrowserChannelError_ =
    function(error) {
  goog.log.fine(this.logger_, 'handleBrowserChannelError_(' + error + ')');
  goog.asserts.assert(this.hasBrowserChannel(), 'handleBrowserChannelError_()' +
      ' called when browser channel is not present');

  var lastHttpStatusCode = this.browserChannel_.getLastStatusCode();
  this.dispatchEvent(new office.net.BrowserChannelStateChangedEvent(
      this, /** isHealthy */error == goog.net.BrowserChannel.Error.OK, lastHttpStatusCode));
};



office.net.BrowserChannelService.prototype.disposeInternal = function() {
  if (this.browserChannel_ && !this.browserChannel_.isDisposed()) {
    this.browserChannel_.disconnectIfNeeded();
    this.browserChannel_.dispose();
  }
  this.browserChannel_ = null;
  goog.dispose(this.eventHandler_);
  goog.base(this, 'disposeInternal');
};
