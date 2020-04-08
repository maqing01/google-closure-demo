

/**
 * @fileoverview Manager for Menu Descriptors.

 */

goog.provide('apps.action.DescriptorManager');

goog.require('apps.action.Action');
goog.require('apps.action.MenuItemProvider');
goog.require('apps.action.MenuReference');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.ui.MenuItem');



/**
 * Descriptors are collections of MenuItems or MenuReferences (which are string
 * based pointers to other descriptors).
 *
 * DescriptorManager defines descriptors and will "unroll" references when
 * queried for the items they contain.
 *
 * Usage:
 *
 * After calling
 * dm.defineDescriptor('menu', [menuItem1, menuItem2, 'inline', menuItem3]);
 * dm.defineDescriptor('inline', [menuitem4]);
 *
 * dm.getItemsForDescriptor('menu') will return
 * [menuItem1, menuItem2, menuItem4, menuItem3]
 * @constructor
 * @extends {goog.Disposable}
 */
apps.action.DescriptorManager = function() {
  goog.base(this);
  /**
   * Map of descriptors based on Id.
   * @type {!Object.<string, apps.action.DescriptorManager.Descriptor_>}
   * @private
   */
  this.descriptors_ = {};

  /**
   * List of defined descriptor keys.
   * @type {!Array.<string>}
   * @private
   */
  this.descriptorKeys_ = [];
};
goog.inherits(apps.action.DescriptorManager, goog.Disposable);


/**
 * A clone of apps.action.MenuManager.Item to avoid circular dependencies.
 * @typedef {null|!apps.action.Action|function(goog.ui.Menu)|
 *      !Array.<apps.action.DescriptorManager.Item>|
 *      apps.action.MenuItemProvider|goog.ui.MenuItem}
 */
apps.action.DescriptorManager.Item;


/**
 * Menu descriptor that holds the menu item descriptors and an optional value
 * function.
 * @typedef {{items:!Array.<apps.action.DescriptorManager.Item|
 *     !apps.action.MenuReference>,
 *     valueFn: function(!goog.events.Event):*,
 *     diagnosticsData: Object}}
 * @private
 */
apps.action.DescriptorManager.Descriptor_;


/**
 * Defines a descriptor based on an id.
 * @param {string} id The id of the descriptor being defined.
 * @param {!Array.<apps.action.DescriptorManager.Item|
 *     apps.action.MenuReference>} items Menu items or references associated
 *     with the id.
 * @param {function(!goog.events.Event): *=} opt_valueFn The value function.
 * @param {!Object=} opt_diagnosticsData Object that contains data used for
 *     diagnostics.
 */
apps.action.DescriptorManager.prototype.defineDescriptor = function(id, items,
    opt_valueFn, opt_diagnosticsData) {
  if (this.descriptors_[id]) {
    throw Error('Descriptor ' + id + ' has already been defined');
  }
  // goog.object.add() throws an error if the key is already in use.
  goog.object.add(this.descriptors_, id, {
    items: items,
    valueFn: opt_valueFn || null,
    diagnosticsData: opt_diagnosticsData || null
  });
  this.descriptorKeys_.push(id);
};


/**
 * Returns whether or not the descriptor has been defined.
 * @param {string} id The descriptor id to look up.
 * @return {boolean} whether or not the descriptor has been defined.
 */
apps.action.DescriptorManager.prototype.descriptorExists = function(id) {
  return id in this.descriptors_;
};


/**
 * Gets a list of defined descriptors.
 * @return {!Array.<string>} the value function.
 */
apps.action.DescriptorManager.prototype.getDescriptorIds = function() {
  // Make a clone so the callers wont modify this.
  return goog.array.clone(this.descriptorKeys_);
};


/**
 * Gets DescriptorManager.Items associated with a descriptor id.
 * @param {string} id The descriptor id.
 * @return {!Array.<apps.action.DescriptorManager.Item>} menuItems associated
 *    with the descriptor id.
 */
apps.action.DescriptorManager.prototype.getItemsForDescriptor = function(id) {
  if (!this.descriptorExists(id)) {
     throw Error('Descriptor ' + id + ' is not defined');
  }

  var foundIds = {};
  foundIds[id] = true;

  var expandedItems = [];
  this.expandDescriptorReferences_(this.descriptors_[id].items, expandedItems,
      foundIds);
  return expandedItems;
};


/**
 * Recursive method to get descriptor items and follow references.
 * @param {!Array.<apps.action.DescriptorManager.Item>} source The
 *     list of items to expand from.
 * @param {!Array.<apps.action.DescriptorManager.Item>} destination The list to
 *     append to.
 * @param {!Object.<boolean>} foundIds A list of visited descriptor ids for
 *     cycle detection.
 * @private
 */
apps.action.DescriptorManager.prototype.expandDescriptorReferences_ = function(
    source, destination, foundIds) {
  for (var i = 0; i < source.length; i++) {
    var item = source[i];
    // If it's a menu reference, make a recursive call.
    // Instanceof can't be used here since it doesn't work with string literals.
    if (item instanceof apps.action.MenuReference) {
      var itemRef = item.getId();
      if (this.descriptorExists(itemRef)) {
        if (foundIds[itemRef]) {
          throw Error('Cycle detected for item id: ' + itemRef);
        }
        foundIds[itemRef] = true;
        this.expandDescriptorReferences_(this.descriptors_[itemRef].items,
            destination, foundIds);
      }
      // If the reference doesn't point to anything, don't add anything.
    } else {
      destination.push(item);
    }
  }
};


/**
 * Gets the value function for the descriptor id provided, if there is one.
 * @param {string} id the descriptor id to look up the valueFunction for.
 * @return {function(!goog.events.Event):*} The value function.
 */
apps.action.DescriptorManager.prototype.getValueFnForDescriptor = function(id) {
 if (!this.descriptorExists(id)) {
     throw Error('Descriptor ' + id + ' is not defined');
  }
  return this.descriptors_[id].valueFn || null;
};


/**
 * Gets the diagnostics data object for the descriptor id provided, if there is
 * one.
 * @param {string} id the descriptor id used to look up the diagnostics data.
 * @return {Object} The diagnostics data.
 */
apps.action.DescriptorManager.prototype.getDiagnosticsDataForDescriptor =
    function(id) {
 if (!this.descriptorExists(id)) {
     throw Error('Descriptor ' + id + ' is not defined');
  }
  return this.descriptors_[id].diagnosticsData || null;
};


/**
 * Disposes providers and goog.ui.MenuItems inside the given item descriptors
 * array.
 * @param {!Array.<apps.action.DescriptorManager.Item|
 *     !apps.action.MenuReference>} items The menu item descriptors.
 * @private
 */
apps.action.DescriptorManager.prototype.disposeProvidersAndMenuItems_ =
    function(items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    // Only dispose providers and menu items since actions are disposed through
    // the action registry.
    if (item instanceof apps.action.MenuItemProvider ||
        item instanceof goog.ui.MenuItem) {
      goog.dispose(item);
    } else if (goog.isArray(item)) {
      this.disposeProvidersAndMenuItems_(item);
    }
  }
};


/** @override */
apps.action.DescriptorManager.prototype.disposeInternal = function() {
  for (var id in this.descriptors_) {
    this.disposeProvidersAndMenuItems_(this.descriptors_[id].items);
  }
  // Actions specifically should not be disposed since they are managed
  // elsewhere.
  delete this.descriptorKeys_;
  delete this.descriptors_;

  goog.base(this, 'disposeInternal');
};
