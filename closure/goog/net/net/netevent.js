goog.provide('office.net.NetEvent');
goog.provide('office.net.NetEvent.Type');

goog.require('goog.events');
goog.require('goog.events.Event');




office.net.NetEvent = function(type, errorCode, httpStatus, opt_appData) {
  goog.events.Event.call(this, type);


  this.errorCode = errorCode;


  this.httpStatus = httpStatus;


  this.appData = opt_appData;
};
goog.inherits(office.net.NetEvent, goog.events.Event);



office.net.NetEvent.prototype.cause = null;



office.net.NetEvent.prototype.debugString = '';



office.net.NetEvent.prototype.originalType = null;



office.net.NetEvent.Type = {

  ERROR: goog.events.getUniqueId('error'),

  SUCCESS: goog.events.getUniqueId('ok'),

  NETWORK_WARNING: goog.events.getUniqueId('network_warning'),

  SERVER_WARNING: goog.events.getUniqueId('server_warning'),

  CLIENT_ERROR: goog.events.getUniqueId('clienterror'),

  RESTART_NOW: goog.events.getUniqueId('restart_now')
};



office.net.NetEvent.prototype.fatalError = function(
    errorReporter, message, opt_context) {
  var context = opt_context || {};




  var error;
  if (this.cause) {
    error = this.cause;
    context['message'] = message;
  } else {
    error = new Error(message);
  }
  errorReporter.fatalError(error, context);
};
