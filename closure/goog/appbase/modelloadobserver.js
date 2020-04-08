goog.provide('office.app.ModelLoadObserver');



/**
 * @interface
 */
office.app.ModelLoadObserver = function() {};


/**
 */
office.app.ModelLoadObserver.prototype.notifyFirstModelChunkLoaded =
    goog.abstractMethod;


/**
 */
office.app.ModelLoadObserver.prototype.notifyBasicEditable =
    goog.abstractMethod;


/**
 */
office.app.ModelLoadObserver.prototype.notifyEditable = goog.abstractMethod;


/**
 */
office.app.ModelLoadObserver.prototype.notifyModelLoadComplete =
    goog.abstractMethod;


/**
 * @param {number} modelRevision The model revision for the loaded document.
 */
office.app.ModelLoadObserver.prototype.notifyServerModelApplied =
    goog.abstractMethod;
