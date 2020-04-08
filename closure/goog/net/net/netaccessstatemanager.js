goog.provide('office.net.NetAccessStateManager');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.info.AccessState');
goog.require('office.info.SaveStateTracker');
goog.require('office.net.StatusEvent');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');



office.net.NetAccessStateManager = function(saveStateTracker, accessState, enableOfflineEditing) {
  goog.base(this);


  this.saveStateTracker_ = saveStateTracker;


  this.accessState_ = accessState;


  this.enableOfflineEditing_ = enableOfflineEditing;


  this.isColdStartOffline_ = office.flag.getInstance().getBoolean(
      office.flag.Flags.IS_COLD_START_OFFLINE);


  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.listen(this.saveStateTracker_,
      office.info.SaveStateTracker.EventType.CHANGE,
      this.handleSaveStateChange_);

  this.updateReadOnlyState_();
  
    // command（/sd接口）失败，阻止用户继续编辑
  $(window).on('command.request.failure',goog.bind(this.preventEditAndComment_,this));

};
goog.inherits(office.net.NetAccessStateManager, goog.Disposable);



office.net.NetAccessStateManager.prototype.netStatus_ = null;



office.net.NetAccessStateManager.prototype.readOnly_ = false;



office.net.NetAccessStateManager.prototype.setNetStatus = function(netStatus) {
  if (this.netStatus_) {
    return;
  }
  this.netStatus_ = netStatus;
  this.eventHandler_.listen(netStatus, office.net.StatusEvent.TYPE,
      this.handleNetStatusChange_);

  this.updateReadOnlyState_();
};



office.net.NetAccessStateManager.prototype.handleNetStatusChange_ = function(e) {
  this.updateReadOnlyState_();
};



office.net.NetAccessStateManager.prototype.handleSaveStateChange_ = function(e) {
  if (this.saveStateTracker_.areChangesStoredLocally() !=
      e.previousState.areChangesStoredLocally()) {
    this.updateReadOnlyState_();
  }
};


//阻止用户编辑和评论
office.net.NetAccessStateManager.prototype.preventEditAndComment_ = function(){
  office.net.NetAccessStateManager.forceReadOnly = true;
  this.updateReadOnlyState_();
}

office.net.NetAccessStateManager.forceReadOnly = undefined;

office.net.NetAccessStateManager.prototype.updateReadOnlyState_ = function() {
  var readOnly = goog.isDef(office.net.NetAccessStateManager.forceReadOnly) ?  office.net.NetAccessStateManager.forceReadOnly : this.isReadOnlyState_();
  if (this.readOnly_ != readOnly) {
    this.readOnly_ = readOnly;
    this.accessState_.setEditable(
        !readOnly, office.info.AccessState.StateChangeReason.NETWORK);
    this.accessState_.setCommentable(
        !readOnly, office.info.AccessState.StateChangeReason.NETWORK);
  }
};



office.net.NetAccessStateManager.prototype.isReadOnlyState_ = function() {
  if (this.enableOfflineEditing_) {
    if (this.netStatus_) {
      var state = this.netStatus_.getState();
      return state.isAttentionRequired() || (state.isError() &&
          !this.saveStateTracker_.areChangesStoredLocally());
    } else if (this.isColdStartOffline_) {
      return !this.saveStateTracker_.areChangesStoredLocally();
    }
    return false;
  }

  return !!this.netStatus_ && this.netStatus_.getState().isError();
};



office.net.NetAccessStateManager.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;
  delete this.netStatus_;
  delete this.accessState_;

  goog.base(this, 'disposeInternal');
};
