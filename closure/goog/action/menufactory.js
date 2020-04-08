goog.provide('apps.action.MenuFactory');



/**
 * Interface for the factory that creates {@code goog.ui.Menu} objects.
 * @interface
 */
apps.action.MenuFactory = function() {};


/**
 * Creates {@code goog.ui.Menu} objects.
 * @return {!goog.ui.Menu} The menu object.
 */
apps.action.MenuFactory.prototype.create = goog.abstractMethod;
