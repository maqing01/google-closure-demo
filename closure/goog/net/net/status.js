goog.provide('office.net.Status');
goog.provide('office.net.Status.State');

goog.require('office.net.StatusEvent');
goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require("fe.Logger");


office.net.Status = function() {
  goog.events.EventTarget.call(this);
  this.state_ = office.net.Status.State.IDLE;
};
goog.inherits(office.net.Status, goog.events.EventTarget);



office.net.Status.RESTART_SOON_EVENT_TYPE =
    goog.events.getUniqueId('restart_soon');


office.net.Status.prototype.logger_ = goog.log.getLogger(
    'office.net.Status');


office.net.Status.prototype.dispatchRestartSoonEvent = function() {
  this.dispatchEvent(office.net.Status.RESTART_SOON_EVENT_TYPE);
};


office.net.Status.prototype.setState = function(state) {
  var oldState = this.state_;
  if (state != oldState) {
    goog.log.info(
        this.logger_, 'Net state changed from ' + oldState + ' to ' + state);
    this.state_ = state;
    this.dispatchEvent(new office.net.StatusEvent(oldState, state));
    
    // isOk状态变更记录日志
    if(state.isOk() != oldState.isOk()){
      fe.Logger.log(function(){
        return {
          'type':'net-st-change',
          'old':{
            'name':oldState.stateName_,
            'severity':oldState.severity_
          },
          'new':{
            'name':state.stateName_,
            'severity':state.severity_
          },
        }
      })

      fe.Logger.count('net-st-change');
    }
  }
};



office.net.Status.prototype.getState = function() {
  return this.state_;
};




office.net.Status.State = function(stateName, severity) {


  this.stateName_ = stateName;


  this.severity_ = severity;

  goog.asserts.assert(
      !goog.isDefAndNotNull(office.net.Status.State.stateMap_[stateName]),
      'office.net.Status.State instances should be uniquely named.');
  office.net.Status.State.stateMap_[stateName] = this;
};



office.net.Status.State.Severity_ = {
  OK: 1,
  ERROR: 2,
  OFFLINE: 3,
  ATTENTION_REQUIRED: 4,
  UNRECOVERABLE: 5
};



office.net.Status.State.stateMap_ = {};



office.net.Status.State.prototype.isError = function() {
  return this.severity_ != office.net.Status.State.Severity_.OK;
};



office.net.Status.State.prototype.isOk = function() {
  return this.severity_ == office.net.Status.State.Severity_.OK;
};



office.net.Status.State.prototype.isOffline = function() {
  return this.severity_ >= office.net.Status.State.Severity_.OFFLINE;
};



office.net.Status.State.prototype.isUnrecoverable = function() {
  return this.severity_ >= office.net.Status.State.Severity_.UNRECOVERABLE;
};



office.net.Status.State.prototype.isAttentionRequired = function() {
  return this.severity_ >= office.net.Status.State.Severity_.ATTENTION_REQUIRED;
};



office.net.Status.State.IDLE = new office.net.Status.State('i',
    office.net.Status.State.Severity_.OK);



office.net.Status.State.BUSY = new office.net.Status.State('b',
    office.net.Status.State.Severity_.OK);



office.net.Status.State.RECOVERING = new office.net.Status.State('r',
    office.net.Status.State.Severity_.ERROR);



office.net.Status.State.OFFLINE = new office.net.Status.State('OFFLINE',
    office.net.Status.State.Severity_.OFFLINE);



office.net.Status.State.SERVER_DOWN = new office.net.Status.State('sd',
    office.net.Status.State.Severity_.OFFLINE);



office.net.Status.State.FORBIDDEN = new office.net.Status.State('f',
    office.net.Status.State.Severity_.ATTENTION_REQUIRED);



office.net.Status.State.AUTH_REQUIRED = new office.net.Status.State('ar',
    office.net.Status.State.Severity_.ERROR);


office.net.Status.State.TOO_MANY_SESSION = new office.net.Status.State('ts',
    office.net.Status.State.Severity_.ERROR);


office.net.Status.State.INCOMPATIBLE_SERVER = new office.net.Status.State(
    'is', office.net.Status.State.Severity_.UNRECOVERABLE);

//一段时间内无操作，断开链接节省资源
office.net.Status.State.CLIENT_IDLE = new office.net.Status.State(
  'cid', office.net.Status.State.Severity_.UNRECOVERABLE);

office.net.Status.State.CLIENT_ERROR = new office.net.Status.State('ce',
    office.net.Status.State.Severity_.UNRECOVERABLE);



office.net.Status.State.SAVE_ERROR = new office.net.Status.State('ur',
    office.net.Status.State.Severity_.UNRECOVERABLE);



office.net.Status.State.BATCH_SAVE_ERROR = new office.net.Status.State(
    'bse',
    office.net.Status.State.Severity_.OFFLINE);



office.net.Status.State.prototype.toString = function() {
  return this.stateName_;
};



office.net.Status.State.deserializeState = function(stateString) {
  var state = office.net.Status.State.stateMap_[stateString];
  if (!goog.isDefAndNotNull(state)) {
    throw new Error('Error deserializing network state: ' + stateString);
  }
  return state;
};
