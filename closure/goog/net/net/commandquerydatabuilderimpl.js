goog.provide('office.net.CommandQueryDataBuilderImpl');

goog.require('office.net.CommandQueryDataBuilder');
goog.require('office.net.CommandStorageParam');
goog.require('goog.json.NativeJsonProcessor');
goog.require('goog.crypt.obfuscation');
goog.require('goog.math');




office.net.CommandQueryDataBuilderImpl = function(commandBundleSerializer) {

  this.commandBundleSerializer_ = commandBundleSerializer;


  this.jsonProcessor_ = new goog.json.NativeJsonProcessor();
};



office.net.CommandQueryDataBuilderImpl.prototype.buildBatchesMessageArray = function(
    commandBundles, selection, selectionConverter, serializer, revision) {
  if (commandBundles.length == 0 && !selection) {
    throw Error('Cannot send an empty message to the server.');
  }

  var queryDataArray = [office.net.CommandStorageParam.REVISION, revision];

  if (commandBundles.length > 0) {
    var bundleObjects = [];
    for (var i = 0; i < commandBundles.length; i++) {
      bundleObjects.push(
          this.commandBundleSerializer_.serialize(commandBundles[i]));
    }
    queryDataArray.push(office.net.CommandStorageParam.COMMAND_BUNDLES);
    queryDataArray.push(this.jsonProcessor_.stringify(bundleObjects));
  }

  if (selection) {
    var serializedSelection = serializer.serialize(
        selectionConverter.toCommand(selection));
    queryDataArray.push(office.net.CommandStorageParam.SELECTION);
    queryDataArray.push(this.jsonProcessor_.stringify(serializedSelection));
  }

  return queryDataArray;
};
