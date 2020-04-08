

goog.provide('office.net.OnlineModeState');

goog.require('office.net.StatusEvent');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');




office.net.OnlineModeState = function(netStatus) {
  goog.base(this);


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.netStatus_ = netStatus;

  this.eventHandler_.listen(netStatus, office.net.StatusEvent.TYPE,
      this.handleStateChange_);
};
goog.inherits(office.net.OnlineModeState, goog.events.EventTarget);



office.net.OnlineModeState.prototype.isOnline = function() {
  return this.netStatus_.getState().isOk();
};



office.net.OnlineModeState.prototype.handleStateChange_ = function(
    event) {
  if (event.oldState.isOk() != event.newState.isOk()) {
    this.dispatchEvent(
        new office.net.OnlineModeState.ChangeEvent(event.newState.isOk()));
  }
};



office.net.OnlineModeState.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  goog.base(this, 'disposeInternal');
};



office.net.OnlineModeState.EventType = {
  CHANGE: goog.events.getUniqueId('change')
};




office.net.OnlineModeState.ChangeEvent = function(isOnline) {
  goog.base(this, office.net.OnlineModeState.EventType.CHANGE);


  this.isOnline = isOnline;
};
goog.inherits(office.net.OnlineModeState.ChangeEvent, goog.events.Event);
