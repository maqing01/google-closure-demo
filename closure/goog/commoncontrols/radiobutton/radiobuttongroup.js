

/**
 * @fileoverview A set of radio buttons. The {@code controls.RadioButtonGroup}
 * encloses a {@code goog.ui.SelectionModel} which handles the exclusive
 * selection of a single button from a list of buttons.
 *
 * The user selection of a {@code controls.RadioButton} in the group fires a
 * {@code goog.ui.Component.EventType.ACTION} event. The
 * {@code goog.events.EventType.CHANGE} event is fired  when the selection
 * changes regardless of whether it was triggered programatically or as a
 * result of user action.
 *
 * Sample usage:
 *   var options = ['a', 'b', 'c'];
 *   var rbGroup = new controls.RadioButtonGroup();
 *   goog.array.forEach(options,
 *       function(label, index) {
 *         var radioButton = new controls.RadioButton(null, label);
 *         radioButton.render();
 *         radioButtonGroup.addButton(radioButton);
 *       });
 *
 * Note: This works just like goog.ui.Component. The buttons added will be
 * disposed once this control is disposed.
 *
 * @see radiobutton_demo.html
 *

 */

goog.provide('controls.RadioButtonGroup');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.math');
goog.require('goog.ui.Component');
goog.require('goog.ui.SelectionModel');
goog.require('controls.RadioButton');



/**
 * Kennedy radio button group.
 *
 * @param {Array.<controls.RadioButton>=} opt_buttons Optional initial buttons.
 * @param {string=} opt_name Optional name for the radio button group.
 *     Corresponds to the 'name' attribute on the native radio button in that
 *     all radio buttons in a RadioButtonGroup have the same name.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
controls.RadioButtonGroup = function(opt_buttons, opt_name) {
  controls.RadioButtonGroup.base(this, 'constructor');

  /**
   * @type {string}
   * @private
   */
  this.name_ = opt_name || '';

  /**
   * @type {!goog.ui.SelectionModel}
   * @private
   */
  this.selectionModel_ = new goog.ui.SelectionModel();
  this.registerDisposable(this.selectionModel_);

  /**
   * @type {!goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);

  this.selectionModel_.setSelectionHandler(controls.RadioButtonGroup.selectButton_);

  this.eventHandler_.listen(this.selectionModel_, goog.events.EventType.SELECT,
      goog.partial(this.dispatchEvent, goog.events.EventType.CHANGE));

  this.eventHandler_.listen(this, controls.RadioButton.EventType.FOCUS_NEXT,
                            this.handleCtrlDownKey_);
  this.eventHandler_.listen(this, controls.RadioButton.EventType.FOCUS_PREVIOUS,
                            this.handleCtrlUpKey_);
  this.eventHandler_.listen(this, controls.RadioButton.EventType.SELECT_NEXT,
                            this.handleDownKey_);
  this.eventHandler_.listen(this, controls.RadioButton.EventType.SELECT_PREVIOUS,
                            this.handleUpKey_);
  this.eventHandler_.listen(this, controls.RadioButton.EventType.SELECT_FOCUS,
                            this.handleMoveFocus_);
  this.eventHandler_.listen(this, controls.RadioButton.EventType.GROUP_BLUR,
                            goog.partial(this.handleBlur_, false));
  this.eventHandler_.listen(this, controls.RadioButton.EventType.GROUP_BLUR_BACK,
                            goog.partial(this.handleBlur_, true));

  if (opt_buttons) {
    goog.array.forEach(opt_buttons, this.addButton, this);
  }
};
goog.inherits(controls.RadioButtonGroup, goog.events.EventTarget);


/**
 * Given a name, parses the DOM for all radio buttons annotated with that name
 * (as the data-name attribute), and creates a {@code controls.RadioButtonGroup}
 * containing those radio buttons.
 *
 * @param {string} name The name for the radio button group.
 * @param {Document|Element} parentElement Parent element to look for the
 *     radio buttons, or the document to look everywhere.
 * @return {!controls.RadioButtonGroup} The created radio button group (may be
 *     empty).
 */
controls.RadioButtonGroup.createFromDom = function(name, parentElement) {
  var radioButtonElements = goog.dom.getElementsByClass(
      controls.RadioButton.CSS_CLASS, parentElement);
  var radioButtonGroup = new controls.RadioButtonGroup(null, name);
  var domHelper = goog.dom.getDomHelper(parentElement);

  for (var i = 0; i < radioButtonElements.length; i++) {
    if (radioButtonElements[i].getAttribute(controls.RadioButton.NAME_ATTRIBUTE) ==
        name) {
      var radioButton = new controls.RadioButton(domHelper);
      radioButton.decorate(radioButtonElements[i]);
      radioButtonGroup.addButton(radioButton);
    }
  }
  return radioButtonGroup;
};


/**
 * Gets the number of buttons in the set.
 *
 * @return {number} Number of buttons in the set.
 */
controls.RadioButtonGroup.prototype.getButtonCount = function() {
  return this.selectionModel_.getItemCount();
};


/**
 * Adds a new radio button to the set. The name for the {@code controls.RadioButton}
 * being added is set to the name of this {@code controls.RadioButtonGroup}. If the
 * radio button is checked, it is set as the selected button in the group.
 *
 * @param {controls.RadioButton} button The button to add to the set.
 */
controls.RadioButtonGroup.prototype.addButton = function(button) {
  goog.asserts.assert(button != null);
  this.eventHandler_.listen(button, goog.ui.Component.EventType.ACTION,
                            this.handleAction_);
  button.setParentEventTarget(this);
  button.setName(this.name_);
  var checked = button.isChecked();
  this.selectionModel_.addItem(button);
  // addItem, by default, unchecks the button being added. Select (and check)
  // the button if it was checked before.
  if (checked) {
    this.setSelectedButton(button);
  }
  if (button.getElement()) {
    this.handleMoveFocus_();
  }
};


/**
 * Removes a radio button from the set.
 *
 * @param {!controls.RadioButton} button The button to remove from the set.
 */
controls.RadioButtonGroup.prototype.removeButton = function(button) {
  this.eventHandler_.unlisten(button, goog.ui.Component.EventType.ACTION,
                              this.handleAction_);
  button.setParentEventTarget(null);
  this.selectionModel_.removeItem(button);
  // Reselect the group tabIndex, if needed.
  this.handleMoveFocus_();
};


/**
 * Sets the selected button. Pass in null to clear selection.
 *
 * @param {controls.RadioButton} button The button to be set as selected.
 */
controls.RadioButtonGroup.prototype.setSelectedButton = function(button) {
  this.selectionModel_.setSelectedItem(button);
  // Reselect the group tabIndex, if needed.
  this.handleMoveFocus_();
};


/**
 * Returns the currently selected button. Can return null when the
 * RadioButtonGroup is newly created(and nothing has been selected yet) or if
 * the currently selected item is removed from the group.
 *
 * @return {controls.RadioButton} The currently selected button.
 */
controls.RadioButtonGroup.prototype.getSelectedButton = function() {
  return /** @type {controls.RadioButton} */ (
      this.selectionModel_.getSelectedItem());
};


/**
 * Returns the item at the given 0-based index.
 * @param {number} index Index of the item to return.
 * @return {controls.RadioButton} The button at the passed index, null if none.
 */
controls.RadioButtonGroup.prototype.getButtonAt = function(index) {
  return /** @type {controls.RadioButton} */ (this.selectionModel_.getItemAt(index));
};


/**
 * @return {string} The name for this radio button group.
 */
controls.RadioButtonGroup.prototype.getName = function() {
  return this.name_;
};


/**
 * @return {?string} The value of the currently selected radio button or null
 *     if none is selected.
 */
controls.RadioButtonGroup.prototype.getSelectedValue = function() {
  var selectedButton = this.getSelectedButton();

  return selectedButton ? selectedButton.getValue() : null;
};


/**
 * Focuses the button at the given index if its in the DOM and optionaly selects
 * it.
 *
 * @param {number} index The index for the button to be selected.
 * @param {boolean} select If the button should be selected as well as focussed.
 * @private
 */
controls.RadioButtonGroup.prototype.setFocusedButtonAndMaybeSelect_ = function(
    index, select) {
  var newSelectedButton = /** @type {controls.RadioButton} */
                          (this.selectionModel_.getItemAt(index));
  if (select) {
    this.setSelectedButton(newSelectedButton);
  }

  goog.array.forEach(this.selectionModel_.getItems(), function(button) {
    if (button.getElement()) {
      goog.dom.setFocusableTabIndex(button.getElement(),
          newSelectedButton == button);
    }
  });

  // On IE, a focusable element that is either detached from the DOM or
  // hidden (i.e. display:none) will throw an exception when its focus() method
  // is called so we catch all exceptions just to be safe.
  try {
    newSelectedButton.getElement().focus();
  } catch (e) {}
};


/**
 * Focuses an adjacent button in the group.
 *
 * @param {!controls.RadioButton} button The radiobutton to use as reference.
 * @param {number} indexDifference +1 or -1 depending on whether to select the
 *     next or the previous button.
 * @param {boolean} select If the button should be selected as well as focussed.
 * @private
 */
controls.RadioButtonGroup.prototype.focusAdjacentButton_ =
    function(button, indexDifference, select) {
  var newIndex = this.findAdjacentButtonIndex_(button, indexDifference);
  var newButton = newIndex != -1 ?
      this.selectionModel_.getItemAt(newIndex) : null;
  if (newButton) {
    // if no new button is found the current button retains focus.
    goog.dom.setFocusableTabIndex(button.getElement(), false);
    this.setFocusedButtonAndMaybeSelect_(newIndex, select);
  }
};


/**
 * Finds the index of an adjacent button in the group, where disabled buttons
 * are skipped, -1 if no button is found.
 * Note: for only one (enabled) button the next button can be the current one.
 *
 * @param {!controls.RadioButton} button The radiobutton to use as reference.
 * @param {number} indexDifference +1 or -1 depending on whether to select the
 *     next or the previous button.
 * @return {number} The index of the adjacent button or -1 if no button is
 *     found.
 * @private
 */
controls.RadioButtonGroup.prototype.findAdjacentButtonIndex_ =
    function(button, indexDifference) {
  var numItems = this.selectionModel_.getItemCount();
  var currIndex = this.selectionModel_.indexOfItem(button);
  for (var i = 1; i <= numItems; i++) {
    var newIndex = goog.math.modulo(currIndex + indexDifference * i, numItems);
    var newButton = this.getButtonAt(newIndex);
    if (newButton.isEnabled()) {
      return newIndex;
    }
  }
  return -1;
};


/**
 * Handles the UP key.
 * @param {!goog.events.Event} e The key event.
 * @private
 */
controls.RadioButtonGroup.prototype.handleUpKey_ = function(e) {
  var targetButton = /** @type {controls.RadioButton} */ (e.target);
  goog.asserts.assert(targetButton);
  this.focusAdjacentButton_(targetButton, -1, true);
};


/**
 * Handles the DOWN key.
 * @param {!goog.events.Event} e The key event.
 * @private
 */
controls.RadioButtonGroup.prototype.handleDownKey_ = function(e) {
  var targetButton = /** @type {controls.RadioButton} */ (e.target);
  goog.asserts.assert(targetButton);
  this.focusAdjacentButton_(targetButton, 1, true);
};


/**
 * Handles the CTRL+UP key.
 * @param {!goog.events.Event} e The key event.
 * @private
 */
controls.RadioButtonGroup.prototype.handleCtrlUpKey_ = function(e) {
  var targetButton = /** @type {controls.RadioButton} */ (e.target);
  goog.asserts.assert(targetButton);
  this.focusAdjacentButton_(targetButton, -1, false);
};


/**
 * Handles the CTRL+DOWN key.
 * @param {!goog.events.Event} e The key event.
 * @private
 */
controls.RadioButtonGroup.prototype.handleCtrlDownKey_ = function(e) {
  var targetButton = /** @type {controls.RadioButton} */ (e.target);
  goog.asserts.assert(targetButton);
  this.focusAdjacentButton_(targetButton, 1, false);
};


/**
 * Handles the TAB out event.
 * @param {boolean} back True if exiting backwards.
 * @param {!goog.events.Event} e The key event.
 * @private
 */
controls.RadioButtonGroup.prototype.handleBlur_ = function(back, e) {
  var focussedButtons = this.handleMoveFocus_(e);
  try {
    var button = focussedButtons[back ? 0 : 1];
    if (button) {
      button.getElement().focus();
    }
  } catch (ex) {}
};


/**
 * Scans the group to find the radio that should receive focus in the following
 * way:
 * - the selected button if it's enabled; else
 * - the first enabled button in the group starting from radio 0.
 *
 * The given radio will receive tabIndex=0 where any other focusable radio will
 * lose tabIndex.
 * @param {goog.events.Event=} opt_event The event in case method was called
 *     from an event handler.
 * @return {!Array.<controls.RadioButton>} The first and last focusable buttons.
 *     these may be the same button.
 * @private
 */
controls.RadioButtonGroup.prototype.handleMoveFocus_ = function(opt_event) {
  var selectedButton = this.getSelectedButton();
  var firstButton = this.getButtonAt(0);

  var isSelectedActive = selectedButton && selectedButton.isEnabled();
  var newButton = isSelectedActive ? selectedButton : firstButton;
  goog.asserts.assert(newButton, 'Must have at least one button in the group');

  if (!newButton.isEnabled()) {
    // Find the index of the first adjacent enabled button.
    var newIndex = this.findAdjacentButtonIndex_(newButton, 1);
    newButton = newIndex != -1 ? this.getButtonAt(newIndex) : null;
  }

  var lastButton = newButton;
  if (newButton && !isSelectedActive) {
    // Find the index of the last enabled button.
    var newIndex = this.findAdjacentButtonIndex_(newButton, -1);
    lastButton = newIndex != -1 ? this.getButtonAt(newIndex) : null;
  }

  goog.array.forEach(this.selectionModel_.getItems(), function(button) {
    if (button.getElement()) {
      goog.dom.setFocusableTabIndex(button.getElement(),
          newButton == button || lastButton == button);
    }
  });
  return [newButton, lastButton];
};


/**
 * Handles the action event fired when the user interacts with (clicks) one of
 * the {@code controls.RadioButton}s in the group.
 *
 * @param {!goog.events.Event} e The event prompting selection change.
 * @private
 */
controls.RadioButtonGroup.prototype.handleAction_ = function(e) {
  var button = /** @type {!controls.RadioButton} */ (e.target);
  this.setSelectedButton(button);
  // On IE, a focusable element that is either detached from the DOM or
  // hidden (i.e. display:none) will throw an exception when its focus() method
  // is called so we catch all exceptions just to be safe.
  try {
    button.getElement().focus();
  } catch (ex) {}
};


/** @override */
controls.RadioButtonGroup.prototype.disposeInternal = function() {
  goog.array.forEach(this.selectionModel_.getItems(), function(button) {
    goog.dispose(button);
  });

  controls.RadioButtonGroup.base(this, 'disposeInternal');
};


/**
 * Selection handler for {@code goog.ui.SelectionModel}. This handles the
 * selection and deselection of {@code controls.RadioButton}s as directed by
 * {@code goog.ui.SelectionModel}.
 *
 * @param {!controls.RadioButton} button The button whose selection is to be handled.
 * @param {boolean} select Select or deselect the button.
 * @private
 */
controls.RadioButtonGroup.selectButton_ = function(button, select) {
  button.setChecked(select);

  if (button.getElement()) {
    goog.dom.setFocusableTabIndex(button.getElement(), select);
  }
};
