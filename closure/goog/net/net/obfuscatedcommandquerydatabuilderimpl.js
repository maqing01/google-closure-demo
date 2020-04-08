goog.provide('office.net.ObfuscatedCommandQueryDataBuilderImpl');

goog.require('office.net.CommandQueryDataBuilder');
goog.require('office.net.CommandStorageParam');
goog.require('goog.json.NativeJsonProcessor');
goog.require('goog.crypt.obfuscation');
goog.require('goog.math');




office.net.ObfuscatedCommandQueryDataBuilderImpl = function(commandBundleSerializer) {

  this.commandBundleSerializer_ = commandBundleSerializer;


  this.jsonProcessor_ = new goog.json.NativeJsonProcessor();
};



office.net.ObfuscatedCommandQueryDataBuilderImpl.prototype.buildBatchesMessageArray = function(
    commandBundles, selection, selectionConverter, serializer, revision) {
  if (commandBundles.length == 0 && !selection) {
    throw Error('Cannot send an empty message to the server.');
  }

  var queryDataArray = [office.net.CommandStorageParam.PAYLOAD];
  var payloadArray = [];
  payloadArray.push(office.net.CommandStorageParam.REVISION);

  payloadArray.push(revision);

  if (commandBundles.length > 0) {
    var bundleObjects = [];
    for (var i = 0; i < commandBundles.length; i++) {
      bundleObjects.push(
          this.commandBundleSerializer_.serialize(commandBundles[i]));
    }
    payloadArray.push(office.net.CommandStorageParam.COMMAND_BUNDLES);
    payloadArray.push(this.jsonProcessor_.stringify(bundleObjects));
  }

  if (selection) {
    var serializedSelection = serializer.serialize(
        selectionConverter.toCommand(selection));
    payloadArray.push(office.net.CommandStorageParam.SELECTION);
    payloadArray.push(this.jsonProcessor_.stringify(serializedSelection));
  }

  var baseString = this.jsonProcessor_.stringify(payloadArray);



  var obfuscated = goog.crypt.obfuscation.obfuscateByteArray(
      goog.crypt.obfuscation.stringToUint(baseString));
  queryDataArray.push(obfuscated);
  return queryDataArray;
};
