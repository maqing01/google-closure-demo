

/**
 * @fileoverview Error type for local storage.

 */

goog.provide('office.localstore.LocalStoreError');

goog.require('goog.debug.Error');



/**
 * Data object describing an error that have occurred while performing local
 * store operations.
 * @param {!office.localstore.LocalStoreError.Type} type The type of error.
 * @param {string} message A message describing the situation.
 * @param {(Error|Event)=} opt_cause An optional exception or error event to
 *     wrap.
 * @constructor
 * @struct
 * @extends {goog.debug.Error}
 */
office.localstore.LocalStoreError = function(type, message, opt_cause) {
  goog.base(this, ': ' + message);

  /**
   * The type of error.
   * @type {!office.localstore.LocalStoreError.Type}
   */
  this.type = type;

  //  Change the cause to always be an event.
  /**
   * The cause of the error.
   * @type {(Error|Event)}
   */
  this.cause = opt_cause || null;
};
goog.inherits(office.localstore.LocalStoreError, goog.debug.Error);


/**
 * Various types of local store errors.
 *
 * NOTE: This enum needs to be kept in sync with
 * {@code java.com.google.apps.office.gwt.overlay.LocalStoreErrorType}.
 *
 * @enum {number}
 */
office.localstore.LocalStoreError.Type = {
  /** Indicates an internal error happened within the storage layer. */
  DATABASE_ERROR: 1,

  /** Attempted to perform work without the required lock. */
  LOCK_MISSING: 2,

  /** Data assumed to be in storage turned out to be missing. */
  DATA_MISSING: 3,

  /** The schema initialization could not be performed. */
  SCHEMA_UPDATES_PROHIBITED: 4,

  /**
   * Deletion was prevented because there were pending changes, i.e. changes not
   * yet saved on the server.
   */
  DELETION_PREVENTED: 5,

  /** Indicates that the open database request timed out. */
  OPEN_DATABASE_TIMEOUT: 6
};


/**
 * @return {string} A log-friendly version of this error.
 */
office.localstore.LocalStoreError.prototype.getFriendlyErrorMessage = function() {
  return 'Failed to write to localstore (' + this.type + '): ' + this.message;
};


/**
 * @return {Object} The DOM error or null, if the error wasn't provided.
 * @private
 */
office.localstore.LocalStoreError.prototype.getDomError_ = function() {
  var target = this.cause && this.cause instanceof Event ?
      this.cause.target :
      null;
  return target ? target['error'] : null;
};


/**
 * @return {boolean} Whether the error is due to disk quota being exceeded.
 */
office.localstore.LocalStoreError.prototype.isQuotaExceeded = function() {
  var domError = this.getDomError_();
  return !!domError && domError.name == 'QuotaExceededError';
};


/**
 * @return {boolean} Whether the database should be reopen due to an
 *     UnknownError, which usually indicates corruption, or some other internal
 *     database error.
 */
office.localstore.LocalStoreError.prototype.shouldReopen = function() {
  var domError = this.getDomError_();
  return this.type == office.localstore.LocalStoreError.Type.DATABASE_ERROR &&
      !!domError && domError.name == 'UnknownError';
};

