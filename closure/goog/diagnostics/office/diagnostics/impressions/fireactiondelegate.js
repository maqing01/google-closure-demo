goog.provide('office.diagnostics.impressions.FireActionDelegate');

goog.require('apps.action.FireActionDelegate'); // @implements
goog.require('office.diagnostics.impressions.DiagnosticsDataBuilder');
goog.require('office.diagnostics.impressions.proto.EntryPoint');
goog.require('goog.Disposable');
goog.require('goog.ui.PopupMenu');
goog.require('goog.ui.Toolbar');



/**
 * Fire action delegate for handling Docs impressions. Determines the correct
 * entry point to use for Docs impressions and fires the action with this entry
 * point.
 * @constructor
 * @struct
 * @implements {apps.action.FireActionDelegate}
 * @extends {goog.Disposable}
 */
office.diagnostics.impressions.FireActionDelegate = function() {
  goog.base(this);
};
goog.inherits(office.diagnostics.impressions.FireActionDelegate, goog.Disposable);
goog.addSingletonGetter(office.diagnostics.impressions.FireActionDelegate);


/** @override */
office.diagnostics.impressions.FireActionDelegate.prototype.processAndFireAction =
    function(action, actionData, control, opt_diagnosticsData) {
  if (!opt_diagnosticsData) {
    action.fireAction(actionData);
  } else {
    var diagnosticsData =
        /** @type {!office.diagnostics.impressions.DiagnosticsData} */ (
            opt_diagnosticsData);
    if (diagnosticsData.getEntryPoint() ==
        office.diagnostics.impressions.proto.EntryPoint.MENUBAR) {
      diagnosticsData = office.diagnostics.impressions.DiagnosticsDataBuilder.
          from(diagnosticsData).
              setEntryPoint(this.findEntryPointForMenubar_(control)).
              build();
    }
    action.fireAction(actionData, diagnosticsData);
  }
};


/**
 * Determines the effective entry point for a component with an initial entry
 * point of menu bar that may actually be used as either a menu or a toolbar, by
 * walking the parent chain and looking for any toolbars.
 * @param {goog.ui.Component} component The component from which to determine
 *     an entry point.
 * @return {!office.diagnostics.impressions.proto.EntryPoint} The entry point for
 *     the control.
 * @private
 */
office.diagnostics.impressions.FireActionDelegate.prototype.
    findEntryPointForMenubar_ = function(component) {
  if (!component) {
    return office.diagnostics.impressions.proto.EntryPoint.MENUBAR;
  }
  if (component instanceof goog.ui.Toolbar) {
    return office.diagnostics.impressions.proto.EntryPoint.TOOLBAR;
  }
  if (component instanceof goog.ui.PopupMenu) {
    return office.diagnostics.impressions.proto.EntryPoint.CONTEXT_MENU;
  }
  return this.findEntryPointForMenubar_(component.getParent());
};
