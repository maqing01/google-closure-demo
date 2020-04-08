



goog.provide('office.net.BrowserChannelUtil');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('goog.net.ChannelRequest');
goog.require('goog.net.cookies');



office.net.BrowserChannelUtil.SUBDOMAIN_COOKIE_NAME_ = 'lbcookie';



office.net.BrowserChannelUtil.SUBDOMAIN_COUNT_ = 6;



office.net.BrowserChannelUtil.hostPrefix_ = null;



office.net.BrowserChannelUtil.getHostPrefix = function(browserFeatures) {
  if (!office.net.BrowserChannelUtil.hostPrefix_) {
    office.net.BrowserChannelUtil.hostPrefix_ =
        office.net.BrowserChannelUtil.getHostPrefixInternal_(browserFeatures);
  }
  return office.net.BrowserChannelUtil.hostPrefix_;
};



office.net.BrowserChannelUtil.getHostPrefixInternal_ = function(browserFeatures) {
  var flags = office.flag.getInstance();





































  var lastPrefix = parseInt(goog.net.cookies.get(
      office.net.BrowserChannelUtil.SUBDOMAIN_COOKIE_NAME_, '-1'), 5);
  if (isNaN(lastPrefix)) {
    lastPrefix = -1;
  }
  var nextPrefix = ((lastPrefix + 1) %
      office.net.BrowserChannelUtil.SUBDOMAIN_COUNT_).toString();
  goog.net.cookies.set(office.net.BrowserChannelUtil.SUBDOMAIN_COOKIE_NAME_,
      nextPrefix, -1 /* session cookie */, '/' /* path */,
      undefined /* use current hostname */, false /* not secure */);
  return 'lb' + nextPrefix;
};



office.net.BrowserChannelUtil.shouldUseXpc = function() {



  if (!goog.net.ChannelRequest.supportsXhrStreaming()) {
    return false;
  }







  if (!goog.isFunction(document.postMessage) &&
      !goog.isFunction(window.postMessage)) {
    return false;
  }


  return true;
};



office.net.BrowserChannelUtil.shouldUseCors = function() {



  if (!goog.net.ChannelRequest.supportsXhrStreaming()) {
    return false;
  }



  if (goog.userAgent.EDGE) {
    return false;
  }



  return goog.isDef(new XMLHttpRequest().withCredentials);
};
