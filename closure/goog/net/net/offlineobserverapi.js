goog.provide('office.net.OfflineObserverApi');

goog.require('office.net.ServiceId');
goog.require('goog.events');
goog.require('goog.events.EventTarget');




office.net.OfflineObserverApi = function() {
  goog.base(this);
};
goog.inherits(office.net.OfflineObserverApi, goog.events.EventTarget);



office.net.OfflineObserverApi.EventType = {
  ONLINE: goog.events.getUniqueId('online'),
  OFFLINE: goog.events.getUniqueId('offline')
};



office.net.OfflineObserverApi.get = function(appContext) {
  return /** @type {!office.net.OfflineObserverApi} */ (
      appContext.get(office.net.ServiceId.OFFLINE_OBSERVER));
};



office.net.OfflineObserverApi.prototype.notifyPotentialStateChange =
    goog.abstractMethod;



office.net.OfflineObserverApi.prototype.notifyNetworkRequest =
    goog.abstractMethod;



office.net.OfflineObserverApi.prototype.notifyNetworkResult = goog.abstractMethod;



office.net.OfflineObserverApi.prototype.isOnline = goog.abstractMethod;
