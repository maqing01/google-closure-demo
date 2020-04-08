/**
 * @fileoverview Contains the definition of the HtmlPreparer interface.

 */

goog.provide('office.clipboard.HtmlPreparer');



/**
 * An interface for preparing html prior to adding it to the transfer agent.
 * @interface
 */
office.clipboard.HtmlPreparer = function() {};


/**
 * Prepares the given html to be set on the transfer agent without losing
 * content.
 * @param {string} html The html to prepare.
 * @return {string} The prepared html.
 */
office.clipboard.HtmlPreparer.prototype.prepareHtml = goog.abstractMethod;
