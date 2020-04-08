



goog.provide('office.net.QpsLimiter');
goog.provide('office.net.QpsLimiter.Config');
goog.provide('office.net.QpsLimiter.ConfigParam');
goog.provide('office.net.QpsLimiter.LimitError');

goog.require('goog.debug.Error');
goog.require('goog.object');
goog.require('goog.stats.BasicStat');
goog.require('goog.string');




office.net.QpsLimiter = function(name, limit, interval) {

  this.name_ = name;


  this.limit_ = limit;


  this.qpsWatcher_ = new goog.stats.BasicStat(interval * 1000);
};



office.net.QpsLimiter.prototype.isUnderLimit = function(opt_incBy) {
  var incBy = goog.isDefAndNotNull(opt_incBy) ? opt_incBy : 1;
  var qps = (this.qpsWatcher_.get() + incBy) / this.getInterval();
  return qps <= this.limit_;
};



office.net.QpsLimiter.prototype.incrementAndCheck = function(opt_incBy) {
  var incBy = goog.isDefAndNotNull(opt_incBy) ? opt_incBy : 1;
  if (!this.isUnderLimit(incBy)) {
    throw new office.net.QpsLimiter.LimitError(goog.string.buildString(
        'Query would cause ', this.name_, ' to exceed ', this.limit_,
        ' qps.'));
  }
  this.qpsWatcher_.incBy(incBy);
};



office.net.QpsLimiter.prototype.getInterval = function() {
  return this.qpsWatcher_.getInterval() / 1000;
};



office.net.QpsLimiter.prototype.getQpsLimit = function() {
  return this.limit_;
};



office.net.QpsLimiter.ConfigParam = {
  NAME: 'n',
  LIMIT: 'l',
  INTERVAL: 'i'
};



office.net.QpsLimiter.Config;



office.net.QpsLimiter.getConfig = function(name, limit, interval) {
  return goog.object.create(
      office.net.QpsLimiter.ConfigParam.NAME, name,
      office.net.QpsLimiter.ConfigParam.LIMIT, limit,
      office.net.QpsLimiter.ConfigParam.INTERVAL, interval);
};



office.net.QpsLimiter.fromConfig = function(config) {
  var param = office.net.QpsLimiter.ConfigParam;
  return new office.net.QpsLimiter(
 (config[param.NAME]),
 (config[param.LIMIT]),
 (config[param.INTERVAL]));
};




office.net.QpsLimiter.LimitError = function(msg) {
  goog.base(this, msg);
};
goog.inherits(office.net.QpsLimiter.LimitError, goog.debug.Error);
