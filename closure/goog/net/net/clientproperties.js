

goog.provide('office.net.ClientProperties');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.structs.MutableProperty');




office.net.ClientProperties = function() {

  var gaiaSessionId =
      office.flag.getInstance().getString(office.flag.Flags.GAIA_SESSION_ID);


  this.gaiaSessionIdProperty_ =
      new office.structs.MutableProperty.String(gaiaSessionId);
};
goog.addSingletonGetter(office.net.ClientProperties);



office.net.ClientProperties.prototype.getGaiaSessionIdProperty = function() {
  return this.gaiaSessionIdProperty_;
};



office.net.ClientProperties.prototype.setGaiaSessionIdProperty =
    function(gaiaSessionId) {
  this.gaiaSessionIdProperty_.setStringValue(gaiaSessionId);
};
