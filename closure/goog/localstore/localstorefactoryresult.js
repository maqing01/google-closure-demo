/**

 */

goog.provide('office.localstore.LocalStoreFactoryResult');



//  Make the local store non nullable. The local store
// factory should call the error callback with a NON_OPTED_IN error
// when the local store is not created, to users of the factory can
// handle that gracefully.
/**
 * Object returned in LocalStoreFactory's deferred result callback.
 * @param {office.localstore.LocalStore} localStore
 * @param {office.localstore.User} user
 * @constructor
 */
office.localstore.LocalStoreFactoryResult = function(localStore, user) {
  /** @private {office.localstore.LocalStore} */
  this.localStore_ = localStore;

  /** @private {office.localstore.User} */
  this.user_ = user;
};


/**
 * Returns the user, if already read during initialization. Otherwise returns
 * null. Also returns null if the database is upgraded after the user is read.
 * @return {office.localstore.User}
 */
office.localstore.LocalStoreFactoryResult.prototype.getUser = function() {
  return this.user_;
};


/**
 * Returns the local store, or null if the local store could not be created.
 * @return {office.localstore.LocalStore}
 */
office.localstore.LocalStoreFactoryResult.prototype.getLocalStore = function() {
  return this.localStore_;
};
