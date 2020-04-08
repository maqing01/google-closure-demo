goog.provide('office.localstore.idb.DocumentLock');



/**
 * A wrapper around a document lock in storage.
 * @param {number} expirationTime
 * @param {string} docId
 * @param {string} sessionId
 * @constructor
 * @struct
 */
office.localstore.idb.DocumentLock = function(expirationTime, docId, sessionId) {
  /** @private {number} */
  this.expirationTime_ = expirationTime;

  /** @private {string} */
  this.docId_ = docId;

  /** @private {string} */
  this.sessionId_ = sessionId;
};


/** The maximum allowable lock duration in milliseconds. */
office.localstore.idb.DocumentLock.MAX_VALID_LOCK_DURATION = 1 * 60 * 1000;


/**
 * The maximum allowable lock duration in milliseconds for locks from other
 * sessions in storage, in milliseconds. This is larger than
 * {@code MAX_VALID_LOCK_DURATION} so that small changes in system time don't
 * invalidate existing locks.
 * @private
 */
office.localstore.idb.DocumentLock.MAX_VALID_STORAGE_LOCK_DURATION_ =
    office.localstore.idb.DocumentLock.MAX_VALID_LOCK_DURATION + 5 * 60 * 1000;


/** The prefix with which to prepend web storage keys. */
office.localstore.idb.DocumentLock.WEB_STORAGE_PREFIX = 'dcl_';


/**
 * Storage property names.
 * @enum {string}
 * @private
 */
office.localstore.idb.DocumentLock.Property_ = {
  DOCUMENT_ID: 'lpath',
  SESSION_ID: '12',
  EXPIRATION_TIME: '13'
};


/** @return {number} */
office.localstore.idb.DocumentLock.prototype.getExpirationTime = function() {
  return this.expirationTime_;
};


/** @return {string} */
office.localstore.idb.DocumentLock.prototype.getSessionId = function() {
  return this.sessionId_;
};


/**
 * @param {string} sessionId The session ID to check.
 * @return {boolean} Whether the given session can claim the lock.
 */
office.localstore.idb.DocumentLock.prototype.isAvailableForSessionId = function(
    sessionId) {
  var now = goog.now();
  var maxValidLockExpirationTime =
      now + office.localstore.idb.DocumentLock.MAX_VALID_STORAGE_LOCK_DURATION_;
  if (this.expirationTime_ <= now ||
      this.expirationTime_ > maxValidLockExpirationTime ||
      this.sessionId_ == sessionId) {
    return true;
  }

  // If the lock-holding session has been closed, then the lock is available.
  var store = /** @type {Storage} */ (window.localStorage);
  return !!store && !!store.getItem(
      office.localstore.idb.DocumentLock.WEB_STORAGE_PREFIX + this.sessionId_);
};


/** @return {!Object} The serialized version of this lock. */
office.localstore.idb.DocumentLock.prototype.serialize = function() {
  var obj = {};
  obj[office.localstore.idb.DocumentLock.Property_.EXPIRATION_TIME] =
      this.expirationTime_;
  obj[office.localstore.idb.DocumentLock.Property_.DOCUMENT_ID] = [this.docId_];
  obj[office.localstore.idb.DocumentLock.Property_.SESSION_ID] = this.sessionId_;
  return obj;
};


/**
 * @param {!Object} obj The serialized form of the lock object.
 * @return {!office.localstore.idb.DocumentLock} A lock object.
 */
office.localstore.idb.DocumentLock.createFromStoreObject = function(obj) {
  return new office.localstore.idb.DocumentLock(
      obj[office.localstore.idb.DocumentLock.Property_.EXPIRATION_TIME],
      obj[office.localstore.idb.DocumentLock.Property_.DOCUMENT_ID][0],
      obj[office.localstore.idb.DocumentLock.Property_.SESSION_ID]
  );
};
