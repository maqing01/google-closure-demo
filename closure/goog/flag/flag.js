goog.provide('office.flag');

goog.require('office.flag.FlagService');



office.flag.getInstance = function() {
  return office.flag.FlagService.getInstance();
};
