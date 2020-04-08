goog.provide('office.app.ModelRenderObserver');



/**
 * An observer for rendering the model.
 * @interface
 */
office.app.ModelRenderObserver = function() {};


/**
 * Performs necessary functions right before rendering the model.
 */
office.app.ModelRenderObserver.prototype.notifyBeforeRender = goog.abstractMethod;
