/**
 * @fileoverview Contains the definition of the LockAcquisitionResult enum.

 */

goog.provide('office.localstore.LockAcquisitionResult');


/**
 * Possible results of a lock acquisition.
 * @enum {number}
 */
office.localstore.LockAcquisitionResult = {
  /** The lock was acquired. */
  ACQUIRED: 1,

  /**
   * The lock was not acquired because it was not available for this session.
   */
  UNAVAILABLE: 2,

  /** The lock was not acquired because of a storage error. */
  STORAGE_ERROR: 3,

  /** The lock acquisition timed out. */
  TIMEOUT: 4
};
