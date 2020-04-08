

/**
 * @fileoverview font install timer class.

 */

goog.provide('office.fonts.FontInstallTimer');

goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.events.EventHandler');



/**
 * Creates an instance of font install timer.
 * This class acts as a global timer for all the font installing tasks.
 * @constructor
 * @extends {goog.Disposable}
 * @struct
 */
office.fonts.FontInstallTimer = function() {
  goog.base(this);

  /**
   * Main timer for the class.
   * @type {!goog.Timer}
   * @private
   */
  this.timer_ = new goog.Timer(office.fonts.FontInstallTimer.INTERVAL_MS);

  /**
   * List of pending tasks.
   * @type {!Array.<!office.fonts.InstallFontTask>}
   * @private
   */
  this.pendingTasks_ = [];

  /**
   * List of run specific completed tasks.
   * @type {!Array.<!office.fonts.InstallFontTask>}
   * @private
   */
  this.completedTasks_ = [];

  /**
   * An event handler.
   * @type {!goog.events.EventHandler.<!office.fonts.FontInstallTimer>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.listen(this.timer_, goog.Timer.TICK, this.run_);
};
goog.inherits(office.fonts.FontInstallTimer, goog.Disposable);


/**
 * The default interval at which to run the pending tasks.
 * @type {number}
 */
office.fonts.FontInstallTimer.INTERVAL_MS = 200;


/**
 * The callback which is called when fonts have been successfully installed.
 * @type {?function(!Array.<!office.fonts.InstallFontTask>)}
 * @private
 */
office.fonts.FontInstallTimer.prototype.callback_ = null;


/**
 * Set the callback function. This should always be done before adding tasks.
 * @param {!function(!Array.<!office.fonts.InstallFontTask>)} callback A callback
 *     function to call when fonts have been successfully installed.
 */
office.fonts.FontInstallTimer.prototype.setCallback = function(callback) {
  this.callback_ = callback;
};


/**
 * Adds new load font task to the list.
 * Start timer if not running already.
 * @param {!office.fonts.InstallFontTask} installFontTask The install font task.
 */
office.fonts.FontInstallTimer.prototype.addTask = function(installFontTask) {
  if (!this.callback_) {
    throw new Error('The callback function must be set before adding tasks ' +
        'to the FontInstallTimer.');
  }
  this.pendingTasks_.push(installFontTask);
  this.timer_.start();
};


/**
 * Removes load font task from the pending fonts.
 * Stop timer if there are no more pending tasks.
 * @param {!office.fonts.InstallFontTask} installFontTask The install font task.
 * @private
 */
office.fonts.FontInstallTimer.prototype.removeTask_ = function(installFontTask) {
  goog.array.remove(this.pendingTasks_, installFontTask);
  if (goog.array.isEmpty(this.pendingTasks_)) {
    this.timer_.stop();
  }
};


/**
 * Runs all the pending tasks and removes completed tasks.
 * @private
 */
office.fonts.FontInstallTimer.prototype.run_ = function() {
  goog.array.clear(this.completedTasks_);
  goog.array.forEach(this.pendingTasks_, this.runTask_, this);
  if (this.completedTasks_.length) {
    this.callback_(this.completedTasks_);
  }
  goog.array.forEach(this.completedTasks_, this.removeTask_, this);
};


/**
 * Runs task.
 * @param {!office.fonts.InstallFontTask} installFontTask The install font task.
 * @private
 */
office.fonts.FontInstallTimer.prototype.runTask_ = function(installFontTask) {
  installFontTask.run();
  if (installFontTask.isCompleted()) {
    this.completedTasks_.push(installFontTask);
  }
};


/**
 * @return {number} number of pending tasks.
 */
office.fonts.FontInstallTimer.prototype.getPendingTaskCountDebugDebug =
    function() {
  return this.pendingTasks_.length;
};


/**
 * Runs all the pending tasks and removes completed tasks.
 */
office.fonts.FontInstallTimer.prototype.runDebugDebug = function() {
  this.run_();
};


/** @override */
office.fonts.FontInstallTimer.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.timer_,
      this.eventHandler_);

  goog.base(this, 'disposeInternal');
};
