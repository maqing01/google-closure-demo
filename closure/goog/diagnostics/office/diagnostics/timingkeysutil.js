

/**
 * @fileoverview Utility class for timing keys.

 */


goog.provide('office.diagnostics.TimingKeysUtil');

goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('goog.object');


/**
 * Returns the list of timing keys typically expected to be reported by an
 * editor.
 * @param {boolean} maybeOptedIn Whether the user might be opted into offline.
 * @param {boolean} isColdStartOffline Whether this is the cold start offline
 *     variant of the application.
 * @param {boolean=} opt_hasTimeToType Whether the application should record
 *     time to type.
 * @param {boolean=} opt_hasWebFonts Whether the application will report
 *     timing keys for web fonts. Defaults to true.
 * @return {!Array.<office.diagnostics.InitialLoadTimingKeys>} The list of
 *     expected editor timing keys.
 */
office.diagnostics.TimingKeysUtil.getEditorInitialTimingKeys = function(
    maybeOptedIn, isColdStartOffline, opt_hasTimeToType, opt_hasWebFonts) {
  var InitialLoadTimingKeys = office.diagnostics.InitialLoadTimingKeys;
  var keys =
      goog.object.createSet(goog.object.getValues(InitialLoadTimingKeys));

  // Model parse time is not required when cold starting.
  if (isColdStartOffline) {
    delete keys[InitialLoadTimingKeys.MODEL_PARSE];
  } else {
    delete keys[InitialLoadTimingKeys.MODEL_READ];
  }

  // The document lock is acquired only if the user is opted into offline.
  delete keys[InitialLoadTimingKeys.LOCK_ACQUISITION_STARTED];
  delete keys[InitialLoadTimingKeys.LOCK_ACQUISITION_COMPLETE];

  // The database is not opened if the user has never opted into offline.
  if (!maybeOptedIn) {
    delete keys[InitialLoadTimingKeys.OPEN_DATABASE_STARTED];
    delete keys[InitialLoadTimingKeys.OPEN_DATABASE_JS_YIELD];
  }

  if (!opt_hasTimeToType) {
    // Content editable and typing enabled can diverge in suggest changes.
    delete keys[InitialLoadTimingKeys.TYPING_ENABLED];
  }

  // The open database complete metric will not be set if the open database
  // request times out.
  delete keys[InitialLoadTimingKeys.OPEN_DATABASE_COMPLETE];

  // The following are only measured if the user edits during basic editable, so
  // they are not required.
  delete keys[InitialLoadTimingKeys.START_FIRST_MODEL_PART_JS_YIELD];
  delete keys[InitialLoadTimingKeys.END_FIRST_MODEL_PART_JS_YIELD];
  delete keys[InitialLoadTimingKeys.FIRST_BASIC_EDIT];

  // This metric is only set when warm starting and if the command writer proxy
  // exists.
  delete keys[InitialLoadTimingKeys.MODEL_PERSIST];

  // This metric is only set by Vodka, if the first async redraw happens before
  // the initial load is complete.
  delete keys[InitialLoadTimingKeys.FIRST_ASYNC_REDRAW];

  if (goog.isDef(opt_hasWebFonts) && !opt_hasWebFonts) {
    delete keys[InitialLoadTimingKeys.WEBFONTS_AVAILABLE];
    delete keys[InitialLoadTimingKeys.WEBFONTS_RENDER];
    delete keys[InitialLoadTimingKeys.WEBFONTS_VARIANTS_AVAILABLE];
  }

  return goog.object.getKeys(keys);
};
