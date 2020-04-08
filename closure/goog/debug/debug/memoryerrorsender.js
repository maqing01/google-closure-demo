



goog.provide('office.debug.MemoryErrorSender');

goog.require('office.debug.ErrorSender');




office.debug.MemoryErrorSender = function(opt_maxErrorsStored) {
  goog.base(this, opt_maxErrorsStored);


  this.queue_ = [];
};
goog.inherits(office.debug.MemoryErrorSender, office.debug.ErrorSender);



office.debug.MemoryErrorSender.prototype.enqueue = function(requestData) {
  this.queue_.push(requestData);
};



office.debug.MemoryErrorSender.prototype.deleteFront = function() {
  this.queue_.shift();
};



office.debug.MemoryErrorSender.prototype.getFront = function() {
  return goog.isDef(this.queue_[0]) ? this.queue_[0] : null;
};



office.debug.MemoryErrorSender.prototype.getQueueSize = function() {
  return this.queue_.length;
};



office.debug.MemoryErrorSender.prototype.disposeInternal = function() {
  delete this.queue_;
  goog.base(this, 'disposeInternal');
};
