

/**
 * @fileoverview Clip transfer agent.
 *

 */
goog.provide('office.clipboard.BrowserTransferAgent');

goog.require('office.clipboard.TransferAgent');



/**
 * Transfer agent for transferring clip data between a MIMEClipboard and the
 * actual clip storage (e.g. the native clipboard). This browser-specific
 * interface wraps browser callbacks on copy/paste so they occur in the
 * TransferAgent scope, and so the TransferAgent can interact with the
 * browser event directly.
 * @interface
 * @extends {office.clipboard.TransferAgent}
 */
office.clipboard.BrowserTransferAgent = function() {};
goog.mixin(office.clipboard.BrowserTransferAgent.prototype,
    office.clipboard.TransferAgent.prototype);


/**
 * Execute event handler within the scope of this transfer agent.
 * @param {function(!goog.events.BrowserEvent)} eventHandler The event handler
 *     to execute.
 * @param {!goog.events.BrowserEvent} e The browser cut/copy/paste event.
 */
office.clipboard.BrowserTransferAgent.prototype.executeBrowserEventHandler =
    goog.abstractMethod;
