goog.provide('apps.action.ShortcutsHelpPopup');

goog.require('goog.array');
goog.require('goog.userAgent.keyboard');


/**
 * Array of columns, each column is an array of groups.
 * @typedef {!Array.<!Array.<!apps.action.ShortcutsHelpPopup.Group>>}
 */
apps.action.ShortcutsHelpPopup.Data;


/**
 * Group of title and shortcuts.
 * @typedef {{title: string, shortcuts:
 *     !Array.<apps.action.ShortcutsHelpPopup.Shortcut>}}
 */
apps.action.ShortcutsHelpPopup.Group;


/**
 * An action or two-element array of key and description. If an array, if may
 * contain an optional third, boolean element that will force Ctrl instead of
 * aliasing it to the Cmd symbol for Mac UserAgents.
 * @typedef {apps.action.Action|!Array.<string|boolean>}
 */
apps.action.ShortcutsHelpPopup.Shortcut;


/**
 * @desc A message indicating that a user must pause in between keystrokes
 * rather than typing them at the same time (e.g. "g then r").
 */
apps.action.ShortcutsHelpPopup.MSG_APPS_ACTION_SHORTCUT_STROKE_DELIMITER =
    goog.getMsg('then');


/**
 * Text substitutions to use when on a Mac.
 * @type {Object.<string>}
 */
apps.action.ShortcutsHelpPopup.MAC_ALIASES = {
  'Ctrl': '\u2318',
  'Meta': '\u2318'
};



/**
 * Converts a string keyboard shortcut string into a human readable description.
 * @param {string} keys The shortcut.
 * @param {boolean=} opt_array Whether the description should be returned as an
 *     array of tokens, instead of a space-delimited string.
 * @param {boolean=} opt_forceCtrl Whether to disable the automatic aliasing of
 *     Ctrl to \u2318 for goog.userAgent.keyboard.MAC_KEYBOARD.
 * @return {Array.<string>|string} A human readable description of the shortcut.
 */
apps.action.ShortcutsHelpPopup.makeReadableShortcut =
    function(keys, opt_array, opt_forceCtrl) {
  // Normalize whitespace.
  keys = keys.replace(/[ +]*\+[ +]*/g, '+').replace(/[ ]+/g, ' ');

  var tokens = goog.array.map(keys.match(/[+ ]|[^+ ]+/g), function(token) {
    // If the token is a single space then it's part of a two stroke keyboard
    // shortcut that must be joined by a token indicating separation ("then" vs
    // "+").
    token = (token == ' ') ?
        apps.action.ShortcutsHelpPopup.
            MSG_APPS_ACTION_SHORTCUT_STROKE_DELIMITER :
        token;

    var alias = ((!opt_forceCtrl || token != 'Ctrl') &&
        goog.userAgent.keyboard.MAC_KEYBOARD) ?
            apps.action.ShortcutsHelpPopup.MAC_ALIASES[token] :
            '';
    return alias || token;
  });

  return opt_array ? tokens : tokens.join(' ');
};
