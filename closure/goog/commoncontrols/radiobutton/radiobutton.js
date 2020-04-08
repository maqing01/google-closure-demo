

/**
 * @fileoverview RadioButton implemented in the Kennedy style.
 *
 * NOTE: This is meant to be used as a basic component for controls.RadioButtonGroup
 * which provides exclusive selection among a group of {@code controls.RadioButton}s.
 *
 * Creates a custom radio button control extending goog.ui.Control.
 * The current layout :
 *  <div class='controls-radiobutton'>
 *    <span class='controls-radiobutton-radio' />
 *    <div class='controls-radiobutton-label'>
 *      <label>
 *    </div>
 *  </div>.

 */

goog.provide('controls.RadioButton');
goog.provide('controls.RadioButton.EventType');

goog.require('goog.a11y.aria.Role');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.KeyCodes');
goog.require('goog.soy');
goog.require('goog.ui.Component');
goog.require('goog.ui.Control');
goog.require('goog.ui.ControlRenderer');
goog.require('controls.templates.radiobutton.main');



/**
 * Kennedy radio button widget.
 *
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @param {goog.ui.ControlContent=} opt_label Optional label for the
 *    radio button.
 * @param {string=} opt_value Optional value to set for the radio button.
 * @param {string=} opt_name Optional name to set for the radio button.
 * @constructor
 * @extends {goog.ui.Control}
 */
controls.RadioButton = function(opt_domHelper, opt_label, opt_value, opt_name) {
  controls.RadioButton.base(this, 'constructor',
      null, controls.RadioButtonRenderer_.getInstance(), opt_domHelper);

  /**
   * @type {string}
   * @private
   */
  this.value_ = opt_value || '';
  this.name_ = opt_name || '';
  this.setSupportedState(goog.ui.Component.State.CHECKED, true);
  this.setAutoStates(goog.ui.Component.State.CHECKED, false);
  if (opt_label) {
    this.setLabel(opt_label);
  }
};
goog.inherits(controls.RadioButton, goog.ui.Control);


/**
 * @type {goog.ui.ControlContent}
 * @private
 */
controls.RadioButton.prototype.label_;


/**
 * Constants for event names. Private to CONTROLS.
 * @enum {string}
 */
controls.RadioButton.EventType = {
  FOCUS_NEXT: goog.events.getUniqueId('focusnext'),
  FOCUS_PREVIOUS: goog.events.getUniqueId('focusprev'),
  SELECT_NEXT: goog.events.getUniqueId('selectnext'),
  SELECT_PREVIOUS: goog.events.getUniqueId('selectprev'),
  // The DISABLED state of the radio is changed and focus for the containing
  // group of radio buttons should be recomputed (disabled radio can not
  // be focusable).
  SELECT_FOCUS: goog.events.getUniqueId('selectfocus'),
  GROUP_BLUR: goog.events.getUniqueId('groupblur'),
  GROUP_BLUR_BACK: goog.events.getUniqueId('groupblurback')
};


/**
 * Performs the appropriate action when the control is activated by the user.
 * Overriding the parent class method because radio buttons, once checked,
 * remain checked on click and are unchecked only when another radio button
 * in a group is checked.
 * @see http://www.w3.org/wiki/RadioButton
 * @override
 * @protected
 */
controls.RadioButton.prototype.performActionInternal = function(e) {
  this.setChecked(true);
  return controls.RadioButton.base(this, 'performActionInternal', e);
};


/** @override */
controls.RadioButton.prototype.handleKeyEventInternal = function(e) {
  switch (e.keyCode) {
    case goog.events.KeyCodes.UP:
    case goog.events.KeyCodes.LEFT:
      this.dispatchEvent(e.ctrlKey ? controls.RadioButton.EventType.FOCUS_PREVIOUS :
          controls.RadioButton.EventType.SELECT_PREVIOUS);
      return true;

    case goog.events.KeyCodes.DOWN:
    case goog.events.KeyCodes.RIGHT:
      this.dispatchEvent(e.ctrlKey ? controls.RadioButton.EventType.FOCUS_NEXT :
          controls.RadioButton.EventType.SELECT_NEXT);
      return true;

    case goog.events.KeyCodes.SPACE:
      return this.performActionInternal(e);

    case goog.events.KeyCodes.TAB:
      this.dispatchEvent(e.shiftKey ?
          controls.RadioButton.EventType.GROUP_BLUR_BACK :
          controls.RadioButton.EventType.GROUP_BLUR);
      return false;
  }
  return controls.RadioButton.base(this, 'handleKeyEventInternal', e);
};


/**
 * Sets the value for the radio button.
 *
 * @param {string} value The value to set for this radio button.
 */
controls.RadioButton.prototype.setValue = function(value) {
  this.value_ = value;

  var element = this.getElement();
  if (element) {
    var renderer = /** @type {controls.RadioButtonRenderer_} */ (this.getRenderer());
    renderer.setValue(element, value);
  }
};


/**
 * Gets the value for this radio button.
 *
 * @return {string} The value for this radio button.
 */
controls.RadioButton.prototype.getValue = function() {
  return this.value_;
};


/**
 * Sets the name for the radio button.
 *
 * @param {string} name The name to set for this radio button.
 */
controls.RadioButton.prototype.setName = function(name) {
  this.name_ = name;

  if (this.getElement()) {
    this.getRenderer().setName(this.getElement(), name);
  }
};


/**
 * Gets the name for this radio button.
 *
 * @return {string} Return the name for this radio button.
 */
controls.RadioButton.prototype.getName = function() {
  return this.name_;
};


/**
 * Checks or unchecks the radiobutton. This function is exposed only so the
 * {@code controls.RadioButtonGroup} can access it to check or uncheck the radio
 * button when user selection changes. If you need to programmatically change
 * the state of a radio button in a group of radio buttons, please use:
 * {@code controls.RadioButtonGroup.setSelectedButton} instead as using this method
 * will not correctly change the RadioButtonGroup's state.
 *
 * @override
 */
controls.RadioButton.prototype.setChecked = function(check) {
  controls.RadioButton.base(this, 'setChecked', check);
};


/**
 * Enables/disables the radio button.
 * Note: This method is different than {@code goog.ui.Control#setEnabled} since
 * the Event is dispatched after the Radio state is changed.
 * @override
 */
controls.RadioButton.prototype.setEnabled = function(enable) {
  controls.RadioButton.base(this, 'setEnabled', enable);
  this.dispatchEvent(controls.RadioButton.EventType.SELECT_FOCUS);
};


/**
 * Binds an HTML element to the radio button which, if clicked, checks the
 * radio button. Behaves the same way as the 'label' HTML tag.
 *
 * @param {goog.ui.ControlContent} label The label element to set.
 */
controls.RadioButton.prototype.setLabel = function(label) {
  this.label_ = label;

  if (this.getElement()) {
    this.getRenderer().setLabel(this.getElement(), this.label_);
  }
};


/**
 * Returns the label for this radio button.
 *
 * @return {goog.ui.ControlContent} The label for this radio button.
 */
controls.RadioButton.prototype.getLabel = function() {
  return this.label_;
};


/**
 * Considered private to //javascript/controls.
 * @type {string}
 * @const
 */
controls.RadioButton.CSS_CLASS = goog.getCssName('controls-radiobutton');


/**
 * Considered private to //javascript/controls.
 * @type {string}
 * @const
 */
controls.RadioButton.NAME_ATTRIBUTE = 'data-name';


/**
 * considered private to //javascript/controls.
 * @type {string}
 * @const
 */
controls.RadioButton.VALUE_ATTRIBUTE = 'data-value';



/**
 * Renderer for the {@link controls.RadioButton}s.
 *
 * @constructor
 * @extends {goog.ui.ControlRenderer}
 * @private
 */
controls.RadioButtonRenderer_ = function() {
  controls.RadioButtonRenderer_.base(this, 'constructor');
};
goog.inherits(controls.RadioButtonRenderer_, goog.ui.ControlRenderer);
goog.addSingletonGetter(controls.RadioButtonRenderer_);


/** @override */
controls.RadioButtonRenderer_.prototype.createDom = function(control) {
  var controlEl = goog.soy.renderAsElement(
      controls.templates.radiobutton.main, {
        checked: control.isChecked(),
        disabled: !control.isEnabled(),
        name: control.getName(),
        value: control.getValue()
      }, undefined, control.getDomHelper());

  var labelContent = control.getLabel();
  if (labelContent) {
    this.setLabel(controlEl, labelContent);
  }

  return controlEl;
};


/** @override */
controls.RadioButtonRenderer_.prototype.decorate = function(control, element) {
  controls.RadioButtonRenderer_.base(this, 'decorate', control, element);

  var radio = /** @type {controls.RadioButton} */ (control);
  var value = element.getAttribute(controls.RadioButton.VALUE_ATTRIBUTE);
  if (value) {
    radio.setValue(value);
  }

  var name = element.getAttribute(controls.RadioButton.NAME_ATTRIBUTE);
  if (name) {
    radio.setName(name);
  }

  var labelElement = this.getContentElement(element);
  goog.asserts.assert(labelElement);

  // Set the control's content to the decorated element's content.
  if (labelElement.firstChild) {
    radio.setLabel(labelElement.firstChild.nextSibling ?
        goog.array.clone(labelElement.childNodes) : labelElement.firstChild);
  } else {
    radio.setLabel(null);
  }

  return element;
};


/** @override */
controls.RadioButtonRenderer_.prototype.getAriaRole = function() {
  return goog.a11y.aria.Role.RADIO;
};


/**
 * Sets the label for the radio button.
 *
 * @param {!Element} controlElement The radio button for which to render the
 *     label.
 * @param {goog.ui.ControlContent} label The label for the radio button.
 */
controls.RadioButtonRenderer_.prototype.setLabel = function(controlElement, label) {
  var labelElement = this.getContentElement(controlElement);
  goog.asserts.assert(labelElement);
  goog.dom.removeChildren(labelElement);
  goog.dom.append(labelElement, label);
};


/**
 * Sets the value for the radio button.
 *
 * @param {!Element} controlElement The radio button's element.
 * @param {string} value the value to assign the radio button.
 */
controls.RadioButtonRenderer_.prototype.setValue = function(controlElement, value) {
  controlElement.setAttribute(controls.RadioButton.VALUE_ATTRIBUTE, value);
};


/**
 * Sets the name for the radio button.
 *
 * @param {!Element} controlElement The radio button's element.
 * @param {string} name the name to assign the radio button.
 */
controls.RadioButtonRenderer_.prototype.setName = function(controlElement, name) {
  controlElement.setAttribute(controls.RadioButton.NAME_ATTRIBUTE, name);
};


/** @override */
controls.RadioButtonRenderer_.prototype.getContentElement = function(element) {
  return goog.dom.getElementByClass(
      goog.getCssName(this.getCssClass(), 'label'), element);
};


/** @override */
controls.RadioButtonRenderer_.prototype.getCssClass = function() {
  return controls.RadioButton.CSS_CLASS;
};
