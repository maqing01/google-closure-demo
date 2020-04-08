/**
 * @fileoverview Contains the definition of the WrappedClipDataSerializer class.

 */

goog.provide('office.clipboard.WrappedClipDataSerializer');

goog.require('office.clipboard.WrappedClipData');



/**
 * A class that serializes wrapped clip data.
 * @constructor
 * @struct
 */
office.clipboard.WrappedClipDataSerializer = function() {};


/**
 * The keys used in the serialized wrapped clip.
 * @enum {string}
 * @private
 */
office.clipboard.WrappedClipDataSerializer.KEY_ = {
  DOC_ID_HASH: 'dih',
  DATA: 'data'
};


/**
 * Serializes the wrapped clip.
 * @param {!office.clipboard.WrappedClipData} wrappedClipData
 * @return {!Object} The serialized clip.
 */
office.clipboard.WrappedClipDataSerializer.prototype.serialize = function(
    wrappedClipData) {
  var serializedObj = {};
  serializedObj[office.clipboard.WrappedClipDataSerializer.KEY_.DOC_ID_HASH] =
      wrappedClipData.getDocumentIdHash();
  serializedObj[office.clipboard.WrappedClipDataSerializer.KEY_.DATA] =
      wrappedClipData.getData();
  return serializedObj;
};


/**
 * Deserializes a serialized object into wrapped clip data.
 * @param {!Object} serializedObj The serialized clip object.
 * @return {!office.clipboard.WrappedClipData} The deserialized clip data.
 */
office.clipboard.WrappedClipDataSerializer.prototype.deserialize = function(
    serializedObj) {
  var docIdHash =
      serializedObj[office.clipboard.WrappedClipDataSerializer.KEY_.DOC_ID_HASH];
  var data =
      serializedObj[office.clipboard.WrappedClipDataSerializer.KEY_.DATA];
  if (!docIdHash || !data) {
    throw Error('Cannot deserialize due to missing fields.');
  }

  return new office.clipboard.WrappedClipData(docIdHash, data);
};


/**
 * Serializes the wrapped clip data into a JSON string.
 * @param {!office.clipboard.WrappedClipDataSerializer} serializer The serializer.
 * @param {!office.clipboard.WrappedClipData} data The data to serialize.
 * @return {string} The serialized clip data.
 */
office.clipboard.WrappedClipDataSerializer.serialize = function(
    serializer, data) {
  var object = serializer.serialize(data);
  return JSON.stringify(object);
};


/**
 * Deserializes a json string into wrapped clip data.
 * @param {!office.clipboard.WrappedClipDataSerializer} serializer The serializer.
 * @param {string} dataObject The serialized clip json.
 * @return {!office.clipboard.WrappedClipData} The deserialized clip data.
 */
office.clipboard.WrappedClipDataSerializer.deserialize = function(
    serializer, dataObject) {
  var jsonObject = JSON.parse(dataObject);
  if (goog.isObject(jsonObject)) {
    return serializer.deserialize(jsonObject);
  }
  throw Error('Only objects can be deserialized into WrappedClipData objects.');
};
