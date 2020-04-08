/**
 * @fileoverview Base class for the capability used to handle document creation.

 */

goog.provide('office.localstore.DocumentCreationCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.ApplicationMetadata');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');
goog.require('office.localstore.UpdateApplicationMetadataOperation');



/**
 * Base class for the capability used to handle document creation.
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DocumentCreationCapability = function(documentAdapters) {
  goog.base(this);

  /**
   * @type {!Object.<!office.localstore.DocumentAdapter>}
   * @private
   */
  this.documentAdapters_ = documentAdapters;
};
goog.inherits(office.localstore.DocumentCreationCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.DocumentCreationCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.APPLICATION_METADATA];
};


/**
 * Returns a unique unused Cosmo id for the given document type. Remove that id
 * from storage so that it is never used again.
 * @param {office.localstore.Document.Type} docType The document's type.
 * @param {function(string)} resultCallback Called with the popped document id.
 *     May be called asynchronously.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCreationCapability.prototype.popUnusedDocumentId =
    goog.abstractMethod;


/**
 * Adds the given ids to the list of unique unused Cosmo ids.
 * @param {office.localstore.Document.Type} docType The document's type.
 * @param {!Array.<string>} unusedIds An array of unused Cosmo Ids.
 * @param {function()} resultCallback Called with a boolean indicating the
 *     success of the operation. May be called asynchronously.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCreationCapability.prototype.pushUnusedDocumentIds =
    goog.abstractMethod;


/**
 * Gets the number of document ids in storage.
 * @param {office.localstore.Document.Type} docType The document's type.
 * @param {function(number)} resultCallback Called back with the number of
 *     document ids in storage. May be called asynchronously.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCreationCapability.prototype.getUnusedDocumentIdCount =
    goog.abstractMethod;


/**
 * Gets the application metadata from storage for the given type.
 * @param {office.localstore.Document.Type} docType The document's type.
 * @param {function(office.localstore.ApplicationMetadata)} resultCallback Called
 *     with the application metadata or null if one isn't available for the
 *     given document type. May be called asynchronously.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCreationCapability.prototype.getApplicationMetadata =
    goog.abstractMethod;


/**
 * Gets the application metadata from storage for all types.
 * @param {function(!Array.<!office.localstore.ApplicationMetadata>)}
 *     resultCallback Called with the application metadata. May be called
 *     asynchronously.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentCreationCapability.prototype.getAllApplicationMetadata =
    goog.abstractMethod;


/**
 * Create a new application metadata with no fields set other than type.
 * @param {office.localstore.Document.Type} docType The document's type.
 * @return {!office.localstore.ApplicationMetadata} The new application metadata
 *     with the document type set.
 */
office.localstore.DocumentCreationCapability.prototype.createApplicationMetadata =
    function(docType) {
  return new office.localstore.ApplicationMetadata(docType, true /* isNew */);
};


/** @override */
office.localstore.DocumentCreationCapability.prototype.getKeyForRecord =
    function(record) {
  var metadataRecord =
      /** @type {!office.localstore.ApplicationMetadata} */ (record);
  return metadataRecord.getDocumentType();
};


/** @override */
office.localstore.DocumentCreationCapability.prototype.isOperationSupported =
    function(operation) {
  return operation.getType() ==
      office.localstore.Operation.Type.UPDATE_APPLICATION_METADATA;
};


/** @override */
office.localstore.DocumentCreationCapability.prototype.
    createOperationsForRecordInternal = function(
    record, opt_nullableProperties) {
  var metadataRecord =
      /** @type {!office.localstore.ApplicationMetadata} */ (record);
  var key = /** @type {string} */ (this.getKeyForRecord(metadataRecord));
  return [
    new office.localstore.UpdateApplicationMetadataOperation(
        key, metadataRecord,
        metadataRecord.hasNewInitialCommands() ?
            metadataRecord.getInitialCommands().concat() : null)
  ];
};


/**
 * @param {string} documentType
 * @return {!office.localstore.DocumentAdapter} The document adapter for the
 *    specified document type.
 * @protected
 */
office.localstore.DocumentCreationCapability.prototype.getAdapterForType =
    function(documentType) {
  var documentAdapter = this.documentAdapters_[documentType];
  if (!documentAdapter) {
    throw Error('No adapter found for this type: ' + documentType);
  }
  return documentAdapter;
};
