goog.provide('office.localstore.idb.DocumentAdapter');



/**
 * The interface for an IndexedDB-based document adapter. It should be
 * implemented by all document adapters that use IndexedDB to store their
 * document data.
 * @interface
 */
office.localstore.idb.DocumentAdapter = function() {};


/**
 * Performs the specified operation.
 * @param {!office.localstore.Operation} operation
 * @param {!office.localstore.idb.Transaction} transaction
 */
office.localstore.idb.DocumentAdapter.prototype.performOperation =
    goog.abstractMethod;


/**
 * @return {number} The minimum schema version this adapter works with.
 */
office.localstore.idb.DocumentAdapter.prototype.getMinSchemaVersion =
    goog.abstractMethod;


/**
 * @return {number} The maximum schema version this adapter works with.
 */
office.localstore.idb.DocumentAdapter.prototype.getMaxSchemaVersion =
    goog.abstractMethod;
