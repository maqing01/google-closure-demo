goog.provide('apps.action.Property');

goog.require('goog.events');

/**
 * An enumeration of common apps.action.Action property keys.
 * <ul>
 * <li>ARIA_LABEL: A label to use as an ARIA label for a11y. Menu items created
 *     for actions which have this property set will have an 'arial-label'
 *     property set.
 * <li>ENABLED: Whether the action is enabled (boolean).
 * <li>FORCE_CTRL_KEY: If true, the Ctrl key should not be substituted with
 *     other keys on alternate platforms for keyboard shortcuts (boolean).
 * <li>HINT: The UI tooltip text (string).
 * <li>ICON: The UI icon URL (string).
 * <li>KEYS: A keyboard shortcut suitable for
 *     goog.ui.KeyboardShortcutHandler (string).
 * <li>KEYS_ENABLED: Whether a keyboard shortcut should be considered enabled.
 * <li>KEYS_VISIBLE: Whether a keyboard shortcut should be visible.
 * <li>LABEL: The UI label (string|!Node). Using Node as a label is discouraged
 *     as the logic to underline mnemonic keys will not work.
 * <li>MNEMONIC: The keyboard mnemonic (string). Only applicable for menu items.
 * <li>REQUIRE_DIRECT_TARGET: Whether actions fired on children should be
 *     prevented from also causing this action to be fired because of (for
 *     example) menu event bubbling. This property is intended to prevent
 *     unexpected consequences where an action bound to a parent of a submenm
 *     item would otherwise get triggered when the submenu item itself is
 *     selected.
 * <li>RADIO: Whether the action is part of a selectable group (at most one
 *     of the actions should be selected at a time). The UI should prevent
 *     deselecting these items.
 * <li>SELECTED: The item is selected or checked (boolean).
 * <li>VALUE: The value of the action (*).
 * <li>VISIBLE: Whether UI associated with the action (if any) should be
 *     displayed (boolean).
 * </ul>
 *
 * @enum {string}
 */
apps.action.Property = {
  ARIA_LABEL: goog.events.getUniqueId('aria-label'),
  ENABLED: goog.events.getUniqueId('enabled'),
  FORCE_CTRL_KEY: goog.events.getUniqueId('force-ctrl-key'),
  HINT: goog.events.getUniqueId('hint'),
  ICON: goog.events.getUniqueId('icon'),
  KEYS: goog.events.getUniqueId('keys'),
  KEYS_ENABLED: goog.events.getUniqueId('keys-enabled'),
  KEYS_VISIBLE: goog.events.getUniqueId('keys-visible'),
  LABEL: goog.events.getUniqueId('label'),
  MNEMONIC: goog.events.getUniqueId('mnemonic'),
  REQUIRE_DIRECT_TARGET: goog.events.getUniqueId('require_direct_target'),
  RADIO: goog.events.getUniqueId('radio'),
  SELECTED: goog.events.getUniqueId('selected'),
  VALUE: goog.events.getUniqueId('value'),
  VISIBLE: goog.events.getUniqueId('visible')
};
