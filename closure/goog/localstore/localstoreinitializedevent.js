

/**
 * @fileoverview Contains the definition of the LocalStoreInitializedEvent
 * class.

 */

goog.provide('office.localstore.LocalStoreInitializedEvent');

goog.require('office.localstore.LocalStorageLoaderEventType');
goog.require('goog.events.Event');



/**
 * An event dispatched by the {@code office.localstore.LocalStorageLoader} after
 * the local store has been initialized or the loader determined that local
 * storage should not be used.
 * @param {office.localstore.LocalStore} localStore The local store, or null when
 *     local storage should not be used.
 * @param {office.localstore.User} user The user.
 * @param {?office.localstore.LockAcquisitionResult} lockAcquisitionResult The
 *     result of the document lock acquisition, or null if there was no attempt
 *     to acquire the lock.
 * @param {office.localstore.Document} document The document, or null if the user
 *    is not opted into offline or there was an error reading the local store.
 * @param {office.localstore.PendingQueue} pendingQueue The pending queue, or
 *    null if the user is not opted into offline, there was an error reading
 *    the local store or the document lock couldn't be acquired.
 * @param {Object=} opt_target The target of this event.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.localstore.LocalStoreInitializedEvent = function(localStore, user,
    lockAcquisitionResult, document, pendingQueue, opt_target) {
  goog.base(this, office.localstore.LocalStorageLoaderEventType.INITIALIZED,
      opt_target);

  /**
   * The local store, or null when local storage should not be used.
   * @type {office.localstore.LocalStore}
   */
  this.localStore = localStore;

  /**
   * @type {office.localstore.User}
   */
  this.user = user;

  /**
   * The result of the document lock acquisition, or null if there was no
   * attempt to acquire the lock.
   * @type {?office.localstore.LockAcquisitionResult}
   */
  this.lockAcquisitionResult = lockAcquisitionResult;

  /**
   * @type {office.localstore.Document}
   */
  this.document = document;

  /**
   * @type {office.localstore.PendingQueue}
   */
  this.pendingQueue = pendingQueue;
};
goog.inherits(office.localstore.LocalStoreInitializedEvent, goog.events.Event);
