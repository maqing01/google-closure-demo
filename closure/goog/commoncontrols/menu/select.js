// Copyright 2011 Google, Inc. All Rights Reserved.

/**
 * @fileoverview Definition of the controls.Select class, a control that looks like
 * a styled button but has semantics similar to <select> tags.

 */

goog.provide('controls.Select');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.dom.classlist');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyHandler');
goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('goog.positioning');
goog.require('goog.positioning.Corner');
goog.require('goog.positioning.Overflow');
goog.require('goog.string');
goog.require('goog.style');
goog.require('goog.ui.FlatMenuButtonRenderer');
goog.require('goog.ui.Select');



/**
 * A selection button. Automatically updates the caption based on the current
 * selection. Upon click, opens a selection menu that's positioned so that the
 * current selected menu item appears directly over the button itself. This
 * behavior is similar to that of <select> tags on Mac browsers.
 *
 * @param {goog.ui.ControlContent} caption Default caption or existing DOM
 *     structure to display as the button's caption when nothing is selected.
 * @param {goog.ui.Menu=} opt_menu Menu containing selection options.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM hepler, used for
 *     document interaction.
 * @constructor
 * @extends {goog.ui.Select}
 */
controls.Select = function(caption, opt_menu, opt_domHelper) {
  controls.Select.base(this, 'constructor', caption, opt_menu,
      goog.ui.FlatMenuButtonRenderer.getInstance(), opt_domHelper);

  /**
   * @type {controls.Select.PrefixTracker_}
   * @private
   */
  this.prefixTracker_ = new controls.Select.PrefixTracker_(
      controls.Select.PREFIX_MATCHING_RESET_DELAY_MS_);
  this.registerDisposable(this.prefixTracker_);
};
goog.inherits(controls.Select, goog.ui.Select);


/**
 * Delays before resetting prefix matching string back to empty string.
 * This delays is used by keyboard handling mechanism.
 * @type {number}
 * @const
 * @private
 */
controls.Select.PREFIX_MATCHING_RESET_DELAY_MS_ = 1000;


/**
 * When computing how to place the menu, use this for padding on the viewport.
 * Works around some layout issues on IE7.
 * @type {number}
 * @const
 * @private
 */
controls.Select.VIEWPORT_PADDING_ = 2;


/** @override */
controls.Select.prototype.createDom = function() {
  controls.Select.base(this, 'createDom');
  goog.dom.classlist.add(this.getElement(), goog.getCssName('controls-select'));
};


/**
 * Positions the menu under the button. May be called directly in cases when
 * the menu size is known to change. The positioning logic is similar to that
 * found in goog.ui.MenuButton, except that a y offset is applied based on the
 * current selection.
 * @override
 */
controls.Select.prototype.positionMenu = function() {
  if (!this.getMenu().isInDocument()) {
    return;
  }

  var buttonElement = this.getElement();
  var buttonPosition = goog.style.getClientPosition(buttonElement);

  // NOTE: Unlike goog.ui.MenuButton, using TOP_START/END as anchor corners.
  var buttonCorner = this.isAlignMenuToStart() ?
      goog.positioning.Corner.TOP_START : goog.positioning.Corner.TOP_END;

  var menuEl = this.getMenu().getElement();
  var opening = false;
  // If invisible, make element visible for measurement.
  if (!this.getMenu().isVisible()) {
    opening = true;
    menuEl.style.visibility = 'hidden';
    goog.style.setElementShown(menuEl, true);
  }

  // POSITIONING ALGORITHM:
  // Priority #1) Get as much of the menu as possible on-screen.
  // Priority #2) Align the selected item with the menubutton.

  var selectedIndex = Math.max(this.getSelectedIndex(), 0);
  var selectedItem = this.getMenu().getChildAt(selectedIndex);

  // If we plan to scroll the menu, save the user's scroll position before we
  // stretch the menu out so that the positioning code will work correctly.
  var userScrollOffset = 0;
  if (this.isScrollOnOverflow()) {
    var oldScrollTop = menuEl.scrollTop;
    menuEl.style.overflowY = 'visible';
    menuEl.style.height = 'auto';

    if (!opening) {
      var oldExpectedScrollTop =
          (goog.style.getClientPosition(selectedItem.getElement()).y -
           goog.style.getClientPosition(this.getElement()).y);
      userScrollOffset = oldScrollTop - oldExpectedScrollTop;
    }
  }

  // Apply y offset based on current selection.
  var selectedItemOffset = selectedItem ?
      selectedItem.getElement().offsetTop : 0;

  // The expected position of the menu, in client coordinates.
  var expectedPositionY = buttonPosition.y - selectedItemOffset;

  // If the button is visible, make sure the select menu is visible, too.
  var buttonVisibleRect = goog.style.getVisibleRectForElement(buttonElement);
  if (buttonVisibleRect &&
      goog.math.clamp(
          buttonPosition.y,
          buttonVisibleRect.top,
          buttonVisibleRect.bottom) == buttonPosition.y) {
    var menuElVisibleRect = goog.style.getVisibleRectForElement(menuEl);
    expectedPositionY = goog.math.clamp(
        expectedPositionY,
        menuElVisibleRect.top + controls.Select.VIEWPORT_PADDING_,
        menuElVisibleRect.bottom - controls.Select.VIEWPORT_PADDING_);
  }

  var offset =
      new goog.math.Coordinate(0, expectedPositionY - buttonPosition.y);
  var popupCorner = this.isAlignMenuToStart() ?
      goog.positioning.Corner.TOP_START : goog.positioning.Corner.TOP_END;

  goog.positioning.positionAtAnchor(
      buttonElement,
      buttonCorner,
      menuEl,
      popupCorner,
      offset,
      null,
      (goog.positioning.Overflow.ADJUST_X_EXCEPT_OFFSCREEN |
       (this.isScrollOnOverflow() ? goog.positioning.Overflow.RESIZE_HEIGHT :
            goog.positioning.Overflow.ADJUST_Y_EXCEPT_OFFSCREEN)),
      null /* preferredSize */);

  // Reset overflow from above and set the scroll position based on the menu
  // position and any scrolling the user has done.
  if (this.isScrollOnOverflow()) {
    var expectedScrollTop =
        (goog.style.getClientPosition(selectedItem.getElement()).y -
         goog.style.getClientPosition(this.getElement()).y);

    menuEl.style.overflowY = 'auto';

    menuEl.scrollTop = userScrollOffset + expectedScrollTop;
  }

  // Reset visibility from above.
  if (!this.getMenu().isVisible()) {
    goog.style.setElementShown(menuEl, false);
    menuEl.style.visibility = 'visible';
  }
};


/**
 * Handles key events that allow users to navigate through the attached
 * menu by typing letter keys corresponding to the desired item.
 * @override
 */
controls.Select.prototype.handleKeyEventInternal = function(e) {
  var handled = controls.Select.base(this, 'handleKeyEventInternal', e);

  if (e.type != goog.events.KeyHandler.EventType.KEY || !this.getMenu()) {
    // We only handle events on KEY.
    return handled;
  }

  if (e.altKey || e.ctrlKey || e.metaKey || e.platformModifierKey) {
    // Don't capture menu accelerators.
    return handled;
  }

  if (!this.isOpen() && e.keyCode == goog.events.KeyCodes.SPACE) {
    // If the menu is not opened and space is pressed, we reset our prefix
    // matching (if any) and delegate to superclass to handle opening
    // of the menu.
    this.prefixTracker_.resetPrefix();
    return handled;
  }

  // If parent class method already handled the key, we just need to
  // make sure that the highlighted item is visible after typing UP/DOWN.
  if (handled) {
    if (this.isOpen() &&
        (e.keyCode == goog.events.KeyCodes.UP ||
         e.keyCode == goog.events.KeyCodes.DOWN)) {
      this.ensureHighlightedItemIsVisible_();
    }
    return true;
  }

  var isCharacterKey = goog.events.KeyCodes.isCharacterKey(e.keyCode);
  if (isCharacterKey) {
    var currentChar = e.charCode ? String.fromCharCode(e.charCode) : ' ';
    this.prefixTracker_.add(currentChar);
    var prefix = this.prefixTracker_.getCurrentPrefix();
    if (this.prefixTracker_.isCycling()) {
      // If the user types the same letter, we try to cycle between
      // different items with the same first character. Once we start
      // cycling, the only acceptable matching would be to cycle (until
      // PREFIX_MATCHING_RESET_DELAY_MS is met).
      this.findNextPrefix_(currentChar, false);
    } else {
      // If we are starting a new prefix-matching, we should not allow
      // matching with currently selected item.
      var matchCurrent = prefix.length > 1;
      this.findNextPrefix_(prefix, matchCurrent);
    }

    // We consider that this function handles all character key.
    return true;
  }

  return false;
};


/**
 * Ensures that the currently highlighted item is visible, scrolling
 * the menu if necessary.
 * @private
 */
controls.Select.prototype.ensureHighlightedItemIsVisible_ = function() {
  var highlightedItem = this.getMenu().getHighlighted();
  if (highlightedItem) {
    goog.style.scrollIntoContainerView(
        highlightedItem.getElement(), this.getMenu().getContentElement());
  }
};


/**
 * Finds the next item after the currently selected menu in the select
 * list with the matching prefix. If the select menu is open, we also
 * highlight the new item, otherwise we set the selection to the new
 * item.
 * @param {string} prefix The prefix to match.
 * @param {boolean} matchCurrent Whether we can match current
 *     selection first. If false, we try to match starting from one
 *     item after currentIndex instead.
 * @private
 */
controls.Select.prototype.findNextPrefix_ = function(prefix, matchCurrent) {
  var currentIndex = this.isOpen() ?
      this.getMenu().getHighlightedIndex() : this.getSelectedIndex();
  var re = new RegExp('^' + goog.string.regExpEscape(prefix), 'i');

  // If we do not allow matching currently selected index, we start
  // from the next one instead.
  if (!matchCurrent) {
    ++currentIndex;
  }
  var start = currentIndex < 0 ? 0 : currentIndex;

  var menu = this.getMenu();
  for (var i = 0, max = menu.getChildCount(); i < max; ++i) {
    var nextIndex = (start + i) % max;
    var menuItem = menu.getChildAt(nextIndex);
    var name = menuItem.getCaption();
    if (menuItem.isEnabled() && name && re.test(name)) {
      this.setSelectedOrHighlightedIndex_(nextIndex);
      return;
    }
  }
};


/**
 * Sets currently selected or highlighted index depending on whether
 * the select menu is opened or closed. If the menu is opened, we set
 * the highlighted index of the select menu; otherwise, we set the
 * selected index of this select.
 * @param {number} index The new index to select/highlight.
 * @private
 */
controls.Select.prototype.setSelectedOrHighlightedIndex_ = function(index) {
  if (this.isOpen()) {
    this.getMenu().setHighlightedIndex(index);
    this.ensureHighlightedItemIsVisible_();
  } else {
    this.setSelectedIndex(index);
  }
};



/**
 * A prefix string tracker that resets (to empty string) after a
 * specified delay. This class also contains specific logic to keep
 * track of whether we should be 'cycling'. Cycling occurs when
 * user types the same character multiple times in quick succession.
 * Instead of performing the normal prefix-matching, we instead
 * cycles over items with the same prefixes.
 * @param {number} resetDelay The reset delay in ms.
 * @extends {goog.Disposable}
 * @constructor
 * @private
 */
controls.Select.PrefixTracker_ = function(resetDelay) {
  controls.Select.PrefixTracker_.base(this, 'constructor');

  /**
   * @type {goog.async.Delay}
   * @private
   */
  this.delay_ = new goog.async.Delay(this.resetPrefix, resetDelay, this);
  this.registerDisposable(this.delay_);
};
goog.inherits(controls.Select.PrefixTracker_, goog.Disposable);


/**
 * Adds letters to the end of the current prefix and reset the reset
 * delay.
 * @param {string} nextLetter Letter to add to the end of the
 *     prefix.
 */
controls.Select.PrefixTracker_.prototype.add = function(nextLetter) {
  goog.asserts.assert(
      nextLetter.length == 1,
      'nextLetter: \'' + nextLetter + '\' must be a single character');

  if (nextLetter == this.currentPrefix_) {
    this.cycling_ = true;
  } else if (!this.cycling_) {
    this.currentPrefix_ += nextLetter;
  }

  // Starts or resets the delay.
  this.delay_.start();
};


/**
 * @return {string} The current prefix.
 */
controls.Select.PrefixTracker_.prototype.getCurrentPrefix = function() {
  return this.currentPrefix_;
};


/**
 * @return {boolean} Whether we should perform prefix matching by
 *     'cycling'.
 */
controls.Select.PrefixTracker_.prototype.isCycling = function() {
  return this.cycling_;
};


/**
 * Resets the prefix back to empty string.
 */
controls.Select.PrefixTracker_.prototype.resetPrefix = function() {
  this.currentPrefix_ = '';
  this.cycling_ = false;
};


/**
 * @type {boolean}
 * @private
 */
controls.Select.PrefixTracker_.prototype.cycling_ = false;


/**
 * @type {string}
 * @private
 */
controls.Select.PrefixTracker_.prototype.currentPrefix_ = '';
