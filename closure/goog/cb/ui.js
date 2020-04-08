

/**
 * @fileoverview The Docs Cloudboard UI implementation.
 *

 */

goog.provide('office.clipboard.Ui');
goog.provide('office.clipboard.Ui.ActionProperty');

goog.require('apps.action.Property');
goog.require('apps.action.Topic');
goog.require('cloudboard.Command');
goog.require('cloudboard.CommonType');
goog.require('cloudboard.ErrorEvent');
goog.require('cloudboard.EventType');
goog.require('cloudboard.Icon');
goog.require('cloudboard.Image');
goog.require('cloudboard.Item');
goog.require('office.Action');
goog.require('office.action');
goog.require('office.chrome.helpCenter');
goog.require('office.chrome.helpCenter.AnswerId');
goog.require('office.controller.FunctionActionBinding');
goog.require('office.ui.ButterManager');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.async.Delay');
goog.require('goog.dom.classes');
goog.require('goog.events.EventHandler');
goog.require('goog.functions');
goog.require('goog.math.Box');
goog.require('goog.positioning.AnchoredViewportPosition');
goog.require('goog.positioning.Corner');
goog.require('goog.string');
goog.require('goog.ui.Component');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.Popup');
goog.require('goog.ui.SubMenu');
goog.require('controls.ButterBar');
goog.require('soy');
goog.require('ui.icon');



/**
 * Creates the common Docs Cloudboard menu user interface. The menu is comprised
 * of menu items that allow the user copy and paste data from and to Cloudboard.
 *
 * NOTE: This UI implementation will later on be assimilated into the Shelly
 * chrome.
 *
 * @param {!office.clipboard.ui.Plugin} plugin The UI plugin to use.
 * @param {!cloudboard.ClipboardManager} clipboardManager The clipboard manager
 *     to be bound to the menu UI.
 * @param {!function(): ?string} copyMessageGetter The function to be invoked
 *     to get the label to be used for the 'copycopy' menu item. A return type
 *     of null indicates that there is nothign to copy. NOTE: The string
 *     returned from this function must be translated.
 * @param {!function(): ?cloudboard.Item} itemToCopyFetcher The function to be
 *     invoked to fetch the clipboard item referencing the currently selected
 *     object(s) in the editor. A return value of null indicates that there are
 *     no currently selected objects.
 * @param {!function(interchange.ItemRepresentation)} pasteHandler The function
 *     to be invoked on the representation of a clipboard item to be pasted in
 *     the editor.
 * @param {!office.info.SaveStateTracker} saveStateTracker The save state tracker.
 * @param {?function(interchange.ItemRepresentation): string=}
 *     opt_customPreviewHtmlGetter The function to be invoked on a thumbnail
 *     representation of a non-common MIME type, which returns the HTML for the
 *     preview popup.
 * @param {boolean=} opt_omitPastableItems Whether pastable items should not be
 *     shown in the menu.
 * @param {function(!cloudboard.Item): boolean=} opt_isEnablePastableFn An
 *     optional function that determines whether the specified cloudboard item
 *     should be enabled in the paste section of the menu. Otherwise, all items
 *     are enabled by default.
 * @param {!office.controller.ActionBinder=} opt_actionBinder
 * @param {!Array.<string>=} opt_clipboardStates States required to bind
 *     clipboard clear items and clipboard help actions.
 * @param {!Array.<string>=} opt_clipboardCopyStates States required to bind
 *     clipboard copy action.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.clipboard.Ui = function(plugin, clipboardManager, copyMessageGetter,
    itemToCopyFetcher, pasteHandler, saveStateTracker,
    opt_customPreviewHtmlGetter, opt_omitPastableItems,
    opt_isEnablePastableFn, opt_actionBinder, opt_clipboardStates,
    opt_clipboardCopyStates) {
  goog.Disposable.call(this);

  /**
   * The UI plugin.
   * @type {!office.clipboard.ui.Plugin}
   * @private
   */
  this.plugin_ = plugin;

  /**
   * The clipboard manager to be bound to the UI.
   * @type {!cloudboard.ClipboardManager}
   * @private
   */
  this.clipboardManager_ = clipboardManager;

  /**
   * The function to be invoked to get the label to be used for the 'copy'
   * menu item.
   * @type {!function(): ?string}
   * @private
   */
  this.copyMessageGetter_ = copyMessageGetter;

  /**
   * The function to be invoked to fetch the clipboard item referencing the
   * currently selected object(s) in the editor.
   * @type {!function(): ?cloudboard.Item}
   * @private
   */
  this.itemToCopyFetcher_ = itemToCopyFetcher;

  /**
   * The function to be invoked on the representation of a clipboard item to be
   * pasted in the editor.
   * @type {!function(interchange.ItemRepresentation)}
   * @private
   */
  this.pasteHandler_ = goog.bind(this.pasteWithMarqueeHandler_, this,
      pasteHandler);

  /**
   * The document's save state tracker.
   * @type {!office.info.SaveStateTracker}
   * @private
   */
  this.saveStateTracker_ = saveStateTracker;

  /**
   * The function to be invoked on a thumbnail representation of a non-common
   * MIME type, which returns the HTML for the preview popup.
   * @type {!function(interchange.ItemRepresentation): string}
   * @private
   */
  this.customPreviewHtmlGetter_ = opt_customPreviewHtmlGetter ||
      goog.nullFunction;

  /**
   * Whether pastable items should not be shown in the menu.
   * @type {boolean}
   * @private
   */
  this.omitPastableItems_ = !!opt_omitPastableItems;

  /**
   * The event handler for the UI.
   * @type {!goog.events.EventHandler.<!office.clipboard.Ui>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /**
   * The function to be invoked to query whether the specified cloudboard item
   * should be enabled in the paste section of the menu.
   * @type {function(cloudboard.Item): boolean}
   * @private
   */
  this.isEnablePastableFn_ = opt_isEnablePastableFn || goog.functions.TRUE;

  /** @private {office.controller.ActionBinder} */
  this.actionBinder_ = opt_actionBinder || null;

  /** @private {!Array.<string>} */
  this.clipboardStates_ = opt_clipboardStates || [];

  /** @private {!Array.<string>} */
  this.clipboardCopyStates_ = opt_clipboardCopyStates || [];

  this.init_();
};
goog.inherits(office.clipboard.Ui, goog.Disposable);


/**
 * The minimum time in milliseconds to display the items fetch activity
 * indicator.
 * @type {number}
 * @private
 */
office.clipboard.Ui.MIN_ITEMS_FETCH_ACTIVITY_DISPLAY_MILLIS_ = 50;


/**
 * The maximum length of the description of a pastable item in the menu UI.
 * @type {number}
 * @private
 */
office.clipboard.Ui.MAX_ITEM_DESCRIPTION_LENGTH_IN_MENU_ = 32;


/**
 * The amount of time in milliseconds during a paste operation after which the
 * paste marquee item will be shown.
 * @type {number}
 * @private
 */
office.clipboard.Ui.PASTE_DELAY_BEFORE_MARQUEE_MILLIS_ = 500;


/**
 * An enumeration of apps.action.Action property keys specific to this UI.
 * <ul>
 * <li>PASTABLE_REP_ACTIONS: List of actions corresponding to the
  *    representations of a pastable item (Array.<apps.action.Action>).
 * </ul>
 *
 * @enum {string}
 */
office.clipboard.Ui.ActionProperty = {
  PASTABLE_REP_ACTIONS: 'pastableRepActions'
};


/**
 * Specifies the maximum number of characters to display for text items in the
 * preview popup.
 * @type {number}
 */
office.clipboard.Ui.MAX_NUM_CHARS_IN_TEXT_PREVIEW = 1024;


/**
 * The URL to the web clipboard help page.
 * @type {string}
 * @private
 */
//office.clipboard.Ui.HELP_URL_ = office.chrome.helpCenter.getAnswerUrl(
//    office.chrome.helpCenter.AnswerId.SERVER_CLIPBOARD);
office.clipboard.Ui.HELP_URL_ = "https://support.yiqixie.com";


/**
 * The butter item to be used to display paste progress information.
 * @type {office.ui.ButterManager.Item}
 * @private
 */
office.clipboard.Ui.prototype.pasteButterItem_ = null;


/**
 * The Delay instance for hiding the items fetch activity indicator.
 * @type {goog.async.Delay}
 * @private
 */
office.clipboard.Ui.prototype.itemsFetchActivityHider_ = null;


/**
 * The Delay instance for showing the paste progress indicator.
 * @type {goog.async.Delay}
 * @private
 */
office.clipboard.Ui.prototype.pasteButterItemShowDelay_ = null;


/**
 * The popup to be used to show previews of pastable items in the menu.
 * @type {goog.ui.Popup}
 * @private
 */
office.clipboard.Ui.prototype.previewPopup_ = null;


/**
 * The iframe within the preview popup.
 * @type {?HTMLIFrameElement}
 * @private
 */
office.clipboard.Ui.prototype.previewIframe_ = null;


/**
 * Controls omitting pastable items in the clipboard ui plugin.
 *
 * @param {boolean} omit Exclude the pasteable items from the menu.
 */
office.clipboard.Ui.prototype.setOmitPastableItems = function(omit) {
  this.omitPastableItems_ = omit;
  if (omit) {
    this.plugin_.removeAllPastableItems();
  }
};


/**
 * Initializes the clipboard menu UI.
 *
 * @private
 */
office.clipboard.Ui.prototype.init_ = function() {
  this.plugin_.init();

  /** @desc Paste progress information for paste marquee. */
  var MSG_PASTE_PROGRESS = goog.getMsg('Pasting from server...');
  this.pasteButterItem_ = office.ui.ButterManager.createItem(MSG_PASTE_PROGRESS,
      controls.ButterBar.Type.INFO);

  // Set up delay for showing paste progress.
  var butterManager = office.ui.ButterManager.getInstance();
  this.pasteButterItemShowDelay_ = new goog.async.Delay(
      goog.bind(butterManager.postMessage, butterManager,
          this.pasteButterItem_),
      office.clipboard.Ui.PASTE_DELAY_BEFORE_MARQUEE_MILLIS_);


  // Set up delay for hiding item fetch activity.
  this.itemsFetchActivityHider_ = new goog.async.Delay(
      this.showItemsPendingIndicator_,
      office.clipboard.Ui.MIN_ITEMS_FETCH_ACTIVITY_DISPLAY_MILLIS_,
      this);

  var menu = this.plugin_.getMenu();

  // Register event listeners.
  var pasteSectionMenu = this.plugin_.getPasteSectionMenu();
  this.eventHandler_.listen(menu, goog.ui.Component.EventType.SHOW,
      this.onMenuShow_);
  this.eventHandler_.listen(pasteSectionMenu,
      [goog.ui.Component.EventType.ENTER, goog.ui.Component.EventType.LEAVE],
      this.previewPastableItem_);
  this.eventHandler_.listen(pasteSectionMenu,
      goog.ui.Component.EventType.ACTION, this.paste_);
  this.eventHandler_.listen(this.clipboardManager_, cloudboard.EventType.ERROR,
      this.onClipboardManagerError_);

  // Register action subscriptions.
  if (this.actionBinder_) {
    this.actionBinder_.
        bindFunction(new office.controller.FunctionActionBinding(
            goog.bind(this.clearAllItems_, this)).
            toAction(office.Action.CLIPBOARD_CLEAR_ITEMS.getId()).
            requireStates(this.clipboardStates_)).
        bindFunction(new office.controller.FunctionActionBinding(
            goog.bind(this.goToHelpPage_, this)).
            toAction(office.Action.CLIPBOARD_HELP.getId()).
            requireStates(this.clipboardStates_)).
        bindFunction(new office.controller.FunctionActionBinding(
            goog.bind(this.copy_, this)).
            toAction(this.plugin_.getCopyAction().getId()).
            requireStates(this.clipboardCopyStates_));
  } else {
    this.plugin_.getCopyAction().subscribe(apps.action.Topic.ACTION,
        this.copy_, this);
    this.plugin_.getCopyAction().subscribe(apps.action.Topic.ENABLED,
        this.updateCopyActionLabel_, this);
    office.Action.CLIPBOARD_CLEAR_ITEMS.subscribe(apps.action.Topic.ACTION,
        this.clearAllItems_, this);
    office.Action.CLIPBOARD_HELP.subscribe(apps.action.Topic.ACTION,
        this.goToHelpPage_, this);
  }

  // Init preview popup.
  var domHelper = menu.getDomHelper();
  var previewDiv = domHelper.createDom('div', 'office-clipboard-preview');
  domHelper.appendChild(domHelper.getDocument().body, previewDiv);
  this.previewPopup_ = new goog.ui.Popup(previewDiv);

  this.updateCopyMenuItem_();
};


/**
 * Handles an 'error' event on the clipboard manager.
 *
 * @param {!cloudboard.ErrorEvent} e The 'error' event.
 * @param {goog.async.Delay=} opt_itemsFetchActivityHider The items fetch
 *     activity hider to be used. To be used only for testing purposes.
 * @private
 */
office.clipboard.Ui.prototype.onClipboardManagerError_ = function(e,
    opt_itemsFetchActivityHider) {
  if (cloudboard.Command.LIST.name == e.requestedAction) {
    this.showItemsFetchActivity_(false, opt_itemsFetchActivityHider);
  }
};


/**
 * Copies the currently selected object(s) in the editor to the clipboard.
 *
 * @private
 */
office.clipboard.Ui.prototype.copy_ = function() {
  var itemToCopy = this.itemToCopyFetcher_();
  if (itemToCopy) {
    this.clipboardManager_.copy(itemToCopy);
  }

  office.Action.SPEAK_COPY_SELECTION.fireAction();
};


/**
 * Removes all the pastable items from the clipboard.
 *
 * @param {boolean=} opt_confirmed Whether the operation to clear all items has
 *     been confirmed.
 * @private
 */
office.clipboard.Ui.prototype.clearAllItems_ = function(opt_confirmed) {
  /** @desc Confirmation request to clear all cloudboard items. */
  var MSG_OFFICE_CLIPBOARD_CLEAR = goog.getMsg(
      'Are you sure you want to clear all items from your web clipboard?');

  //  We should avoid the use of window.confirm. Use closure-based
  // solution later.
  if (opt_confirmed || window.confirm(MSG_OFFICE_CLIPBOARD_CLEAR)) {
    this.clipboardManager_.clearAllItems();
  }
};


/**
 * Navigates the user to the web clipboard help page.
 *
 * @private
 */
office.clipboard.Ui.prototype.goToHelpPage_ = function() {
  window.open(office.clipboard.Ui.HELP_URL_, '_blank').focus();
};


/**
 * Fetches all pastable items from the clipboard and updates the 'paste'
 * submenu.
 *
 * @private
 */
office.clipboard.Ui.prototype.fetchPastableItems_ = function() {
  if (!this.omitPastableItems_ && this.clipboardManager_.fetchItems(
      this.updatePasteSection_, this)) {
    this.showItemsFetchActivity_(true);
  }
};


/**
 * Disables the paste marquee item and pastes the given item representation in
 * the editor.
 *
 * @param {function(interchange.ItemRepresentation)} pasteHandler The function
 *     to be invoked on the representation of a clipboard item to be pasted in
 *     the editor.
 * @param {interchange.ItemRepresentation} rep The item representation to be
 *     pasted.
 * @private
 */
office.clipboard.Ui.prototype.pasteWithMarqueeHandler_ = function(
    pasteHandler, rep) {
  if (this.pasteButterItemShowDelay_) {
    this.pasteButterItemShowDelay_.stop();
    office.ui.ButterManager.getInstance().clearMessage(
        this.pasteButterItem_.getId());
  }
  pasteHandler(rep);
};


/**
 * Handles a 'paste' event on a pastable item.
 *
 * @param {!goog.events.Event} e The 'paste' event.
 * @private
 */
office.clipboard.Ui.prototype.paste_ = function(e) {
  var target = e.target;
  if (target.getValue == null) {
    return;
  }

  var pastableItemInfo = target.getValue();
  if (pastableItemInfo && pastableItemInfo.mimeType) {
    if (this.pasteButterItemShowDelay_) {
      this.pasteButterItemShowDelay_.start();
    }
    this.saveStateTracker_.createAndCall(goog.bind(function() {
      this.clipboardManager_.paste(pastableItemInfo.id,
          pastableItemInfo.mimeType, this.pasteHandler_);
    }, this));
  }
};


/**
 * Hides/shows the items fetch activity. If the activity is going from 'show' to
 * to 'hide', ensures that the activity is displayed for at least a short period
 * of time before it is hidden.
 *
 * @param {boolean} pending Whether the items fetch operation is pending.
 * @param {goog.async.Delay=} opt_itemsFetchActivityHider The items fetch
 *     activity hider to be used. To be used only for testing purposes.
 * @private
 */
office.clipboard.Ui.prototype.showItemsFetchActivity_ = function(
    pending, opt_itemsFetchActivityHider) {
  var itemsFetchActivityHider = opt_itemsFetchActivityHider ||
      this.itemsFetchActivityHider_;
  if (pending) {
    this.showItemsPendingIndicator_(pending);
  } else {
    itemsFetchActivityHider.start();
  }
};


/**
 * Hides/shows the items pending indicator.
 *
 * @param {boolean} pending Whether the items fetch operation is pending.
 * @private
 */
office.clipboard.Ui.prototype.showItemsPendingIndicator_ = function(pending) {
  //  Implement me.
};


/**
 * Updates the copy action label.
 * @private
 */
office.clipboard.Ui.prototype.updateCopyActionLabel_ = function() {
  var copyMessage = this.copyMessageGetter_();

  /** @desc Message indicating that there is nothing available to copy. */
  var MSG_OFFICE_CLIPBOARD_NOTHING_TO_COPY = goog.getMsg('Nothing to copy');

  copyMessage = copyMessage || MSG_OFFICE_CLIPBOARD_NOTHING_TO_COPY;
  this.plugin_.getCopyAction().setProperty(
      apps.action.Property.LABEL, copyMessage);
};


/**
 * Updates the 'copy' menu item.
 *
 * @private
 */
office.clipboard.Ui.prototype.updateCopyMenuItem_ = function() {
  var copyMessage = this.copyMessageGetter_();

  this.plugin_.getCopyAction().setEnabled(!!copyMessage);
  this.updateCopyActionLabel_();
};


/**
 * Updates the menu items in the 'paste' section of the UI.
 *
 * @param {!Array.<!cloudboard.Item>} items The pastable items to be displayed
 *     in the 'paste' section.
 * @param {goog.async.Delay=} opt_itemsFetchActivityHider The items fetch
 *     activity hider to be used. To be used only for testing purposes.
 * @private
 */
office.clipboard.Ui.prototype.updatePasteSection_ = function(
    items, opt_itemsFetchActivityHider) {
  this.showItemsFetchActivity_(false, opt_itemsFetchActivityHider);
  var domHelper = this.plugin_.getMenu().getDomHelper();
  this.plugin_.removeAllPastableItems();
  this.addPastableItems_(items, domHelper);

  // Adding items could shift the menu so that it is overlapping its parent, so
  // reposition the sub menu after updating.
  var pasteMenu = this.plugin_.getPasteSectionMenu();
  if (pasteMenu) {
    // The paste section menu always resides in a sub menu, so its parent will
    // always be a goog.ui.SubMenu.
    var pasteMenuParent = /** @type {goog.ui.SubMenu} */
        (pasteMenu.getParent());
    if (pasteMenuParent) {
      pasteMenuParent.positionSubMenu();
    }
  }
};


/**
 * Adds menu items for the specified pastable items to the given sub-menu.
 *
 * @param {!Array.<!cloudboard.Item>} items The specified pastable items.
 * @param {goog.dom.DomHelper} domHelper The DOM helper to be used.
 * @private
 */
office.clipboard.Ui.prototype.addPastableItems_ = function(items, domHelper) {
  var menuItems = goog.array.map(
      items, goog.bind(this.createPasteMenuItem_, this, domHelper));
  this.plugin_.addPastableItems(menuItems);
};


/**
 * Creates a menu item for the given pastable item.
 *
 * @param {goog.dom.DomHelper} domHelper The DOM helper to be used.
 * @param {!cloudboard.Item} item The given pastable item.
 * @return {!goog.ui.MenuItem|!goog.ui.SubMenu} The created menu item.
 * @private
 */
office.clipboard.Ui.prototype.createPasteMenuItem_ = function(domHelper, item) {
  var createSubMenu = item.getReps().length > 1;
  var label = goog.string.truncate(item.getDescription(),
      office.clipboard.Ui.MAX_ITEM_DESCRIPTION_LENGTH_IN_MENU_);
  var itemId = /** @type {string} */ (item.getId());

  if (createSubMenu) {
    var subMenu = this.createPasteMenuItemFromRep_(
        itemId, null, item.getIconId(), label, true, domHelper);
    subMenu.setPositionAdjustable(true);
    goog.dom.classes.add(subMenu.getMenu().getElement(),
        goog.getCssName('goog-menu-noaccel'));
    goog.dom.classes.add(subMenu.getMenu().getElement(),
        goog.getCssName('goog-menu-noicon'));

    goog.array.forEach(item.getReps(), function(rep) {
      var typeName = CLOUDBOARD_MIME_TYPE_TEXTUAL_DESCRIPTIONS.get(
          rep.getMimeType().getTypeId());
      if (!typeName) {
        typeName = rep.getMimeType().getBaseType();
      }

      /** @desc Paste label for representation. */
      var MSG_OFFICE_CLIPBOARD_PASTE_AS =
          goog.getMsg('Paste as {$type}', {type: typeName});

      subMenu.addItem(this.createPasteMenuItemFromRep_(
          itemId, rep, null, MSG_OFFICE_CLIPBOARD_PASTE_AS, false,
          domHelper));
    }, this);
    subMenu.setEnabled(this.isEnablePastableFn_(item));
    return subMenu;

  } else {
    var menuItem = this.createPasteMenuItemFromRep_(itemId, item.getReps()[0],
        item.getIconId(), label, true, domHelper);
    menuItem.setEnabled(this.isEnablePastableFn_(item));
    return menuItem;
  }
};


/**
 * Creates a pastable menu item from the given item representation. NOTE: If
 * the specified representation is null, then a sub menu will be returned.
 *
 * @param {string} itemId The ID of the item whose representation is supplied.
 * @param {interchange.ItemRepresentation} rep The specified representation.
 * @param {?number} iconId The icon ID to be used.
 * @param {string} label The label to be used.
 * @param {boolean} previewable Whether a preview should be shown on hovering
 *    over the created menu item.
 * @param {goog.dom.DomHelper} domHelper The DOM helper to be used.
 * @return {!goog.ui.MenuItem|!goog.ui.SubMenu} The created menu item.
 * @private
 */
office.clipboard.Ui.prototype.createPasteMenuItemFromRep_ = function(
    itemId, rep, iconId, label, previewable, domHelper) {
  var icon = null;
  if (iconId) {
    var iconClass = office.action.getIconCssClass(
        this.translatePastableItemIconId_(iconId));
    icon = soy.renderAsFragment(ui.icon,
        { icon: iconClass, containerClass: 'goog-menuitem-icon' });
  }
  var content = [icon, label];
  var model = new office.clipboard.Ui.PastableItemInfo_(
      itemId, rep ? rep.getMimeType() : null, previewable);

  return rep ?
      new goog.ui.MenuItem(content, model, domHelper) :
      new goog.ui.SubMenu(content, model, domHelper);
};


/**
 * Translates a numeric icon ID of a pastable item into an icon name.
 *
 * @param {number} iconId The given icon ID.
 * @return {string} The icon name corresponding to the given icon ID.
 * @private
 */
office.clipboard.Ui.prototype.translatePastableItemIconId_ = function(iconId) {
  switch (iconId) {
    case cloudboard.Icon.DRAWING:
      return 'shapes';
    case cloudboard.Icon.TEXT:
      return 'text-color';
    case cloudboard.Icon.GRID:
      return 'table';
    case cloudboard.Icon.CHART:
      return 'chart';
    default :
      return '';
  }
};


/**
 * Handles a 'show' event on the menu UI.
 *
 * @param {!goog.events.Event} e The 'show' event.
 * @private
 */
office.clipboard.Ui.prototype.onMenuShow_ = function(e) {
  if (e.target == this.plugin_.getMenu()) {
    this.updateCopyMenuItem_();
    this.fetchPastableItems_();
  }
};


/**
 * Handles the 'rollover' thumbnail previewing for pastable items.
 *
 * @param {!goog.events.Event} e The enter/exit event.
 * @private
 */
office.clipboard.Ui.prototype.previewPastableItem_ = function(e) {
  var target = e.target;
  if (target.getValue == null) {
    return;
  }

  if (e.type == goog.ui.Component.EventType.ENTER) {
    var pastableItemInfo = target.getValue();
    if (pastableItemInfo && pastableItemInfo.previewable) {
      this.showPastableItemPreview_(pastableItemInfo.id,
          /** @type {!goog.ui.Menu} */ (target.getParent()));
    } else {
      this.previewPopup_.setVisible(false);
    }
  } else {
    this.previewPopup_.setVisible(false);
  }
};


/**
 * Shows a preview of the specified pastable item in the preview popup.
 *
 * @param {string} id The ID of the pastable item, whose preview is to be shown.
 * @param {!goog.ui.Menu} menu The menu in which the pastable item is
 *     rendered.
 * @private
 */
office.clipboard.Ui.prototype.showPastableItemPreview_ = function(id, menu) {
  //  Need to factor out the preview iframing logic into a common
  // libary that can be used by this and cloudboard.Ui after the Cloudboard
  // launch.

  // Hide for now since we could return prematurely.
  this.previewPopup_.setVisible(false);

  var item = this.clipboardManager_.getItemById(id);
  var thumbnailRep = item ? item.getThumbnail() : null;
  var previewHtml = thumbnailRep ?
      this.getPreviewHtml_(id, thumbnailRep) : null;
  if (item == null || thumbnailRep == null || previewHtml == null) {
    return;
  }

  var domHelper = this.plugin_.getMenu().getDomHelper();

  if (!this.previewIframe_) {
    this.previewIframe_ = /** @type {HTMLIFrameElement} */
        (domHelper.createDom('iframe', {
          'scrolling': 'no',
          'frameborder': 0
        }));
    this.previewPopup_.getElement().appendChild(this.previewIframe_);
  }

  var document = domHelper.getFrameContentDocument(this.previewIframe_);
  document.open();
  document.write('<!DOCTYPE html><body style="text-align:center;">' +
      previewHtml + '</body>');
  document.close();

  // Position the preview popup.
  this.previewPopup_.setPinnedCorner(goog.positioning.Corner.TOP_LEFT);
  this.previewPopup_.setMargin(new goog.math.Box(5, 0, 0, 0));
  var anchorElement = menu.getElement();
  this.previewPopup_.setPosition(new goog.positioning.AnchoredViewportPosition(
      anchorElement, goog.positioning.Corner.BOTTOM_LEFT));
  this.previewPopup_.setVisible(true);
};


/**
 * Returns the HTML of an item preview. If no HTML could be generated, null will
 * be returned.
 *
 * @param {string} id The ID of the item.
 * @param {!interchange.ItemRepresentation} thumbnailRep The representation of
 *     the item.
 * @return {?string} The HTML.
 * @private
 */
office.clipboard.Ui.prototype.getPreviewHtml_ = function(id, thumbnailRep) {
  var thumbnailRepMimeType = thumbnailRep.getMimeType();
  switch (thumbnailRepMimeType.getBaseType()) {
    case cloudboard.CommonType.JPEG:
    case cloudboard.CommonType.PNG:
      return this.getImagePreviewHtml_(id, thumbnailRep);

    case cloudboard.CommonType.IMAGE:
      var img = cloudboard.Image.fromRepresentation(thumbnailRep);
      return img.getUrl() ? img.asHtml() :
          this.getImagePreviewHtml_(id, thumbnailRep);

    case cloudboard.CommonType.PLAINTEXT:
    case cloudboard.CommonType.HTML:
      return thumbnailRep.getData();

    default:
      return this.customPreviewHtmlGetter_(thumbnailRep);
  }
};


/**
 * Returns the HTML of an image thumbnail representation.
 *
 * @param {string} id The ID of the item whose image thumbnail representation
 *    HTML is to be returned.
 * @param {!interchange.ItemRepresentation} thumbnailRep The representation of
 *     the image item.
 * @return {string} The HTML.
 * @private
 */
office.clipboard.Ui.prototype.getImagePreviewHtml_ = function(id, thumbnailRep) {
  var mimeType = thumbnailRep.getMimeType();
  var url = mimeType.hasUrl() ?
      mimeType.getUrl() :
      this.clipboardManager_.getClient().buildRelativeThumbnailUrl(id);

  var result = '<img src="' + url + '"';
  var width = this.previewPopup_.getElement().offsetWidth;
  if (width) {
    result += ' style="max-width:' + width + '"';
  }
  result += ' >';

  return result;
};


/** @override */
office.clipboard.Ui.prototype.disposeInternal = function() {
  office.clipboard.Ui.superClass_.disposeInternal.call(this);

  this.eventHandler_.dispose();
  delete this.eventHandler_;

  this.itemsFetchActivityHider_.dispose();
  delete this.itemsFetchActivityHider_;

  this.previewPopup_.dispose();
  delete this.previewPopup_;

  if (this.pasteButterItem_) {
    goog.dispose(this.pasteButterItem_);
    delete this.pasteButterItem_;

    goog.dispose(this.pasteButterItemShowDelay_);
    delete this.pasteButterItemShowDelay_;
  }
};



/**
 * Container representing information about a pastable item that is stored in
 * its corresponding menu item.
 *
 * @param {string} id The ID of the pastable item.
 * @param {interchange.MimeType} mimeType The MIME type of the pastable item.
 * @param {boolean} previewable Whether the pastable item is previewable.
 * @constructor
 * @struct
 * @private
 */
office.clipboard.Ui.PastableItemInfo_ = function(id, mimeType, previewable) {
  /**
   * The ID of the pastable item.
   * @type {string}
   */
  this.id = id;

  /**
   * The MIME type of the pastable item.
   * @type {interchange.MimeType}
   */
  this.mimeType = mimeType;

  /**
   * Whether the associated pastable item is previewable.
   * @type {boolean}
   */
  this.previewable = previewable;
};
