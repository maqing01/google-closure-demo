

/**
 * @fileoverview A lightweight replacement for goog.module.ModuleManager. This
 *     class is made much lighter by not supporting asynchronous loading of
 *     modules.
 *     There only function in this file that is meant to be called directly is
 *     SimpleModuleManager.load(). The goog.module.ModuleManager class exists
 *     only because the name is hard-coded in the module compiler (in
 *     DefaultModuleSetCompiler.java) and it is a lot of work to make that
 *     configurable. Clients will have to ensure that Closure's version of
 *     goog.module.ModuleManager is not compiled together with this file as
 *     conflicts will occur.
 *
 * @author Andrew Grieve (agrieve@google.com)
 */

// The first provide is needed to create the goog.module namespace.
// The second is the one that clients should goog.require.
goog.provide('goog.module.ModuleManagerOverride');
goog.provide('webapps.common.SimpleModuleManager');

goog.require('goog.asserts');
goog.require('goog.debug.Trace');
goog.require('goog.log');
goog.require('goog.object');
goog.require('wireless.dom');



/**
 * A lightweight version of Closure's ModuleManager that supports only
 * synchronous loading of embedded modules.
 * @constructor
 */
goog.module.ModuleManager = function() {
  /**
   * Map of module id -> dependent modules.
   * @type {Object.<!Array.<string>>|undefined}
   */
  this.moduleDepsMap_;


  /**
   * A set of valid module IDs. Used only when asserts are enabled.
   * @type {Object.<boolean>|undefined}
   */
  this.validModuleIds_;
};


/**
 * This define must match the value defined in
 * webapps/jscompile/JsModuleCompiler.java.
 * @type {!RegExp}
 * @private
 */
goog.module.ModuleManager.BLOCK_COMMENT_REPLACEMENT_REGEX_ = /[\b][\b]/g;


/**
 * @type {goog.log.Logger}
 * @private
 */
goog.module.ModuleManager.prototype.logger_ =
    goog.log.getLogger('webapps.common.SimpleModuleManager');


/**
 * The singleton instance.
 * @type {!goog.module.ModuleManager}
 */
goog.module.ModuleManager.instance = new goog.module.ModuleManager();


/**
 * @return {!goog.module.ModuleManager} The singleton instance.
 */
goog.module.ModuleManager.getInstance = function() {
  return goog.module.ModuleManager.instance;
};


/**
 * @param {!Object.<!Array.<string>>} moduleDepsMap Map of module
 *     id -> dependent modules.
 */
goog.module.ModuleManager.prototype.setAllModuleInfo = function(moduleDepsMap) {
  this.moduleDepsMap_ = moduleDepsMap;
  if (goog.asserts.ENABLE_ASSERTS) {
    this.validModuleIds_ =
        goog.object.createSet(goog.object.getKeys(moduleDepsMap));
  }
};


/**
 * Sets the module info for all modules. Should only be called once.
 * This is mostly a copy/paste of Closure's
 * goog.module.ModuleManager.prototype.setAllModuleInfoString
 * @see {com.google.javascript.modules.DefaultModuleSetCompiler}
 *
 * @param {string} opt_info A string representation of the module dependency
 *      graph, in the form: module1:dep1,dep2/module2:dep1,dep2 etc.
 *      Where depX is the base-36 encoded position of the dep in the module
 *      list.
 * @param {Array.<string>=} opt_loadingModuleIds A list of moduleIds that
 *     are currently being loaded.
 */
goog.module.ModuleManager.prototype.setAllModuleInfoString = function(
    opt_info, opt_loadingModuleIds) {
  // The call to this method is generated in two steps, the argument is added
  // after some of the compilation passes.  This means that the initial code
  // doesn't have any arguments and causes compiler errors.  We make it
  // optional to satisfy this constraint.
  goog.asserts.assert(opt_info,
      'setAllModuleInfoString() is missing its parameter.');

  var modules = opt_info.split('/');
  var moduleIds = [];
  var map = {};

  // Split the string into the infoMap of id->deps
  for (var i = 0, moduleStr; moduleStr = modules[i++]; ) {
    var parts = moduleStr.split(':');
    var id = parts[0];
    var deps = parts[1] ? parts[1].split(',') : [];
    for (var j = 0, dep; dep = deps[j]; ++j) {
      var index = parseInt(dep, 36);
      goog.asserts.assert(
          moduleIds[index], 'No module @ %s, dep of %s @ %s', index, id, i);
      deps[j] = moduleIds[index];
    }
    moduleIds.push(id);
    map[id] = deps;
  }
  this.setAllModuleInfo(map);
};


/**
 * Dummy function that is called by the dynamic modules post-code.
 * @see {com.google.javascript.modules.DefaultModuleSetComiler}
 * @param {string} id The module id.
 */
goog.module.ModuleManager.prototype.setLoaded = function(id) {
  // Remove the source tags from the document to save memory (in theory).
  var scriptNode = goog.module.ModuleManager.getModuleElement_(id);
  goog.dom.removeNode(scriptNode);
  // Delete it from the dependency map so that we won't try and load it again.
  delete this.moduleDepsMap_[id];
  goog.log.info(this.logger_, 'Successfully loaded module ' + id);
};


/**
 * Dummy function that is called by the dynamic modules pre-code.
 * @see {com.google.javascript.modules.DefaultModuleSetComiler}
 * @param {string} id The module id.
 */
goog.module.ModuleManager.prototype.beforeLoadModuleCode = goog.nullFunction;


/**
 * Dummy function that is called by the dynamic modules post-code.
 * @see {com.google.javascript.modules.DefaultModuleSetComiler}
 * @param {string} id The module id.
 */
goog.module.ModuleManager.prototype.afterLoadModuleCode = goog.nullFunction;


/**
 * @param {string} id The module id.
 * @return {boolean} Returns whether the module is already loaded.
 * @private
 */
goog.module.ModuleManager.prototype.isLoaded_ = function(id) {
  goog.asserts.assert(this.validModuleIds_[id], 'Invalid module id: %s', id);
  return !this.moduleDepsMap_[id];
};


/**
 * Ensures that the given module is loaded, as well as all of its dependencies.
 * @param {string} id The module to load.
 * @param {boolean} opt_ignoreIfMissing Whether we assert if module is missing.
 * @return {boolean} True if module was loaded, false if it was missing.
 * @private
 */
goog.module.ModuleManager.prototype.load_ = function(id, opt_ignoreIfMissing) {
  goog.asserts.assert(this.validModuleIds_[id], 'Invalid module id: %s', id);
  if (this.moduleDepsMap_[id]) {
    var modulesToLoad = this.getNotYetLoadedTransitiveDepIds_(id);
    return this.doLoadModules_(modulesToLoad, opt_ignoreIfMissing);
  } else {
    goog.log.fine(this.logger_, 'Module "' + id + '" already loaded.');
    return false;
  }
};


/**
 * @param {string} id The id of a not-yet-loaded module.
 * @return {Node} The node that contains the given module's code (if present).
 * @private
 */
goog.module.ModuleManager.getModuleElement_ = function(id) {
  return document.getElementById('module_' + id);
};

/**
 * @param {string} id The id of a not-yet-loaded module.
 * @return {?Node} The node that contains the given module's code (if present).
 * @private
 */
goog.module.ModuleManager.getCssElement_ = function(id) {
  return document.getElementById('css_' + id);
};


/**
 * Builds a list of the ids of the not-yet-loaded modules that a particular
 * module transitively depends on, including itself.
 * @param {string} id The id of a not-yet-loaded module.
 * @return {!Array.<string>} An array of module ids in dependency order that's
 *     guaranteed to end with the provided module id.
 * @private
 */
goog.module.ModuleManager.prototype.getNotYetLoadedTransitiveDepIds_ =
    function(id) {
  // This is pretty much a copy/paste of the same function in Closure's
  // ModuleManager.
  var ret = [id];
  var depIds = this.moduleDepsMap_[id].concat();
  var depId;
  while (depId = depIds.pop()) {
    var subDeps = this.moduleDepsMap_[depId];
    // Dependency info is deleted when a module is loaded.
    if (subDeps) {
      ret.unshift(depId);
      // We need to process direct dependencies first.
      Array.prototype.unshift.apply(depIds, this.moduleDepsMap_[depId]);
    }
  }
  goog.array.removeDuplicates(ret);
  return ret;
};


/**
 * Loads and executes the code for the given module IDs.
 * @param {!Array.<string>} ids The module IDs.
 * @param {boolean} opt_ignoreIfMissing Whether we assert if module is missing.
 * @return {boolean} True if modules were loaded, false if they were missing.
 * @private
 */
goog.module.ModuleManager.prototype.doLoadModules_ =
    function(ids, opt_ignoreIfMissing) {
  goog.log.info(this.logger_, 'Loading Modules: ' + ids);
  var tracer = goog.debug.Trace.startTracer('' + ids);
  var jsCode = [];
  var cssCode = [];
  var lastCssCodeElem;
  var isMissingModules;
  for (var i = 0, id; id = ids[i]; i++) {
    goog.asserts.assert(this.validModuleIds_[id], 'Invalid module id: %s', id);
    // It will not be in the map if it's already loaded.
    if (this.moduleDepsMap_[id]) {
      //goog.debug.Trace.addComment('Start extracting from script tag - ' + id);
      var jsCodeElem = goog.module.ModuleManager.getModuleElement_(id);
      var cssCodeElem = goog.module.ModuleManager.getCssElement_(id);
      if (!jsCodeElem) {
        isMissingModules = true;
        if (opt_ignoreIfMissing) {
          goog.log.info(this.logger_, 'Module ' + id + ' is missing.');
          continue;
        }
      }
      goog.asserts.assert(jsCodeElem,
          'Could not find embedded js code for: %s', id);
      jsCode.push(this.stripOutBlockComment_(jsCodeElem.innerHTML));
      if (cssCodeElem) {
        // Apply the style.
        cssCode.push(this.stripOutBlockComment_(cssCodeElem.innerHTML));
        lastCssCodeElem = cssCodeElem;
      }
    }
  }
  //goog.debug.Trace.addComment('Start combining.');
  jsCode = jsCode.join(';');
  //goog.debug.Trace.addComment('Start fixing up */ placeholders.');
  jsCode = jsCode.replace(
      goog.module.ModuleManager.BLOCK_COMMENT_REPLACEMENT_REGEX_, '*/');
  cssCode = cssCode.join(' ');
  cssCode = cssCode.replace(
      goog.module.ModuleManager.BLOCK_COMMENT_REPLACEMENT_REGEX_, '*/');
  // This gives the script an entry in Chrome's web inspector.
  jsCode += '\n//@ sourceURL=' + ids + '.js';
  //goog.debug.Trace.addComment('Start of eval (' + ~~(jsCode.length / 1024) +
  //    'kb)');
  goog.globalEval(jsCode);
  if (lastCssCodeElem) {
    lastCssCodeElem.innerHTML = cssCode;
  }
  goog.debug.Trace.stopTracer(tracer);
  goog.log.info(this.logger_, 'Done Loading: ' + ids);
  return !isMissingModules;
};


/**
 * Strips the block comment \/*<text>*\/ from the content.
 * @param {string} content The content to strip out the block comment from.
 * @return {string} The content with the block comment stripped.
 * @private
 */
goog.module.ModuleManager.prototype.stripOutBlockComment_ =
    function(content) {
  var startIndex = content.indexOf('/') + 2;    // +2 for char after /*
  var endIndex = content.lastIndexOf('/') - 1;  // -1 for char before */
  return content.substring(startIndex, endIndex);
};


/**
 * Ensures that the given module is loaded, as well as all of its dependencies.
 * @param {string} id The module to load.
 * @param {boolean} opt_ignoreIfMissing False to assert if module is missing.
 * @return {boolean} True if module was loaded, false if it was missing.
 */
webapps.common.SimpleModuleManager.load = function(id, opt_ignoreIfMissing) {
  return goog.module.ModuleManager.getInstance().load_(id, opt_ignoreIfMissing);
};


/**
 * @param {string} id The module id.
 * @return {boolean} Returns whether the module is already loaded.
 */
webapps.common.SimpleModuleManager.isLoaded = function(id) {
  return goog.module.ModuleManager.getInstance().isLoaded_(id);
};


/**
 * @param {string} id The module id.
 * @return {boolean} Returns whether the module is available in the page.
 */
webapps.common.SimpleModuleManager.isModuleAvailable = function(id) {
  return !!goog.module.ModuleManager.getModuleElement_(id);
};

