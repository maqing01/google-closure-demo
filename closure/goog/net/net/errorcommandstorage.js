



goog.provide('office.net.ErrorCommandStorage');

goog.require('office.net.CommandStorage');
goog.require('goog.functions');




office.net.ErrorCommandStorage = function() {
  goog.base(this);
};
goog.inherits(office.net.ErrorCommandStorage, office.net.CommandStorage);



office.net.ErrorCommandStorage.prototype.saveCommand =
    goog.functions.error('');



office.net.ErrorCommandStorage.prototype.saveCommands =
    goog.functions.error('');
