
//
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
 * @fileoverview Definition of event type and related helper functions.
 */

goog.provide('wireless.events.EventType');



/**
 * Unique event types.
 * @enum {string}
 */
wireless.events.EventType = {};


/**
 * Counter used to generate unique IDs for each call to createEventType.
 * @type {number}
 * @private
 */
wireless.events.EventType.counter_ = 0;


/**
 * Given a desired event type, get an event type that is guaranteed to be
 * unique. Overriden by compiler to generate small, unique IDs.
 * @param {string} eventTypeName The desired event type name.
 * @return {wireless.events.EventType} The event type.
 */
wireless.events.EventType.create = function(eventTypeName) {
  return /** @type {wireless.events.EventType} */ (
      eventTypeName + '_' + wireless.events.EventType.counter_++);
};
