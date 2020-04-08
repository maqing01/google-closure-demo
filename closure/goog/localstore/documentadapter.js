goog.provide('office.localstore.DocumentAdapter');

goog.require('goog.events.EventTarget');



/**
 * Does storage and retrieval of information specific to a particular type of
 * documents.
 * @param {office.localstore.Document.Type} documentType The document type this
 *     adapter adapts for.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.DocumentAdapter = function(documentType) {
  goog.base(this);

  /**
   * @type {office.localstore.Document.Type}
   * @private
   */
  this.documentType_ = documentType;
};
goog.inherits(office.localstore.DocumentAdapter, goog.events.EventTarget);


/**
 * Creates a command persistence object from a command object.
 * @param {!office.commands.Command} command The command to convert.
 * @return {!Object} The persistence object for this command.
 */
office.localstore.DocumentAdapter.prototype.createCommandObject =
    goog.abstractMethod;


/**
 * Creates a new document object of the type supported by this adapter.
 * @param {string} id The document's id.
 * @return {!office.localstore.Document} The new document.
 */
office.localstore.DocumentAdapter.prototype.createDocument = goog.abstractMethod;


/**
 * Reads a document of the type we adapt for from the database.
 * @param {!office.localstore.Document} doc The unadapted document.
 * @return {!office.localstore.Document} The document from the database.
 */
office.localstore.DocumentAdapter.prototype.readDocument = goog.abstractMethod;


/**
 * Creates all operations necessary to write the non-record-property portions
 * of a document of the type this adapter accepts to storage.
 * @param {!office.localstore.Document} document
 * @return {!Array.<!office.localstore.Operation>} The operations to perform to
 *     write the document.
 */
office.localstore.DocumentAdapter.prototype.createOperations =
    goog.abstractMethod;


/**
 * @return {office.localstore.Document.Type} The document type this adapter
 *     adapts for.
 */
office.localstore.DocumentAdapter.prototype.getDocumentType = function() {
  return this.documentType_;
};
