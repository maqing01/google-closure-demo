/**
 * @fileoverview Contains the definition of the ClipDataSerializer interface.

 */

goog.provide('office.clipboard.ClipDataSerializer');



/**
 * An interface for serializing ClipData objects.
 * @interface
 */
office.clipboard.ClipDataSerializer = function() {};


/**
 * Serializes the given ClipData object.
 * @param {!office.clipboard.ClipData} data The data object to serialize.
 * @return {!Object} The serialized clip data object.
 */
office.clipboard.ClipDataSerializer.prototype.serialize = goog.abstractMethod;


/**
 * Deserializes the given ClipData object.
 * @param {!Object} dataObject The serialized clip data object.
 * @return {!office.clipboard.ClipData} The deserialized clip data.
 */
office.clipboard.ClipDataSerializer.prototype.deserialize =
    goog.abstractMethod;


/**
 * Serializes the given ClipData object as a JSON string.
 * @param {!office.clipboard.ClipDataSerializer} serializer The serializer.
 * @param {!office.clipboard.ClipData} data The clip data to serialize.
 * @return {string} The serialized JSON string.
 */
office.clipboard.ClipDataSerializer.serialize = function(serializer, data) {
  var object = serializer.serialize(data);
  return JSON.stringify(object);
};


/**
 * Parses the given json and creates a clip data object from it.
 * @param {!office.clipboard.ClipDataSerializer} serializer The serializer.
 * @param {string} dataObject The clip data to deserialize.
 * @return {office.clipboard.ClipData} The clip data object or null if the clip
 *    data couldn't be parsed.
 */
office.clipboard.ClipDataSerializer.deserialize = function(
    serializer, dataObject) {
  try {
    var object = JSON.parse(dataObject);
    return goog.isObject(object) ? serializer.deserialize(object) : null;
  } catch (ex) {
    return null;
  }
};
