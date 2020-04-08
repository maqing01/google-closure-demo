goog.provide('office.diagnostics.InitialLoadTiming');



/**
 * An interface for managing interactions with a settable timing object and
 * reporting the initial load timing values after all required fields are set.
 * @interface
 */
office.diagnostics.InitialLoadTiming = function() {};


/**
 * Set the required keys to be optional. If there are no more uninitialized
 * required fields, send the timing object.
 * @param {!Array.<office.diagnostics.InitialLoadTimingKeys>} keys The keys to
 *    make optional.
 */
office.diagnostics.InitialLoadTiming.prototype.setAsOptional =
    goog.abstractMethod;


/**
 * Sets the time field to the current time if not set yet. Throws if the timing
 * object is not set or the timing field is already set.
 * @param {string} field The timing field to set to the current time.
 */
office.diagnostics.InitialLoadTiming.prototype.setTime = goog.abstractMethod;


/**
 * Gets a timing field. Returns null if the timing field is not initialized.
 * @param {string} field The timing field to get.
 * @return {?number} The timing recorded for given field, null if not set.
 */
office.diagnostics.InitialLoadTiming.prototype.getTime = goog.abstractMethod;


//  Add an additional method to this API which sets a time
// with a given value without letting it be set again. Then clean up the current
// usages of incrementTime to possibly use that new method.
/**
 * Increments a timing field with a given amount of time. Throws if the timing
 * object is not set or the timing field is not initialized.
 * @param {string} field The timing field to set.
 * @param {number} timeDelta The amount the field should be incremented.
 */
office.diagnostics.InitialLoadTiming.prototype.incrementTime =
    goog.abstractMethod;


/**
 * Sets the field to the given value if not set yet. Throws if the timing
 * object is not set or the field is already set.
 * @param {string} field The field to set to the given value.
 * @param {number} value The value to set
 */
office.diagnostics.InitialLoadTiming.prototype.setValue = goog.abstractMethod;
