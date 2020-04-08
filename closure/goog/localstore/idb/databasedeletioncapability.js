goog.provide('office.localstore.idb.DatabaseDeletionCapability');

goog.require('office.localstore.DatabaseDeletionCapability');
goog.require('office.localstore.idb.DocsDatabaseFactory');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('goog.asserts');



/**
 * Concrete implementation of the database deletion capability using an
 * IndexedDB database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @constructor
 * @struct
 * @extends {office.localstore.DatabaseDeletionCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DatabaseDeletionCapability = function(db) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;
};
goog.inherits(office.localstore.idb.DatabaseDeletionCapability,
    office.localstore.DatabaseDeletionCapability);


/** @override */
office.localstore.idb.DatabaseDeletionCapability.prototype.deleteAllData =
    function(completionCallback, opt_errorCallback) {
  goog.asserts.assert(!this.db_.hasVersionChanged(), 'Data already deleted.');

  // NOTE: Shared workers do not have access to this method on IndexedDB and we
  // can only do this now because the opt-out path is never hit from the bulk
  // syncer. Chrome bug: http://crbug.com/112535.
  office.localstore.idb.DocsDatabaseFactory.deleteDatabase(
      goog.bind(this.handleDeleteAllComplete_, this, completionCallback),
      opt_errorCallback || this.db_.getErrorCallback());
};


/**
 * Handles the on complete event of a transactions that deletes all object
 * stores.
 * @param {function()} completionCallback The callback to call when the
 *     transaction is complete.
 * @param {!Event} e The on complete event.
 * @private
 */
office.localstore.idb.DatabaseDeletionCapability.prototype.
    handleDeleteAllComplete_ = function(completionCallback, e) {
  this.db_.setDatabaseDeleted();
  completionCallback();
};


/** @override */
office.localstore.idb.DatabaseDeletionCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  throw Error('No object store available.');
};


/** @override */
office.localstore.idb.DatabaseDeletionCapability.prototype.
    performOperation = function(operation, transaction) {
  throw Error('Operation type ' + operation.getType() + ' not supported.');
};
