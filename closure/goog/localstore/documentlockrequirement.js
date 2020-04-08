/**
 * @fileoverview Contains the definition of the DocumentLockRequirement class.
 */

goog.provide('office.localstore.DocumentLockRequirement');



/**
 * A class to represent a requirement for a document lock, including the
 * document ID that a lock is required for, and the lock level. An instance of
 * this is returned by {@code Record#getDocumentLockRequirement} and used to
 * generate operations to check the document lock as needed when writing records
 * via LocalStore.
 * @param {string} docId
 * @param {office.localstore.DocumentLockRequirement.Level} level
 * @constructor
 * @struct
 */
office.localstore.DocumentLockRequirement = function(docId, level) {
  /** @private {string} */
  this.docId_ = docId;

  /** @private {office.localstore.DocumentLockRequirement.Level} */
  this.level_ = level;
};


/** @return {string} The document ID. */
office.localstore.DocumentLockRequirement.prototype.getDocId = function() {
  return this.docId_;
};


/** @return {office.localstore.DocumentLockRequirement.Level} */
office.localstore.DocumentLockRequirement.prototype.getLevel = function() {
  return this.level_;
};


/**
 * The required document lock level. Higher numbers imply a stricter requirement
 * and satisfy all lower levels. For desktop, holding the lock means that the
 * lock is not expired, or expired but not touched by a different session.
 * @enum {number}
 */
office.localstore.DocumentLockRequirement.Level = {
  /**
   * The document lock has to be available, i.e. currently not held by a
   * different active editor session. If the lock is held by the bulk syncer,
   * this same session or nobody, this requirement will be satisfied.
   */
  AVAILABLE: 1,

  /**
   * The document lock has to be held by the current session. This requirement
   * will not be satisfied if the lock is held by a different session or nobody
   * is holding the lock.
   */
  OWNER: 2
};


/**
 * @param {office.localstore.DocumentLockRequirement.Level} level1
 * @param {office.localstore.DocumentLockRequirement.Level} level2
 * @return {office.localstore.DocumentLockRequirement.Level} The stricter document
 *     lock level of the given two levels.
 */
office.localstore.DocumentLockRequirement.getStricterLevel = function(
    level1, level2) {
  return level1 > level2 ? level1 : level2;
};


/**
 * @return {office.localstore.DocumentLockRequirement.Level} The least strict
 *     document lock level.
 */
office.localstore.DocumentLockRequirement.getLowestLevel = function() {
  return office.localstore.DocumentLockRequirement.Level.AVAILABLE;
};
