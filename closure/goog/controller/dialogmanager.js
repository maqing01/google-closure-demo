goog.provide('office.controller.DialogManager');

goog.require('office.chrome.Dialog');
goog.require('office.chrome.FloatingWidgetVisibilityManager');
goog.require('office.controller.FocusManager');
goog.require('office.controller.FocusState');
goog.require('office.controller.ServiceId');
goog.require('office.ui.GenericDialog');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.functions');
goog.require('goog.ui.Dialog');
goog.require('goog.ui.PopupBase');



/**
 * @param {!office.controller.FocusManager} focusManager
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.controller.DialogManager = function(focusManager) {
  goog.base(this);

  /**
   * @type {!office.controller.FocusManager}
   * @private
   */
  this.focusManager_ = focusManager;
  office.chrome.Dialog.setFocusHandler(
      goog.functions.lock(goog.bind(this.maybeChangeFocusAfterHide_, this)));

  /**
   * @private {!Array.<!goog.ui.Dialog|!office.ui.GenericDialog>}
   */
  this.openModalDialogs_ = [];

  /**
   * @type {!goog.events.EventHandler.<!office.controller.DialogManager>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(office.controller.DialogManager, goog.Disposable);


/**
 * @type {string}
 * @private
 */
office.controller.DialogManager.STICKY_REASON_ = 'dialog';


/**
 * @return {boolean} Whether a modal dialog is currently open.
 */
office.controller.DialogManager.prototype.isModalDialogOpen = function() {
  //  Refactor dialog manager and focus manager such that it
  // is not possible to switch to the EDITOR state while a modal dialog is open.
  return !!this.openModalDialogs_.length;
};


/**
 * Registers the given dialog. Adds listeners for the show/hide events to
 * change the focus state.
 * @param {!goog.ui.Dialog|!office.ui.GenericDialog} dialog The dialog to show.
 */
office.controller.DialogManager.prototype.registerDialog = function(dialog) {
  // Register non-modal dialogs with the floating widget visibility manager if
  // they should be displayed exclusively.
  if (!dialog.getModal()) {
    if (!(dialog instanceof office.ui.GenericDialog) || dialog.getExclusive()) {
      office.chrome.FloatingWidgetVisibilityManager.getInstance().
          registerDialog(dialog);
    }
  }
  if (dialog.isVisible()) {
    if (dialog.getModal()) {
      this.openModalDialogs_.push(dialog);
    }
    this.focusChrome_(dialog);
  }

  this.eventHandler_.
      listen(dialog, goog.ui.Dialog.EventType.AFTER_HIDE,
          goog.partial(this.handleDialogAfterHide_, dialog)).
      listen(dialog, goog.ui.PopupBase.EventType.BEFORE_SHOW,
          goog.partial(this.handleDialogBeforeShow_, dialog));
};


/**
 * Handles an AFTER_HIDE event. Switches focus back to the editor if no modal
 * dialogs are open.
 * @param {!goog.ui.Dialog|!office.ui.GenericDialog} dialog The dialog.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.controller.DialogManager.prototype.handleDialogAfterHide_ = function(
    dialog, e) {
  // Only change the focus state if the target is the dialog itself, otherwise
  // events propagating from children of the dialog can trigger this behavior.
  if (e.target != dialog) {
    return;
  }
  if (dialog.getModal()) {
    // Remove the last occurrence of the closed dialog from the stack of open
    // modal dialogs.
    goog.asserts.assert(goog.array.remove(this.openModalDialogs_, dialog),
        'Should have removed modal dialog. A dialog was likely visible before' +
        ' it was registered.');
  }
  this.maybeChangeFocusAfterHide_(dialog);
};


/**
 * Maybe changes focus after a dialog is hidden.
 * @param {!goog.ui.Dialog|!office.ui.GenericDialog=} opt_dialog The dialog being
 *     hidden.
 * @private
 */
office.controller.DialogManager.prototype.maybeChangeFocusAfterHide_ =
    function(opt_dialog) {
  // Exclusive non-modal dialogs are registered with the floating widget
  // visibility manager so it might be the case that this dialog is being closed
  // because another floating widget has been opened.
  var widgetManager = office.chrome.FloatingWidgetVisibilityManager.getInstance();
  var switchingFloatingWidgets = opt_dialog &&
      widgetManager.isRegisteredWidget(opt_dialog) &&
      widgetManager.isAnyWidgetVisible();

  if (this.openModalDialogs_.length) {
    goog.array.peek(this.openModalDialogs_).focus();
  }

  // Only return focus to the editor if all modal dialogs are now closed and
  // we're not switching to another floating widget.
  if (!this.isModalDialogOpen() && !switchingFloatingWidgets) {
    this.focusManager_.clearReason(office.controller.DialogManager.STICKY_REASON_,
        office.controller.FocusState.EDITOR);
  }
};


/**
 * Handles a BEFORE_SHOW event.
 * @param {!goog.ui.Dialog|!office.ui.GenericDialog} dialog The dialog.
 * @param {!goog.events.Event} e The event.
 * @private
 */
office.controller.DialogManager.prototype.handleDialogBeforeShow_ = function(
    dialog, e) {
  if (dialog.getModal()) {
    this.openModalDialogs_.push(dialog);
  }
  // Only change the focus state if the target is the dialog itself, otherwise
  // events propagating from children of the dialog can trigger this behavior.
  if (e.target != dialog) {
    return;
  }
  this.focusChrome_(dialog);
};


/**
 * Switches the focus state to CHROME, indicating that the focus is in the
 * window but not in the editor. Used when a dialog is opened.
 * @param {!goog.ui.Dialog|!office.ui.GenericDialog} dialog The dialog.
 * @private
 */
office.controller.DialogManager.prototype.focusChrome_ = function(dialog) {
  this.focusManager_.setState(office.controller.FocusState.CHROME,
      dialog.getModal() ? office.controller.DialogManager.STICKY_REASON_ :
          undefined);
};


/** @override */
office.controller.DialogManager.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  delete this.focusManager_;
};


/**
 * Creates and registers a new DialogManager in the app context. Assumes that
 * the focus manager has already been registered.
 * @param {!fava.AppContext} appContext The app context.
 * @return {!office.controller.DialogManager} The dialog manager.
 */
office.controller.DialogManager.register = function(appContext) {
  var dialogManager = new office.controller.DialogManager(
      office.controller.FocusManager.get(appContext));
  appContext.registerService(office.controller.ServiceId.DIALOG_MANAGER,
      dialogManager);
  return dialogManager;
};


/**
 * @param {!fava.AppContext} appContext The app context.
 * @return {!office.controller.DialogManager} The dialog manager.
 */
office.controller.DialogManager.get = function(appContext) {
  return /** @type {!office.controller.DialogManager} */ (
      appContext.get(office.controller.ServiceId.DIALOG_MANAGER));
};
