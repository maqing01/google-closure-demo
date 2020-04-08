goog.provide('office.html.DomProcessor');


/**
 * An object which processes a DOM node and performs browser actions (such as
 * simulating events or modifying the selection) based on its contents.
 * @interface
 */
office.html.DomProcessor = function() {};


/**
 * @param {(!Element|!Document)} node The DOM element or document to process.
 * @param {goog.dom.DomHelper=} opt_domHelper
 */
office.html.DomProcessor.prototype.process = goog.abstractMethod;
