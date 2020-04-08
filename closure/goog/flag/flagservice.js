goog.provide('office.flag.FlagService');

goog.require('goog.object');




office.flag.FlagService = function(opt_initialData) {


  this.flags_ = {};

  var initialData = opt_initialData ||
      goog.global[office.flag.FlagService.GLOBAL_DATA_PROPERTY_];
  if (initialData) {
    this.addData(/** @type {!Object} */ (initialData));
  }
};
goog.addSingletonGetter(office.flag.FlagService);



office.flag.FlagService.GLOBAL_DATA_PROPERTY_ = '_yiqixie_initdata';



office.flag.FlagService.prototype.get = function(flag) {
  return this.flags_[flag];
};



office.flag.FlagService.prototype.flagExists = function(flag) {
  return flag in this.flags_;
};



office.flag.FlagService.prototype.getBoolean = function(flag) {
  var value = this.get(flag);
  return goog.isString(value) ? value == 'true' || value == '1' : !!value;
};



office.flag.FlagService.prototype.getNumber = function(flag) {
  return Number(this.get(flag));
};



office.flag.FlagService.prototype.getString = function(flag) {
  var rawValue = this.get(flag);
  return goog.isDefAndNotNull(rawValue) ? String(rawValue) : '';
};



office.flag.FlagService.prototype.getJsonObject = function(flag) {
  var rawValue = this.get(flag);
  return goog.isDefAndNotNull(rawValue) ? Object(rawValue) : {};
};



office.flag.FlagService.prototype.addData = function(data) {
  goog.object.extend(this.flags_, data);
};
