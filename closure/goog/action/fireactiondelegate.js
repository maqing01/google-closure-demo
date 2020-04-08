

/**
 * @fileoverview The interface for delegating fireAction calls in order to
 * process and pass extra data there.

 */

goog.provide('apps.action.FireActionDelegate');

goog.require('apps.action.Action');
goog.require('goog.disposable.IDisposable');



/**
 * An interface that processes the firing of an action in lieu of the control
 * binder.
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
apps.action.FireActionDelegate = function() {};


/**
 * Processes action, control, and diagnostics data to determine whether the
 * action should be fired and with what information.
 * @param {!apps.action.Action} action The action to fire.
 * @param {*} actionData Additional data to pass when firing the action.
 * @param {!goog.ui.Control} control The control that the action is bound on.
 * @param {!Object=} opt_diagnosticsData Diagnostics data that is used when
 *     firing the action.
 */
apps.action.FireActionDelegate.prototype.processAndFireAction =
    goog.abstractMethod;
