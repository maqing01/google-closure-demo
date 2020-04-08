goog.provide('apps.action.MenuManager');
goog.provide('apps.action.MenuManager.Item');

goog.require('apps.action.Action');
goog.require('apps.action.ControlBinder');
goog.require('apps.action.DescriptorManager');
goog.require('apps.action.MenuItemProvider');
goog.require('apps.action.MenuReference');
goog.require('apps.action.Property');
goog.require('apps.ui.MenuItem');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuHeader');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.MenuSeparator');
goog.require('goog.ui.PopupMenu');
goog.require('goog.ui.SubMenu');



/**
 * Utility for simplifying the definition, creation, and management of menus,
 * including popup and context menus.
 *
 * <p>Menus are lazily constructed on first use based on pre-registered
 * descriptors based on actions, and cached for fast access.  The menu manager
 * handles sub-menus seamlessly by treating a placeholder action with the
 * same identifier as another menu as a submenu reference.
 *
 * <p>A simple example of a menu and a submenu:
 * <pre>
 * manager.defineMenu(MenuAction.NEW.getId(),
 *     [Action.NEW_DOCUMENT, Action.NEW_SPREADHSEET]);
 * manager.defineMenu(MenuAction.FILE.getId(),
 *     [MenuAction.NEW, Action.SAVE, Action.RENAME]);
 * var menu = manager.getMenu(MenuAction.FILE.getId());
 * </pre>
 *
 * @param {function(): !apps.action.ControlBinder=} opt_controlBinderFactory The
 *    control binder factory to be used to generate a new control binder for
 *    each menu. Used for binding menu items to their underlying actions.
 * @param {!goog.dom.DomHelper=} opt_domHelper
 * @constructor
 * @extends {goog.Disposable}
 */
apps.action.MenuManager = function(opt_controlBinderFactory, opt_domHelper) {
  goog.Disposable.call(this);

  /**
   * Menu cache.  The cache key is the menu ID.
   * @type {!Object.<string, !goog.ui.Menu>}
   * @private
   */
  this.menus_ = {};

  /**
   * The descriptor manager.
   * @type {!apps.action.DescriptorManager}
   * @private
   */
  this.descriptorManager_ = new apps.action.DescriptorManager();

  /**
   * Control binder factory.
   * @type {?function(): !apps.action.ControlBinder}
   * @private
   */
  this.controlBinderFactory_ = opt_controlBinderFactory || null;

  /**
   * Mapping from menu id to a control binder for that menu.
   * @type {!Object.<string, !apps.action.ControlBinder>}
   * @private
   */
  this.controlBinders_ = {};

  /** @private {!goog.dom.DomHelper} */
  this.domHelper_ = opt_domHelper || goog.dom.getDomHelper();
};
goog.inherits(apps.action.MenuManager, goog.Disposable);


//  Consider giving the functions less freedom; for example,
// returning a list of children to add to the menu.  There are a few
// blockers though, like the need to be able to listen for the menu becoming
// visible, or the fact that Presently needs to turn off keyboard
// accelerators for some menus (like the clipart menu).
//  Remove function(goog.ui.Menu) from the typedef.
/**
 * Model for a single menu item.  One of four options:
 * <ul>
 *   <li>{@code null}: Represents a menu separator.
 *   <li>{@link apps.action.Action}: An action to be represented as a menu item.
 *       If the ID corresponds to a menu ID, then it is a pseudo-action
 *       representing a submenu.
 *   <li>{@code function(goog.ui.Menu)}: A function called to mutate the menu.
 *       Multiple mutators will be called in the order they appear in the list.
 *   <li>{@code Array.<apps.action.MenuManager.Item>}: A nested array of other
 *       items. The entire structure will be flattened.
 * </ul>
 * @typedef {null|!apps.action.Action|function(goog.ui.Menu)|
 *      !Array.<apps.action.MenuManager.Item>|apps.action.MenuItemProvider|
 *      goog.ui.MenuItem|goog.ui.MenuHeader}
 */
apps.action.MenuManager.Item;


/**
 * NOP constant for defineMenu.  Makes it easier to define an item
 * conditionally.
 * @type {!Array.<apps.action.MenuManager.Item>}
 */
apps.action.MenuManager.NO_ITEM = [];


/**
 * Properties to sync for submenus.  The VALUE option is missing in order to
 * use the model internally for the menu's action ID.
 * @type {!Object}
 * @private
 */
apps.action.MenuManager.SUBMENU_PROPERTIES_ = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.ICON,
    apps.action.Property.LABEL,
    apps.action.Property.MNEMONIC,
    apps.action.Property.VISIBLE);


/**
 * Properties to sync for submenus in a Popup menu.  The VALUE option is
 * missing in order to use the model internally for the menu's action ID.
 * @type {!Object}
 * @private
 */
apps.action.MenuManager.POPUP_SUBMENU_PROPERTIES_ = goog.object.createSet(
    apps.action.Property.ENABLED,
    apps.action.Property.ICON,
    apps.action.Property.LABEL,
    apps.action.Property.VISIBLE);


/** @override */
apps.action.MenuManager.prototype.disposeInternal = function() {
  for (var id in this.menus_) {
    this.menus_[id].dispose();
  }
  delete this.menus_;

  this.descriptorManager_.dispose();
  delete this.descriptorManager_;

  for (var id in this.controlBinders_) {
    goog.dispose(this.controlBinders_[id]);
  }
  delete this.controlBinders_;

  goog.base(this, 'disposeInternal');
};


/**
 * Returns an array of keys for the descriptor.
 * @return {!Array.<string>} The descriptor keys.
 */
apps.action.MenuManager.prototype.getDescriptorKeys = function() {
  return this.descriptorManager_.getDescriptorIds();
};


/**
 * Returns an array of actions corresponding to a descriptor key.
 * @param {string} key The descriptor key to get actions for.
 * @return {!Array.<!apps.action.Action>} The actions corresponding to a
 *     descriptor key.
 */
apps.action.MenuManager.prototype.getActionsForKey = function(key) {
  var flattenedItems = goog.array.flatten(
      this.descriptorManager_.getItemsForDescriptor(key));
  return goog.array.filter(flattenedItems, function(item) {
    return item instanceof apps.action.Action;
  });
};


/**
 * Inlines an entire other menu.
 * @param {string} id Identifier of the menu to inline.
 * @return {!apps.action.MenuReference} The menu reference.
 */
apps.action.MenuManager.prototype.inlineMenu = function(id) {
  return new apps.action.MenuReference(id);
};


/**
 * Defines a menu with the given ID and structure.
 *
 * @param {string} id The menu ID.
 * @param {!Array.<apps.action.DescriptorManager.Item|
 *     apps.action.MenuReference>} items Menu items or references associated
 *     with the id.
 * @param {function(!goog.events.Event): *=} opt_valueFn The value function.
 * @param {!Object=} opt_diagnosticsData Object containing data used for
 *     diagnostics.
 */
apps.action.MenuManager.prototype.defineMenu = function(id, items,
    opt_valueFn, opt_diagnosticsData) {
  this.descriptorManager_.defineDescriptor(
      id, items, opt_valueFn, opt_diagnosticsData);
};


/**
 * Returns the menu with the given ID, lazily creating it on first use.
 * @param {string} id ID of the menu to return.
 * @param {boolean=} opt_repopulate Whether to repopulate the menu on get.
 * @return {!goog.ui.Menu} Menu with the given ID.
 * @throws {Error} If no menu with the given ID has been defined.
 */
apps.action.MenuManager.prototype.getMenu = function(id, opt_repopulate) {
  return this.getMenuInternal_(id, false, undefined /* opt_menuFactory */,
      opt_repopulate);
};


/**
 * @param {string} id ID of the menu to check.
 * @return {boolean} Whether the menu is defined.
 */
apps.action.MenuManager.prototype.isMenuDefined = function(id) {
  return this.descriptorManager_.descriptorExists(id);
};


/**
 * Returns the goog.ui.PopupMenu with the given ID, lazily creating it on
 * first use.
 * @param {string} id ID of the menu to return.
 * @param {boolean=} opt_repopulate Whether to repopulate the menu on get.
 * @return {!goog.ui.Menu} Menu with the given ID.
 * @throws {Error} If no menu with the given ID has been defined.
 */
apps.action.MenuManager.prototype.getPopupMenu = function(id, opt_repopulate) {
  return this.getMenuInternal_(id, true, undefined /* opt_menuFactory */,
      opt_repopulate);
};


/**
 * Returns the menu with the given ID, lazily creating it on first use.
 * @param {string} id ID of the menu to return.
 * @param {boolean} popupMenu Whether to create a goog.ui.PopupMenu
 *     instead of a plain goog.ui.Menu.
 * @param {apps.action.MenuFactory=} opt_menuFactory The menu factory.
 * @param {boolean=} opt_repopulate Whether to repopulate the menu on get.
 * @return {!goog.ui.Menu} Menu with the given ID.
 * @throws {Error} If no menu with the given ID has been defined.
 * @private
 */
apps.action.MenuManager.prototype.getMenuInternal_ = function(
    id, popupMenu, opt_menuFactory, opt_repopulate) {
  var descriptorItems = this.descriptorManager_.getItemsForDescriptor(id);
  if (!descriptorItems) {
    goog.asserts.fail('MenuManager: Unknown menu: ' + id);
  }
  var diagnosticsData =
      this.descriptorManager_.getDiagnosticsDataForDescriptor(id);
  var valueFn = this.descriptorManager_.getValueFnForDescriptor(id);

  // Cache a menu by both the menu ID, and the type.
  var cacheKey = id + (popupMenu ? 0 : 1);
  // No explicit menu specified.  Look for a cached menu or create one.
  var menu = this.menus_[cacheKey];
  var valueOrUndefined = function(obj) {
    return obj ? obj : undefined;
  };
  if (menu) {
    if (opt_repopulate) {
      // Dispose of the menu's control binder to remove the listeners for all
      // previous control bindings before removing all the child menu items.
      goog.dispose(this.controlBinders_[menu.getId()]);
      delete this.controlBinders_[menu.getId()];
      menu.removeChildren(true /* opt_unrender */);
      this.populateMenu(menu, descriptorItems,
          valueOrUndefined(diagnosticsData), valueOrUndefined(valueFn));
    }
  } else {
    menu = this.menus_[cacheKey] = opt_menuFactory ?
        opt_menuFactory.create() :
        (popupMenu ?
            new goog.ui.PopupMenu(this.domHelper_) :
            new goog.ui.Menu(this.domHelper_));
    this.populateMenu(menu, descriptorItems,
        valueOrUndefined(diagnosticsData), valueOrUndefined(valueFn));
  }
  return menu;
};


/**
 * Returns the menu with the given ID that has been created by the factory,
 * lazily creating it on first use. For popup menus, use getFactoryPopupMenu
 * instead.
 * @param {string} id ID of the menu to return.
 * @param {!apps.action.MenuFactory} menuFactory The menu factory.
 * @param {boolean=} opt_repopulate Whether to repopulate the menu on get.
 * @return {!goog.ui.Menu} Menu with the given ID.
 * @throws {Error} If no menu with the given ID has been defined.
 */
apps.action.MenuManager.prototype.getFactoryMenu = function(id, menuFactory,
    opt_repopulate) {
  return this.getMenuInternal_(id, false /* popupMenu */, menuFactory,
      opt_repopulate);
};


/**
 * Returns the popupMenu with the given ID that has been created by the factory,
 * lazily creating it on first use.
 * @param {string} id ID of the menu to return.
 * @param {!apps.action.MenuFactory} menuFactory The menu factory.
 * @param {boolean=} opt_repopulate Whether to repopulate the menu on get.
 * @return {!goog.ui.Menu} Menu with the given ID.
 * @throws {Error} If no menu with the given ID has been defined.
 */
apps.action.MenuManager.prototype.getFactoryPopupMenu = function(id,
    menuFactory, opt_repopulate) {
  return this.getMenuInternal_(id, true /* popupMenu */, menuFactory,
      opt_repopulate);
};


/**
 * Returns an array consisting of every argument with all arrays expanded
 * in-place recursively. If the item is an apps.action.MenuItemProvider it calls
 * provide and applies this operation to the returned items recursively.
 * @param {Array.<apps.action.MenuManager.Item>} items Menu item descriptors.
 * @param {!Array.<apps.action.MenuManager.Item>} flattenedItems the list to
 *     append to.
 * @param {string} menuId The id of the menu being populated.
 * @param {!Object=} opt_providerIds A map of provider Uids that have already
 *     been flattened.
 * @return {!Array.<apps.action.MenuManager.Item>} An array containing the
 *     flattened values.
 * @private
 */
apps.action.MenuManager.prototype.flattenMenuItems_ = function(items,
    flattenedItems, menuId, opt_providerIds) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (goog.isArray(item)) {
      this.flattenMenuItems_(item, flattenedItems, menuId, opt_providerIds);
    } else if (item instanceof apps.action.MenuItemProvider) {
      var providerIds = opt_providerIds ? opt_providerIds : {};
      var providerUid = goog.getUid(item);
      if (providerIds[providerUid]) {
        throw new Error(
            'Same provider was included more than once causing a cycle.');
      }
      providerIds[providerUid] = true;
      var controlBinder = this.getControlBinderForMenu_(menuId);
      this.flattenMenuItems_(
          item.provide(controlBinder), flattenedItems, menuId, providerIds);
    } else {
      flattenedItems.push(item);
    }
  }
  return flattenedItems;
};


/**
 * Populates a menu with the specified items.  Items are inserted at the end of
 * the menu, after existing items (if any).
 * @param {!goog.ui.Menu} menu Menu to populate; may already contain some items.
 * @param {Array.<apps.action.MenuManager.Item>} items Menu item descriptors.
 * @param {!Object=} opt_diagnosticsData Object containing data used for
 *     diagnostics.
 * @param {function(!goog.events.Event):*=} opt_menuValueFn The value function
 *     to apply for each menu item.
 * @return {!goog.ui.Menu} The populated menu.
 */
apps.action.MenuManager.prototype.populateMenu = function(
    menu, items, opt_diagnosticsData, opt_menuValueFn) {
  // Only register OPEN listener if the menu has at least one submenu.
  var hasSubMenu = false;
  var hasKeys = false;
  var hasIcon = false;
  var dom = menu.getDomHelper();

  // Flatten all the items.
  var flattenedItems = [];
  this.flattenMenuItems_(items, flattenedItems, menu.getId());

  for (var i = 0, count = flattenedItems.length; i < count; i++) {
    var item = flattenedItems[i];
    if (!item) {
      menu.addChild(new goog.ui.MenuSeparator(dom), true /* opt_render */);
    } else if (goog.isFunction(item)) {
      // A function just for populating the menu. Assume this might have
      // icons or keys.
      hasIcon = true;
      hasKeys = true;
      item(menu);
    } else if (item instanceof goog.ui.MenuItem ||
        item instanceof goog.ui.MenuHeader) {
      hasIcon = hasIcon ||
          item.isSupportedState(goog.ui.Component.State.CHECKED) ||
          item.isSupportedState(goog.ui.Component.State.SELECTED);
      menu.addChild(item, /* opt_render */ true);
    } else if (item instanceof apps.action.Action) {
      var action = /** @type {apps.action.Action} */ (item);
      hasKeys = hasKeys || !!action.getProperty(apps.action.Property.KEYS);
      hasIcon = hasIcon || !!action.getProperty(apps.action.Property.ICON) ||
          goog.isBoolean(action.getProperty(apps.action.Property.SELECTED));

      goog.asserts.assert(item instanceof apps.action.Action,
          'Invalid menu item type');

      var control;
      var controlBinder = this.getControlBinderForMenu_(menu.getId());
      if (this.descriptorManager_.descriptorExists(action.getId())) {
        // Item is a submenu.  Use the menu ID, determined by the action ID,
        // as the submenu's model.
        var submenu = new goog.ui.SubMenu(null, action.getId(), dom);
        submenu.setPositionAdjustable(true);
        control = submenu;
        hasSubMenu = true;
        //  Remove this hack when closure properly hides submenus
        goog.style.setElementShown(submenu.getMenu().getElement(), false);
        var actionValueFn = this.descriptorManager_.getValueFnForDescriptor(
            action.getId());
        goog.asserts.assert(!opt_menuValueFn || !actionValueFn,
            'You cannot set both a menu value function and an action value' +
                ' function. The behavior is undefined.');
        var valueFn = opt_menuValueFn || actionValueFn;

        controlBinder.bindControl(control, action,
            menu instanceof goog.ui.PopupMenu ?
                apps.action.MenuManager.POPUP_SUBMENU_PROPERTIES_ :
                apps.action.MenuManager.SUBMENU_PROPERTIES_,
            valueFn,
            opt_diagnosticsData);
      } else {
        // Item is a single menu option.
        control = new apps.action.MenuManager.MenuItem_(dom, action);
        controlBinder.bindControl(control, action,
            menu instanceof goog.ui.PopupMenu ?
                apps.action.ControlBinder.POPUP_MENU_ITEM_PROPERTIES :
                apps.action.ControlBinder.MENU_ITEM_PROPERTIES,
            opt_menuValueFn,
            opt_diagnosticsData);
      }
      menu.addChild(control, /* opt_render */ true);
    } else {
      throw new Error('Provider was not flattened before populating the menu');
    }
  }

  if (!menu.isInDocument()) {
    // Explicitly set visibility to false (without triggering any events) since
    // otherwise the menu would become briefly visible via the call to render(),
    // which in IE can result in a visible flicker.
    menu.setVisible(false, true);
    //  Investigate whether we even need to call render() at
    // all here, or whether createDom() would do instead.
    menu.render();
  }

  if (hasSubMenu) {
    // Install listener so the submenu's menu can be lazily attached on
    // first use.  goog.events.listen is safe since EventTargets clean up
    // listeners attached.
    goog.events.listen(menu, goog.ui.Component.EventType.OPEN,
        this.handleMenuOpen_, false, this);
  }

  goog.dom.classes.enable(
      menu.getElement(), goog.getCssName('goog-menu-noaccel'), !hasKeys);
  goog.dom.classes.enable(
      menu.getElement(), goog.getCssName('goog-menu-noicon'), !hasIcon);

  this.autoCollapseSeparators_(menu);
  return menu;
};


/**
 * Gets the control binder for the given menu. Creates one if one doesn't exist.
 * @param {string} menuId The menu id.
 * @return {!apps.action.ControlBinder} The control binder.
 * @private
 */
apps.action.MenuManager.prototype.getControlBinderForMenu_ = function(menuId) {
  var controlBinder = this.controlBinders_[menuId];
  if (!controlBinder) {
    controlBinder = this.controlBinders_[menuId] =
        this.controlBinderFactory_ ?
        this.controlBinderFactory_() : new apps.action.ControlBinder();
  }
  return controlBinder;
};



/**
 * Action-based menu item subclass.
 * @param {goog.dom.DomHelper} dom Optional DOM helper used for
 *     document interactions.
 * @param {apps.action.Action} action The action bound to this menu item.
 * @extends {apps.ui.MenuItem}
 * @constructor
 * @private
 */
apps.action.MenuManager.MenuItem_ = function(dom, action) {
  apps.ui.MenuItem.call(this, null, null, dom);

  /**
   * The action bound to this menu item.
   * @type {apps.action.Action}
   * @private
   */
  this.action_ = action;
};
goog.inherits(apps.action.MenuManager.MenuItem_, apps.ui.MenuItem);


/** @override */
apps.action.MenuManager.MenuItem_.prototype.performActionInternal =
    function(e) {
  // Prevent unchecking if the action is part of a selectable group.
  if (this.isAutoState(goog.ui.Component.State.CHECKED) && this.isChecked() &&
      this.action_.getProperty(apps.action.Property.RADIO)) {
    return false;
  }
  return apps.action.MenuManager.MenuItem_.superClass_.
      performActionInternal.call(this, e);
};


/** @override */
apps.action.MenuManager.MenuItem_.prototype.setCheckable = function(checkable) {
  // Don't allow check marks for menu items that have an icon.
  goog.base(this, 'setCheckable', checkable &&
      !this.action_.getProperty(apps.action.Property.ICON));
};


/** @override */
apps.action.MenuManager.MenuItem_.prototype.createDom = function() {
  goog.base(this, 'createDom');

  var ariaLabel = this.action_ ?
      /** @type {string} */ (this.action_.getProperty(
          apps.action.Property.ARIA_LABEL)) : '';
  if (ariaLabel) {
    var element = this.getElement();
    element.setAttribute('aria-label', ariaLabel);
  }
};


/**
 * Handles {@link goog.ui.Component.EventType.OPEN} events dispatched by
 * controls that serve as popup menu anchors, such as menu buttons and submenus.
 * If the control doesn't currently have a popup menu attached, locate the menu,
 * and attach it to the control.  For rendered items, the control's model is
 * expected to contain the identifier of the menu to attach; for decorated
 * controls, the element's DOM ID is expected to be a valid menu ID,
 * prefixed with an underscore.
 *
 * Note that in the context of this method, {@code this} refers to the menu
 * manager object, {@code e.target} refers to the control that anchors the
 * popup menu, and {@code e.currentTarget} refers to the container listening
 * for the event.
 *
 * @param {goog.events.Event} e Open event to handle.
 * @private
 */
apps.action.MenuManager.prototype.handleMenuOpen_ = function(e) {
  // Make sure the OPEN event was dispatched by one of the container's own
  // children (not grandchildren, great-grandchildren, etc.).
  var control = e.target;
  if (control.getParent() == e.currentTarget) {
    var menu = control.getMenu();
    if (!menu || menu.getChildCount() == 0) {
      // Nonexistent or empty popup menu; create it.  First see if the control's
      // model contains a menu ID, otherwise fall back to the DOM ID.
      var id = control.getModel() || control.getElement().id;
      // Attach the menu to the control.
      control.setMenu(this.getMenu(id));
    }
  }
};


/**
 * Adds an event listener that will adjust automatically adjust separator
 * visibility to ensure that there are never two consecutive separators.
 *
 * @param {!goog.ui.Menu} menu Menu to update.
 * @private
 */
apps.action.MenuManager.prototype.autoCollapseSeparators_ = function(menu) {
  //  Need to enhance this so that separator collapsing is performed
  // when menu items are added or removed from the menu.
  goog.events.listen(menu,
      [goog.ui.Component.EventType.SHOW, goog.ui.Component.EventType.HIDE],
      apps.action.MenuManager.handleMenuShowHide_);
  apps.action.MenuManager.collapseSeparatorsNow_(menu);
};


/**
 * Calls {@code collapseSeparatorsNow_} whenever the visibility of a
 * non-separator menu item changes.
 *
 * @param {!goog.events.Event} e SHOW or HIDE event.
 * @private
 */
apps.action.MenuManager.handleMenuShowHide_ = function(e) {
  var target = e.target;
  // currentTarget is the menu.
  if (target.getParent() == e.currentTarget &&
      target instanceof goog.ui.MenuItem &&
      !(target instanceof goog.ui.MenuSeparator)) {
    apps.action.MenuManager.collapseSeparatorsNow_(
        /** @type {!goog.ui.Menu} */ (e.currentTarget), target);
  }
};


/**
 * Collapses menu item separators. Loops over all children, showing all
 * separators unless it would result in consecutive separators.
 *
 * @param {!goog.ui.Menu} menu Menu to update.
 * @param {!goog.ui.MenuItem=} opt_target Menu item that triggered the menu
 *     update, if any.
 * @private
 */
apps.action.MenuManager.collapseSeparatorsNow_ = function(menu, opt_target) {
  var lastSeparator = null;
  var lastVisibleWasSeparator = true;
  menu.forEachChild(function(child) {
    var separator = child instanceof goog.ui.MenuSeparator;
    if (separator) {
      child.setVisible(!lastVisibleWasSeparator);
    }
    // The events fire before the state is updated so we need to use the
    // opposite of the target's current state.
    if (child.isVisible() != (child == opt_target)) {
      lastVisibleWasSeparator = separator;
      if (separator) {
        lastSeparator = child;
      }
    }
  });
  if (lastVisibleWasSeparator && lastSeparator) {
    lastSeparator.setVisible(false);
  }
};
