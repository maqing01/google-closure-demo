

/**
 * @fileoverview Provides utility functions for generating labels with keyboard
 * mnemonics.
 *

 * @see menu_demo.html
 */

goog.provide('controls.MenuMnemonics');

goog.require('goog.a11y.aria');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events.KeyNames');
goog.require('goog.ui.MenuItemRenderer');


/**
 * Creates control content with a mnemonic hint for a given label. The class
 * names used to decorate the mnemonic default to
 * {@link goog.ui.MenuItem.CSS_CLASS}. If hints for other controls are required,
 * use {@link createMnemonicLabelForControl}.
 *
 * @param {!string} label The label for which the mnemonic
 *     structure should be generated.
 * @param {!goog.events.KeyCodes} mnemonicKey The key code of the mnemonic key.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @return {!goog.ui.ControlContent} Content containing the original label with
 *     mnemonic hints added.
 */
controls.MenuMnemonics.createCaption = function(label, mnemonicKey,
    opt_domHelper) {
  var domHelper = opt_domHelper || goog.dom.getDomHelper();
  return controls.MenuMnemonics.createCaptionInternal_(
      goog.ui.MenuItemRenderer.CSS_CLASS, label, mnemonicKey, domHelper);
};


/**
 * Creates control content with a mnemonic hint for a given label.
 *
 * @param {!string} baseCssClass The base CSS class for the mnemonic DOM
 *     structure.
 * @param {!string} label The label for which mnemonic structure
 *     should be generated.
 * @param {!goog.events.KeyCodes} mnemonicKey The key code of the mnemonic key.
 * @param {goog.dom.DomHelper} domHelper The DOM helper.
 * @return {!goog.ui.ControlContent} Content containing the original label with
 *     mnemonic hints added.
 * @private
 */
controls.MenuMnemonics.createCaptionInternal_ = function(baseCssClass,
    label, mnemonicKey, domHelper) {
  var mnemonicKeyName = goog.events.KeyNames[mnemonicKey];
  var mnemonicIndex = label.toLowerCase().indexOf(mnemonicKeyName);
  var isMnemonicInLabel = mnemonicIndex >= 0;

  var content = isMnemonicInLabel ?
      controls.MenuMnemonics.generateInlineHint_(label, label.charAt(mnemonicIndex),
          mnemonicIndex, baseCssClass, domHelper) :
      controls.MenuMnemonics.generateSeparatedHint_(label,
          mnemonicKeyName.toUpperCase(), baseCssClass, domHelper);
  var wrapper = domHelper.createDom(
      goog.dom.TagName.SPAN, undefined /* opt_attributes */, content);
  goog.a11y.aria.setLabel(wrapper, label + ', ' + mnemonicKeyName + ';');
  return wrapper;
};


/**
 * Creates control content containing a text node with the given label and
 * a span holding a parenthesized mnemonic hint (e.g. "File (D)").
 *
 * @param {string} label The label for which the hint is being added.
 * @param {string} hint The hint character.
 * @param {string} baseCssClass The base CSS class for the mnemonic
 *     DOM structure.
 * @param {goog.dom.DomHelper} domHelper The DOM helper.
 * @return {!goog.ui.ControlContent} Control content containing the label
 *     and a parenthesized mnemonic hint.
 * @private
 */
controls.MenuMnemonics.generateSeparatedHint_ = function(label, hint,
    baseCssClass, domHelper) {
  var separatorEl = domHelper.createDom(goog.dom.TagName.SPAN,
      goog.getCssName(baseCssClass, 'mnemonic-separator'), '(',
      controls.MenuMnemonics.generateHintElement_(hint, baseCssClass, domHelper),
      ')');
  return [domHelper.createTextNode(label), separatorEl];
};


/**
 * Creates control content containing an inline mnemonic hint (e.g. "_File",
 * where the "_" indicates the F would be underlined).
 *
 * @param {string} label The label to which the hint is being added.
 * @param {string} hint The hint character.
 * @param {number} index The index in the label at which the mnemonic hint
 *     should appear.
 * @param {string} baseCssClass The base CSS class.
 * @param {goog.dom.DomHelper} domHelper The DOM helper.
 * @return {!goog.ui.ControlContent} Control content containing the label with
 *     an inline mnemonic hint.
 * @private
 */
controls.MenuMnemonics.generateInlineHint_ = function(label, hint, index,
    baseCssClass, domHelper) {
  var content = [];

  var firstSegment = label.substr(0, index);
  var secondSegment = label.substr(index + 1, label.length);

  if (firstSegment.length > 0) {
    content.push(domHelper.createTextNode(firstSegment));
  }
  content.push(controls.MenuMnemonics.generateHintElement_(hint, baseCssClass,
      domHelper));
  if (secondSegment.length > 0) {
    content.push(domHelper.createTextNode(secondSegment));
  }
  return content;
};


/**
 * Creates the hint SPAN.
 * @param {string} hint The hint character.
 * @param {string} baseCssClass The base CSS class.
 * @param {goog.dom.DomHelper} domHelper The DOM helper.
 * @return {!Element} A span element wrapping the mnemonic character.
 * @private
 */
controls.MenuMnemonics.generateHintElement_ = function(hint, baseCssClass,
    domHelper) {
  return domHelper.createDom(goog.dom.TagName.SPAN,
      goog.getCssName(baseCssClass, 'mnemonic-hint'), hint);
};
