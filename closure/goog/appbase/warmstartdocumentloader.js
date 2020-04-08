goog.provide('office.app.WarmStartDocumentLoader');

goog.require('office.app.DocumentLoader');



/**
 * @constructor
 * @struct
 * @extends {office.app.DocumentLoader}
 */
office.app.WarmStartDocumentLoader = function() {
  goog.base(this);
};
goog.inherits(office.app.WarmStartDocumentLoader, office.app.DocumentLoader);


/**
 * @param {number} revision The head revision of the document being loaded.
 * @param {?number} timestamp The timestamp of the head revision of the document
 *     being loaded or null if never saved to storage (i.e., a new document).
 */
office.app.WarmStartDocumentLoader.prototype.startLoad = goog.abstractMethod;


/**
 * Loads the model chunks by firing the ModelPartAvailableEvent.
 * @param {!Object} messageObj The model chunk object.
 */
office.app.WarmStartDocumentLoader.prototype.loadModelChunk =
    goog.abstractMethod;


/**
 * Ends the loading sequence by firing the ModelLoadCompleteEvent.
 */
office.app.WarmStartDocumentLoader.prototype.endLoad = goog.abstractMethod;
