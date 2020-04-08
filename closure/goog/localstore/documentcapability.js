goog.provide('office.localstore.DocumentCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Document');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');
goog.require('goog.asserts');



/**
 * Base class that hosts the public APIs used to read and write documents
 * to local storage.
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DocumentCapability = function(documentAdapters) {
  goog.base(this);

  /**
   * @type {!Object.<!office.localstore.DocumentAdapter>}
   * @private
   */
  this.documentAdapters_ = documentAdapters;
};
goog.inherits(office.localstore.DocumentCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.DocumentCapability.prototype.getSupportedRecordTypes =
    function() {
  return [office.localstore.Record.Type.DOCUMENT];
};


/**
 * @return {!Object.<!office.localstore.DocumentAdapter>}
 * @protected
 */
office.localstore.DocumentCapability.prototype.getDocumentAdapters =
    function() {
  return this.documentAdapters_;
};


/**
 * @return {!office.localstore.DocumentAdapter} The document adapter for the
 *    specified document type.
 * @param {string} type
 * @protected
 */
office.localstore.DocumentCapability.prototype.getAdapterForType =
    function(type) {
  var documentAdapter = this.documentAdapters_[type];
  if (!documentAdapter) {
    throw Error('No adapter found for this type: ' + type);
  }
  return documentAdapter;
};


/**
 * @param {string} docId The document id.
 * @param {boolean} requireFullySynced Whether to return data only if the
 *     specified document either has: 1) some saved, non-staged model data,
 *     regardless of if there is also some data staged; or 2) is
 *     completely empty, with no model data at all. If the document only has
 *     model data marked as staged, then resultCallback will be called with
 *     null.
 * @param {function(office.localstore.Document)} resultCallback A function which
 *     will be called asynchronously to report the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.readDocument =
    goog.abstractMethod;


/**
 * Gets all the documents accessible to a user.
 * @param {?string} userId If set, restricts to documents accessible to this
 *     user.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback A
 *    function which will be called asynchronously to report the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *    Callback for handling errors.
 * @param {boolean=} opt_noModelData Whether to fetch only document-level
 *     metadata rather than the actual contents of the document.
 */
office.localstore.DocumentCapability.prototype.readDocumentsByUser =
    goog.abstractMethod;


/**
 * Fetches all document objects which have pending changes.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.readDocumentsWithPendingChanges =
    goog.abstractMethod;


/**
 * Removes the extraneous records stored in the staging tables if any.
 * @param {!Array.<string>} saveDocIds The ids of the documents whose staged
 *     records we need to preserve.
 * @param {function()=} opt_completionCallback Callback for when the staged
 *     records are deleted.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.clearAllStagedRecords =
    goog.abstractMethod;


/**
 * Deletes records from the staging tables for the given document if any exist.
 * @param {string} docId The id of the documents whose staged record will be
 *     cleared.
 * @param {function()=} opt_completionCallback Callback for when the staged
 *     records are deleted.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.clearStagedRecords =
    goog.abstractMethod;


/**
 * Fetches document objects which have pending comments.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.readDocumentsWithPendingComments =
    goog.abstractMethod;


/**
 * Gets the non-snapshotted documents in storage.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback The
 *     result callback.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.readNonSnapshottedDocuments =
    goog.abstractMethod;


/**
 * Gets the missing docos documents in storage.
 * @param {function(!Array.<!office.localstore.Document>)} resultCallback The
 *     result callback.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCapability.prototype.readMissingDocosDocuments =
    goog.abstractMethod;


/**
 * Creates a new document object, of a given type.  A document adapter for this
 * type has to have been registered, and will participate in this operation.
 * The resulting object will have to be passed to write() before it will
 * be written to local storage.
 * @param {string} id The document's id.
 * @param {office.localstore.Document.Type} type The document's type.
 * @return {!office.localstore.Document} The new document instance.
 */
office.localstore.DocumentCapability.prototype.createDocument =
    function(id, type) {
  var documentAdapter = goog.asserts.assertObject(this.documentAdapters_[type]);
  return documentAdapter.createDocument(id);
};


/** @override */
office.localstore.DocumentCapability.prototype.isOperationSupported =
    function(operation) {
  var type = operation.getType();
  if (type == office.localstore.Operation.Type.APPEND_COMMANDS ||
      type == office.localstore.Operation.Type.UNSTAGE_COMMANDS ||
      type == office.localstore.Operation.Type.WRITE_TRIX_DOC) {
    return true;
  }
  return goog.base(this, 'isOperationSupported', operation);
};


/** @override */
office.localstore.DocumentCapability.prototype.createOperationsForRecordInternal =
    function(record, opt_nullableProperties) {
  var document = /** @type {office.localstore.Document} */ (record);

  // Use default operation handling for normal property modifications.
  var baseOperations = goog.base(this, 'createOperationsForRecordInternal',
      record, [
        office.localstore.Document.Property_v4.LAST_MODIFIED_CLIENT_TIMESTAMP,
        office.localstore.Document.Property_v6.INITIAL_COMMANDS
      ]);

  // Get any document type-specific operations.
  var adapter = this.getAdapterForType(document.getType());
  var adapterOperations = adapter.createOperations(document);
  return baseOperations.concat(adapterOperations);
};


/** @override */
office.localstore.DocumentCapability.prototype.getKeyForRecord = function(
    record) {
  var document = /** @type {!office.localstore.Document} */ (record);
  return document.getId();
};
