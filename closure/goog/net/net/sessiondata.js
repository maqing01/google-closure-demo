goog.provide('office.net.SessionData');





office.net.SessionData = function(
    sessionId, expectCanComment, expectCanWrite, opt_sessionIdParameter) {

  this.sessionId_ = sessionId;


  this.expectCanComment_ = expectCanComment;


  this.expectCanWrite_ = expectCanWrite;

  this.sessionIdParameter_ = opt_sessionIdParameter ||
      office.net.SessionData.Params_.SESSION_ID;
};



office.net.SessionData.Params_ = {
  SESSION_ID: 'sid',
  EXPECT_CAN_COMMENT: 'c',
  EXPECT_CAN_WRITE: 'w'

};



office.net.SessionData.prototype.getParameterMap = function() {
  var parameters = {};
  parameters[this.sessionIdParameter_] = this.sessionId_;




  return parameters;
};
