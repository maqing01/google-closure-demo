// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Common generator function for control types.
 */

goog.provide('wireless.events.browser.ControlType');

goog.require('goog.asserts');


/**
 * Tokens that uniquely identify an event.
 * @enum {string}
 */
wireless.events.browser.ControlType = {};


/**
 * Counter used to generate unique IDs for each call to create().
 * @type {number}
 * @private
 */
wireless.events.browser.ControlType.counter_ = 0;


/**
 * Delimiter placed between the control type ID and the counter to
 * generate a unique controltypeID.
 * NOTE: DO NOT USE '_' as it is a special character in superpudu.
 * @type {string}
 * @private
 */
wireless.events.browser.ControlType.COUNTER_DELIMITER_ = '+';


/**
 * Prefix for closure events in order to prevent namespace collisions with
 * regular ControlType events.
 * @type {string}
 * @private
 */
wireless.events.browser.ControlType.DYNAMIC_TYPE_NAMESPACE_PREFIX_ = '!';


/**
 * A character that is added to control types in order to mark them as
 * silenced (not logged).
 * @type {string}
 * @private
 */
wireless.events.browser.ControlType.SILENCE_CONTROL_TYPE_MARKER_ = ')';


/**
 * A character that is added to control types in order to mark them as
 * broadcastable.
 * @type {string}
 * @private
 */
wireless.events.browser.ControlType.BROADCAST_CONTROL_TYPE_MARKER_ = '*';


/**
 * The regular expression that limits what strings can be used in a control
 * type ID.  None of the above special characters should be allowed.
 * @type {RegExp}
 * @private
 */
wireless.events.browser.ControlType.idRegExp_ =
    new RegExp('^[a-zA-Z0-9_\\-]*$');

/**
 * A regular expression that extracts the control type id from a prefixed
 * and/or suffixed controlType.
 * @type {RegExp}
 * @private
 */
wireless.events.browser.ControlType.idExtractionRegExp_ =
    new RegExp('[*]?[!]?([a-zA-Z0-9_\\-]*)[+]?.*');


/**
 * Overridden by the compiler to generate small, unique IDs.
 * @param {string} controlTypeId Must be a constant.
 * @return {!wireless.events.browser.ControlType} The ID for the control type.
 */
wireless.events.browser.ControlType.create = function(controlTypeId) {
  goog.asserts.assert(
      controlTypeId.match(wireless.events.browser.ControlType.idRegExp_),
      'ControlType.create contains invalid characters' + controlTypeId);

  return /** @type {!wireless.events.browser.ControlType} */ (
      controlTypeId +
      wireless.events.browser.ControlType.COUNTER_DELIMITER_ +
      wireless.events.browser.ControlType.counter_++);
};


/**
 * Creates a control type from a non-string literal and prefixes it so that it
 * will not conflict with regular control types. This is can be used to create
 * control types dynamically.
 * @param {string} controlTypeId The ID for the control type.
 * @return {!wireless.events.browser.ControlType} The control type.
 */
wireless.events.browser.ControlType.createDynamicControlType =
    function(controlTypeId) {
  return /** @type {!wireless.events.browser.ControlType} */ (
      wireless.events.browser.ControlType.DYNAMIC_TYPE_NAMESPACE_PREFIX_ +
      controlTypeId);
};


/**
 * Adds a marker to the control type that will prevent it from being logged when
 * fired.
 * @param {!wireless.events.browser.ControlType} controlType The control type to
 *     silence.
 * @return {!wireless.events.browser.ControlType} The modified ID.
 */
wireless.events.browser.ControlType.silenceControlType = function(controlType) {
  return /** @type {!wireless.events.browser.ControlType} */ (controlType +
      wireless.events.browser.ControlType.SILENCE_CONTROL_TYPE_MARKER_);
};


/**
 * Adds a marker to the control type that will make it broadcastable (i.e., the
 * event will be sent to all the event handlers which registered for it).
 * @param {!wireless.events.browser.ControlType} controlType The control type to
 *     broadcast.
 * @return {!wireless.events.browser.ControlType} The modified ID.
 */
wireless.events.browser.ControlType.broadcastControlType =
    function(controlType) {
  return /** @type {!wireless.events.browser.ControlType} */ (
      wireless.events.browser.ControlType.BROADCAST_CONTROL_TYPE_MARKER_ +
      controlType);
};


/**
 * @param {!wireless.events.browser.ControlType} controlType The control type to
 *     check.
 * @return {boolean} Whether the given control type has been marked as silenced.
 */
wireless.events.browser.ControlType.isControlTypeSilenced =
    function(controlType) {
  return controlType.slice(-1) ==
         wireless.events.browser.ControlType.SILENCE_CONTROL_TYPE_MARKER_;
};


/**
 * @param {!wireless.events.browser.ControlType} controlType The control type to
 *     check.
 * @return {boolean} Whether the given control type has been marked as silenced.
 */
wireless.events.browser.ControlType.isControlTypeBroadcastable =
    function(controlType) {
  return controlType.charAt(0) ==
         wireless.events.browser.ControlType.BROADCAST_CONTROL_TYPE_MARKER_;
};

/**
 * Strips the given controlType of all prefixes and suffixes and returns the
 * controlTypeId that was originally used to create the control type.
 * @param {!wireless.events.browser.ControlType} controlType
 * @return {string} The stripped version of the control type.
 */
wireless.events.browser.ControlType.stripControlType = function(controlType) {
  var result = wireless.events.browser.ControlType.idExtractionRegExp_.exec(
      controlType);
  if (!result || !result[1]) {
    return '';
  }
  return result[1];
};
