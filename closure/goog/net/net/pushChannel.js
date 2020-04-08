goog.provide("office.net.PushChannel");

goog.require("office.flag.FlagService");

goog.require("office.net.WebSocketChannel");
goog.require("office.net.BrowserChannel");

var ENABLE_WS = office.flag.FlagService.getInstance().getBoolean('enable_websocket');

office.net.PushChannel = function(
  opt_translator,
  opt_channelFactory,
  opt_localSubdomain,
  opt_offlineObserver,
  opt_enableBcReadyStateChangeThrottling,
  opt_enableCors,
  opt_accessLevel
) {
  if (ENABLE_WS) {
    return new office.net.WebSocketChannel(
        opt_offlineObserver,
        opt_accessLevel
    );
  } else {
    return new office.net.BrowserChannel(
      opt_translator,
      opt_channelFactory,
      opt_localSubdomain,
      opt_offlineObserver,
      opt_enableBcReadyStateChangeThrottling,
      opt_enableCors
    );
  }
};
