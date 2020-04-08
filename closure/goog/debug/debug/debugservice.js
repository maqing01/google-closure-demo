goog.provide('office.debug.DebugService');

goog.require('goog.Disposable');
goog.require('goog.debug.FancyWindow');




office.debug.DebugService = function(opt_debug, opt_window, opt_console) {
  goog.Disposable.call(this);

  var win = opt_window || window;
  var url = win.location.href;


  this.debug_ = opt_debug || !!url && url.toLowerCase().indexOf('debug=true') != -1;
  if (this.debug_ && goog.DEBUG) {

    this.console_ = opt_console ||
        new goog.debug.FancyWindow('office.debug.DebugService');
    this.console_.setEnabled(true);
    this.console_.setCapturing(true);
  }
};
goog.inherits(office.debug.DebugService, goog.Disposable);



office.debug.DebugService.prototype.console_;



office.debug.DebugService.prototype.disposeInternal = function() {
  office.debug.DebugService.superClass_.disposeInternal.call(this);
  if (this.console_) {
    this.console_.setCapturing(false);
    delete this.console_;
  }
};



office.debug.DebugService.prototype.isDebug = function() {
  return this.debug_;
};
