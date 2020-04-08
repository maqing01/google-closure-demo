

/**
 * @fileoverview Interface for provider of app-specific "impression context" --
 * e.g. things like if the user action took place within a table, within a
 * paragragh, etc. -- to be implemented by each editor.
 *

 */

goog.provide('office.diagnostics.impressions.ImpressionContextProvider');



/**
 * An interface for providing information regarding activated impression
 * contexts.
 * @interface
 */
office.diagnostics.impressions.ImpressionContextProvider = function() {};


/**
 * Returns an array of app-specific, activated impression contexts to be put
 * into the ImpressionDetails proto.
 * @return {!Array.<!office.diagnostics.impressions.proto.
 *     impressiondetails.ImpressionContext>} An array of features that are
 *     active in the editor.
 */
office.diagnostics.impressions.ImpressionContextProvider.prototype.
    getImpressionContexts = goog.abstractMethod;
