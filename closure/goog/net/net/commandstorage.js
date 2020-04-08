goog.provide('office.net.CommandStorage');

goog.require('office.net.RevisionProvider');
goog.require('goog.events.EventTarget');




office.net.CommandStorage = function() {
  goog.base(this);
};
goog.inherits(office.net.CommandStorage, goog.events.EventTarget);



office.net.CommandStorage.prototype.getCurrentRevision = goog.abstractMethod;



office.net.CommandStorage.prototype.saveCommand = goog.abstractMethod;



office.net.CommandStorage.prototype.saveCommands = goog.abstractMethod;



office.net.CommandStorage.prototype.updateSelection = goog.abstractMethod;



office.net.CommandStorage.prototype.getDebugContext = goog.abstractMethod;
