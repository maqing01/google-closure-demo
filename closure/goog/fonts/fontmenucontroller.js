goog.provide('office.fonts.FontMenuController');

goog.require('office.Action');
goog.require('office.fonts.MenuFontProvider');
goog.require('office.fonts.fontMenuItem');
goog.require('office.fonts.fontSelectMenu');
goog.require('goog.Disposable');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.Container');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuItem');



/**
 * A class that manages the creation of the font menu.
 * @param {!goog.dom.DomHelper} domHelper DOM helper.
 * @param {!goog.ui.Select} dropdownControl The dropdown menu to manage.
 * @param {!apps.action.ControlBinder} controlBinder The control binder.
 * @param {!office.fonts.MenuFontProvider} menuFontProvider The menu font
 *     provider.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.fonts.FontMenuController = function(domHelper, dropdownControl,
    controlBinder, menuFontProvider) {
  goog.base(this);

  /**
   * The dropdown menu to populate and manage.
   * @type {!goog.ui.Select}
   * @private
   */
  this.dropdownControl_ = dropdownControl;
  this.dropdownControl_.setScrollOnOverflow(true /* scrollOnOverflow */);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.domHelper_ = domHelper;

  /**
   * The control binder.
   * @type {!apps.action.ControlBinder}
   * @private
   */
  this.controlBinder_ = controlBinder;

  /**
   * The menu font provider.
   * @type {!office.fonts.MenuFontProvider}
   * @private
   */
  this.menuFontProvider_ = menuFontProvider;

  /**
   * The event handler.
   * @type {!goog.events.EventHandler.<!office.fonts.FontMenuController>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(this.dropdownControl_,
          goog.ui.Component.EventType.CLOSE, this.handleDropdownClose_).
      listen(this.menuFontProvider_,
          office.fonts.MenuFontProvider.EventType.CHANGE,
          this.refreshFontMenu_).
      listen(this.dropdownControl_,
          goog.ui.Component.EventType.OPEN, this.handleDropdownOpen_).
      listen(this.dropdownControl_,
          goog.ui.Component.EventType.HIGHLIGHT, this.handleHighlight_).
      listen(this.dropdownControl_,
          goog.ui.Container.EventType.AFTER_SHOW, this.handleAfterShow_);
  this.refreshFontMenu_();
};
goog.inherits(office.fonts.FontMenuController, goog.Disposable);


/**
 * The padding between the font menu and bottom of the page.
 * @type {number}
 * @private
 */
office.fonts.FontMenuController.FONT_MENU_PADDING_ = 40;


/**
 * The minimum height of the middle section in the font menu.
 * @type {number}
 * @private
 */
office.fonts.FontMenuController.MIN_AVAILABLE_FONT_HEIGHT_ = 80;


/**
 * The value of the add more item menu item.
 * @type {string}
 * @private
 */
office.fonts.FontMenuController.ADD_MORE_ITEM_VALUE_ = 'addMoreItem';


/**
 * Whether font menu should be redrawn upon the drop down menu close event.
 * When the font dropdown menu is open, setFonts does not immediately redraw the
 * font menu. Instead, it sets redrawOnClose_ to true and defers the call to the
 * time until after the dropdown menu is closed.
 * @type {boolean}
 * @private
 */
office.fonts.FontMenuController.prototype.redrawOnClose_ = false;


/**
 * The element corresponding to the middle section of the font menu drop down.
 * @type {Element}
 * @private
 */
office.fonts.FontMenuController.prototype.menuSectionEl_ = null;


/**
 * Whether the middle section of the font menu is scrollable.
 * set to auto to enable scrolling. Used to prevent unnecessary DOM access.
 * @type {boolean}
 * @private
 */
office.fonts.FontMenuController.prototype.isMenuScrollable_ = false;


/**
 * Refreshes the font menu. If the menu is open marks the font menu for
 * refresh on close.
 * @private
 */
office.fonts.FontMenuController.prototype.refreshFontMenu_ = function() {
  if (this.dropdownControl_.isOpen()) {
    this.redrawOnClose_ = true;
  } else {
    this.recreateFontMenu_();
  }
};


/**
 * Creates the font menu through decoration using the list of available and
 * recently added fonts.
 * @return {!goog.ui.Menu} The created menu.
 * @private
 */
office.fonts.FontMenuController.prototype.createMenu_ = function() {
  var availableFonts = this.menuFontProvider_.getMenuFonts();
  var includeAddMoreItem = this.menuFontProvider_.getIncludeAddMoreItem();

  var recentMenuItems = [];

  var newlyAddedUserFontsMap = {};

  var newlyAddedUserFonts = this.menuFontProvider_.getNewlyAddedUserFonts();
  for (var i = 0; i < newlyAddedUserFonts.length; i++) {
    newlyAddedUserFontsMap[newlyAddedUserFonts[i]] = true;
  }

  var allMenuItems = [];
  for (var i = 0; i < availableFonts.length; i++) {
    var font = availableFonts[i];
    allMenuItems.push({
      family: font.getMenuFont(),
      displayName: font.getDisplayName(),
      highlight: newlyAddedUserFontsMap[font.getAppFont()]
    });
  }

  var menuElement = /** @type {!Element} */ (
      this.domHelper_.htmlToDocumentFragment(office.fonts.fontSelectMenu({
        recentMenuItems: recentMenuItems,
        allMenuItems: allMenuItems,
        includeAddMore: includeAddMoreItem
      })));

  var menu = new goog.ui.Menu(this.domHelper_);
  menu.decorate(menuElement);
  // Attach the created menu to the DOM. Otherwise, it will be an orphan element
  // and won't be rendered properly.
  this.domHelper_.appendChild(
      this.domHelper_.getDocument().body, menu.getElement());

  // Create a collection of fonts to mirror the order generated in the soy file.
  //var allFontItems = recentFonts.concat(availableFonts);
  var allFontItems = availableFonts;
  // Set the values of font menu item to ensure that the font dropdown menu
  // chooses the correct font for each menu item. The values rendered in the soy
  // don't necessarily align with the internal font names(display name and
  // family is not necessarily the same for all fonts).
  var fontIndex = 0;
  var fontItemCount = menu.getChildCount();
  for (var i = 0; i < fontItemCount; i++) {
    var menuItem = menu.getChildAt(i);
    // The addMore menu Item should not be processed in this loop. Therefore, we
    // should break out of the loop right after processing allFontItems.
    if (fontIndex >= allFontItems.length) {
      break;
    }
    if (menuItem instanceof goog.ui.MenuItem) {
      menuItem.setCheckable(true);
      menuItem.setValue(/** @type {!office.fonts.FontMenuInfo} */
          (allFontItems[fontIndex]).getAppFont());
      fontIndex++;
    }
  }

  if (includeAddMoreItem) {
    var addMoreItem = menu.getChildAt(menu.getChildCount() - 1);
    addMoreItem.setValue(office.fonts.FontMenuController.ADD_MORE_ITEM_VALUE_);
    this.eventHandler_.listen(addMoreItem, goog.ui.Component.EventType.ACTION,
        this.handleAddMoreFontsAction_);

    this.controlBinder_.bindControl(
        /** @type {!goog.ui.Control} */ (addMoreItem),
        office.Action.EDIT_FONT_FAMILY);
  } else {
  }

  return menu;
};


/**
 * Adds available font family actions to Omnibox.
 * @private
 */
//office.fonts.FontMenuController.prototype.addFontFamiliesToOmnibox_ = function() {
//  var availableFonts = this.menuFontProvider_.getMenuFonts();
//  // Create a map of appFont to {@code office.fonts.FontMenuInfo} since the
//  // omnibox controller expects us to be able to construct the sub match string
//  // and content node from the action data (appFont).
//  var appFontToFontMenuInfoMap = {};
//  var actionDatas = [];
//  for (var i = 0; i < availableFonts.length; i++) {
//    var fontMenuInfo = availableFonts[i];
//    var appFont = fontMenuInfo.getAppFont();
//    actionDatas.push(appFont);
//    appFontToFontMenuInfoMap[appFont] = fontMenuInfo;
//  }
//
//  // Add font family action to the Omnibox.
//  var subMatchStringGenerator = function(appFont) {
//    return appFontToFontMenuInfoMap[appFont].getDisplayName();
//  };
//  var contentGenerator = goog.bind(function(appFont) {
//    var fontMenuInfo = appFontToFontMenuInfoMap[appFont];
//    return this.domHelper_.htmlToDocumentFragment(
//        office.fonts.fontMenuItem({
//          menuItem: {
//            family: fontMenuInfo.getMenuFont(),
//            displayName: fontMenuInfo.getDisplayName()
//          }
//        }));
//  }, this);
//};


/**
 * Handles the closure action from the add more fonts menu item to ensure
 * the FONT_FAMILY action doesn't fire and that the select doesn't get updated
 * with the wrong value.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.fonts.FontMenuController.prototype.handleAddMoreFontsAction_ =
    function(e) {
  e.stopPropagation();
};


/**
 * Creates and displays the font menu.
 * @private
 */
office.fonts.FontMenuController.prototype.recreateFontMenu_ = function() {
  // To preserve the state of the selection model, cache the previously selected
  // font family value so it can be reset after re-populating the select.
  var selectedItem = this.dropdownControl_.getSelectedItem();
  var selectedValue = selectedItem ? selectedItem.getValue() : null;

  var menu = this.createMenu_();

  // goog.ui.Select returns the menu formerly set when you call setMenu.
  var oldMenu = this.dropdownControl_.setMenu(menu);
  if (oldMenu) {
    var lastMenuItem = oldMenu.getChildAt(oldMenu.getChildCount() - 1);
    // Clean up event listeners if the old menu had an "add more item".
    if (lastMenuItem.getValue() ==
        office.fonts.FontMenuController.ADD_MORE_ITEM_VALUE_) {
      this.eventHandler_.unlisten(lastMenuItem,
          goog.ui.Component.EventType.ACTION, this.handleAddMoreFontsAction_);
    }
    this.disposeMenu_(oldMenu);
  }

  if (selectedValue) {
    this.dropdownControl_.setValue(selectedValue);
  } else {
    // Update the menu with the current font even though it was not explicitly
    // selected.  This is necessary in cases where the current font family is
    // updated before the menu item exists  Ex: Collaborator edits or metadata
    // loads.
    var currentFontFamily = office.Action.FONT_FAMILY.getValue();
    if (currentFontFamily) {
      this.dropdownControl_.setValue(currentFontFamily);
    }
  }
  this.menuSectionEl_ = this.domHelper_.getElementByClass(
      goog.getCssName('office-fontmenu-fonts'), menu.getElement());
};


/**
 * Handles the event of closing the font drop down menu. Redraws the font menu
 * when redrawOnClose_ is true.
 * @param {goog.events.Event} e Close event to handle.
 * @private
 */
office.fonts.FontMenuController.prototype.handleDropdownClose_ = function(e) {
  if (this.redrawOnClose_) {
    this.redrawOnClose_ = false;
    this.recreateFontMenu_();
  }
};


/**
 * Handles the event of drop down menu becoming visible. Set the scroll bar to
 * top. This has been added to handle the bug in firefox where scroll top is
 * returned as zero if when the menu is not visible.
 * @param {goog.events.Event} e After show event to handle.
 * @private
 */
office.fonts.FontMenuController.prototype.handleAfterShow_ = function(e) {
  this.menuSectionEl_.scrollTop = 0;
  if (this.menuFontProvider_.getNewlyAddedUserFonts().length > 0) {
    this.menuFontProvider_.clearNewlyAddedUserFonts();
    this.redrawOnClose_ = true;
  }

  // Check the selected font.
  var menu = this.dropdownControl_.getMenu();
  var selected = this.dropdownControl_.getSelectedItem();
  for (var i = 0; i < menu.getChildCount(); i++) {
    var menuItem = menu.getChildAt(i);
    menuItem.setChecked(selected != null &&
        menuItem instanceof goog.ui.MenuItem &&
        selected.getValue() == menuItem.getValue());
  }
};


/**
 * Adjusts max-height of the available font section according to the size of the
 * viewport.
 * @param {goog.events.Event} e The open event to handle.
 * @private
 */
office.fonts.FontMenuController.prototype.handleDropdownOpen_ = function(e) {
  if (this.isMenuScrollable_) {
    this.isMenuScrollable_ = false;
    this.menuSectionEl_.style.overflowY = '';
    this.menuSectionEl_.style.maxHeight = '';
  }

  // Subtract FONT_MENU_PADDING_ to account for padding and borders.
  var availableHeight = this.domHelper_.getViewportSize().height -
      goog.style.getPageOffsetTop(this.dropdownControl_.getElement()) -
      office.fonts.FontMenuController.FONT_MENU_PADDING_;
  var fontMenuHeight = goog.style.getSize(
      this.dropdownControl_.getMenu().getElement()).height;

  // Set the maximum height of the middle section in a way that no scrolling
  // is required for the other two sections unless the new height of the middle
  // section falls below MIN_AVAILABLE_FONT_HEIGHT_.
  if (fontMenuHeight > availableHeight) {
    var middleSectionHeight = availableHeight - (fontMenuHeight -
        ((this.menuFontProvider_.getMenuFonts().length * fontMenuHeight) /
        this.dropdownControl_.getMenu().getChildCount()));
    // MIN_AVAILABLE_FONT_HEIGHT_ is enough height to fit 3 items.
    this.menuSectionEl_.style.maxHeight = Math.max(middleSectionHeight,
        office.fonts.FontMenuController.MIN_AVAILABLE_FONT_HEIGHT_) + 'px';
    if (!this.isMenuScrollable_) {
      this.isMenuScrollable_ = true;
      this.menuSectionEl_.style.overflowY = 'auto';
    }
  }
};


/**
 * Handles the scrolling in between the menu elements in the middle section of
 * the font menu. We are relying on HIGHLIGHT getting called after AFTER_SHOW.
 * @param {goog.events.Event} e The highlight event to handle.
 * @private
 */
office.fonts.FontMenuController.prototype.handleHighlight_ = function(e) {
  // Highlight event is fired when the menu opens as the result of one of the
  // select menu items being highlighted at the opening time.
  if (!this.isMenuScrollable_) {
    // No scroll bar in the middle section.
    return;
  }
  var selectedItem = e.target.getElement();
  if (selectedItem.parentNode == this.menuSectionEl_) {
    goog.style.scrollIntoContainerView(selectedItem, this.menuSectionEl_);
  }
};


/**
 * Handles disposing of the Menu as well as removing it from the DOM.
 * @param {goog.ui.Menu} menu The menu to dispose and remove from DOM.
 * @private
 */
office.fonts.FontMenuController.prototype.disposeMenu_ = function(menu) {
  if (menu) {
    var menuElement = menu.getElement();
    goog.dispose(menu);
    // goog.dispose does not remove decorated elements from the dom
    // so must handle it manually.
    goog.dom.removeNode(menuElement);
  }
};


/** @override */
office.fonts.FontMenuController.prototype.disposeInternal = function() {
  this.disposeMenu_(this.dropdownControl_.getMenu());

  delete this.domHelper_;
  delete this.dropdownControl_;
  delete this.controlBinder_;
  delete this.menuSectionEl_;
  delete this.isMenuScrollable_;

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  goog.dispose(this.menuFontProvider_);
  delete this.menuFontProvider_;

  goog.base(this, 'disposeInternal');
};
