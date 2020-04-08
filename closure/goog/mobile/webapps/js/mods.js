

/**
 * @fileoverview Helpers for pinto mods.
 * Since JSTD maintains state between tests, a client-side API for mods is
 * required so that global state is not changed by mods.
 * @author Andrew Grieve (agrieve@google.com)
 */

goog.provide('webapps.mods');

goog.require('goog.asserts');
goog.require('goog.log');



/**
 * @define {boolean} Whether to allow mods to be turned on & off via a
 *     client-side API.
 */
webapps.mods.ENABLE_CLIENT_SIDE_MODS = true;


/**
 * The logger for this package.
 * @type {goog.log.Logger}
 * @private
 */
webapps.mods.logger_ = goog.log.getLogger('webapps.mods');


/**
 * The stored information for each registered mod entry point.
 * @typedef {{applierFunc: function(), unapplierFunc: function()}}
 * @private
 */
webapps.mods.ModInfo_;


/**
 * Map of mod name -> ModInfos. Used only for unit testing.
 * @type {!Object.<!Array.<!webapps.mods.ModInfo_>>}
 * @private
 */
webapps.mods.overrideMap_ = {};


/**
 * Set of mod names that are currently applied. Used only for unit testing.
 * @type {!Object.<number>}
 * @private
 */
webapps.mods.appliedMods_ = {};


/**
 * Registers a function that when called will apply some or all of the overrides
 * for the given mod.
 * @param {string} modName The name of the mod this overridder belongs to.
 * @param {function()} applierFunc The function to call to apply the mod
 *     overrides.
 */
webapps.mods.registerOverrides = function(modName, applierFunc) {
  if (webapps.mods.ENABLE_CLIENT_SIDE_MODS) {
    var overrideMap = webapps.mods.overrideMap_;
    if (!overrideMap[modName]) {
      overrideMap[modName] = [];
    }
    var unapplierFunc = webapps.mods.createUnapplierFunc_(applierFunc);
    var modInfo = {applierFunc: applierFunc, unapplierFunc: unapplierFunc};
    var modInfos = overrideMap[modName];
    modInfos.push(modInfo);
    // Apply it if the mod has already been made active.
    if (webapps.mods.appliedMods_[modName]) {
      applierFunc();
    }
  } else {
    applierFunc();
  }
};


/**
 * Creates a function that will undo the effects of the given applierFunc.
 * @param {function()} applierFunc The function to call to apply the mod
 *     overrides.
 * @return {function()} The created function.
 * @private
 */
webapps.mods.createUnapplierFunc_ = function(applierFunc) {
  var functionAsStr = applierFunc.toString();
  // Get all text within the outer-most {}s. [\s\S] matches all characters.
  var functionBody = /\{([\s\S]*)\}/.exec(functionAsStr)[1];
  var statements = functionBody.split(';');
  var undoInfo = [];
  for (var i = 0; i < statements.length; i++) {
    var statement = statements[i];
    // Strip comments.
    statement = statement.replace(/\/\/.*/, '');
    // Ignore blank lines.
    if (/^\s*$/.exec(statement)) {
      continue;
    }
    // Look for assignment statments.
    var assignMatch = /^([^=]+)=/.exec(statement);
    goog.asserts.assert(assignMatch,
        'Could not understand the mod applier statement: %s\nFunctionAsStr: %s',
        statement, functionAsStr);
    var lhs = assignMatch[1].replace(/\s/g, '');
    var value = goog.getObjectByName(lhs);
    undoInfo.push(lhs, value);
  }
  return function() {
    for (var i = 0; i < undoInfo.length; i += 2) {
      goog.exportSymbol(undoInfo[i], undoInfo[i + 1]);
    }
  };
};


/**
 * Applies the given mod. Used for tests only.
 * @param {string} modName The name of the mod to apply.
 */
webapps.mods.applyModForTests = function(modName) {
  var modInfos = webapps.mods.overrideMap_[modName];
  goog.asserts.assert(modInfos, 'mod not registered: %s', modName);
  goog.log.info(webapps.mods.logger_, 'Applying mod ' + modName + ' (' +
      modInfos.length + ' appliers registered).');
  webapps.mods.appliedMods_[modName] = 1;

  for (var i = 0, modInfo; modInfo = modInfos[i]; i++) {
    modInfo.applierFunc();
  }
};


/**
 * Unapplies all mods. Used for tests only.
 */
webapps.mods.resetForTests = function() {
  for (var modName in webapps.mods.appliedMods_) {
    goog.log.info(webapps.mods.logger_, 'Unapplying mod ' + modName);
    var modInfos = webapps.mods.overrideMap_[modName];
    goog.asserts.assert(modInfos, 'mod not registered: %s', modName);
    for (var i = 0, modInfo; modInfo = modInfos[i]; i++) {
      modInfo.unapplierFunc();
    }
  }
};
