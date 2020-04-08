goog.provide('wireless.debug.LogConsole');

goog.require('goog.asserts');
goog.require('goog.debug.DivConsole');
goog.require('goog.debug.TextFormatter');
goog.require('goog.log');
goog.require('wireless.debug.CollapsibleConsole');



/**
 * A collapsible console for displaying logs.
 * @constructor
 * @param {function(string)=} opt_onEmailCallback Function to call when the
 *     email link is clicked. If not specified, the email link will be hidden.
 * @param {function(): !goog.debug.LogBuffer=} opt_getDebugBuffer Function to
 *     call to get the debug buffer, defaults to
 *     goog.debug.LogBuffer.getInstance.
 * @param {function(): (!goog.debug.Logger|undefined)=} opt_getDebugLogRoot
 *     Function to call to get the root logger, for listening to events,
 *     defaults to goog.debug.LogManager.getRoot.
 * @param {string=} opt_name Name to display for the log console, or 'Logs' by
 *     default.
 * @extends {wireless.debug.CollapsibleConsole}
 */
wireless.debug.LogConsole = function(opt_onEmailCallback, opt_getDebugBuffer,
    opt_getDebugLogRoot, opt_name) {
  goog.base(this, (!!opt_name ? opt_name : 'Logs'), opt_onEmailCallback);

  /**
   * The (lazily created) div console that holds the logs.
   * @type {goog.debug.DivConsole|undefined}
   * @private
   */
  this.innerConsole_;

  /**
   * The goog.Logger handler function that is registered when the console is
   * expanded.
   * @type {function(!goog.log.LogRecord)}
   * @private
   */
  this.logHandlerFunc_ = goog.bind(this.addLogRecord, this);

  /**
   * The function that returns a logbuffer.
   * @type {function(): goog.debug.LogBuffer}
   * @private
   */
  this.getDebugBuffer_ =
      opt_getDebugBuffer || goog.debug.LogBuffer.getInstance;

  this.getDebugLogRoot_ =
      opt_getDebugLogRoot || goog.debug.LogManager.getRoot;
};
goog.inherits(wireless.debug.LogConsole, wireless.debug.CollapsibleConsole);


/**
 * @override
 */
wireless.debug.LogConsole.prototype.addAllBufferedLogs = function() {
  goog.asserts.assert(this.innerConsole_,
      'Not created yet in addAllBufferedLogs.');
  var buf = [];
  var formatter = this.innerConsole_.getFormatter();
  var outerThis = this;
  this.getDebugBuffer_().forEachRecord(function(logRecord) {
    if (outerThis.recordMatchesFilter_(logRecord)) {
      buf.push(formatter.formatRecord(logRecord));
    }
  });
  // Using a single innerHTML assignment is significantly faster than calling
  // innerConsole.addLogRecord() multiple times.
  this.getInnerElem().innerHTML = buf.length ?
      '<div class=logmsg>' + buf.join('</div><div class=logmsg>') : '';
};


/**
 * @override
 */
wireless.debug.LogConsole.prototype.clear = function(opt_clearBuffer) {
  if (this.innerConsole_) {
    this.innerConsole_.clear();
  }
  if (opt_clearBuffer) {
    this.getDebugBuffer_().clear();
  }
};


/**
 * @override
 */
wireless.debug.LogConsole.prototype.getLogsAsText = function() {
  var formatter = new goog.debug.TextFormatter();
  formatter.showSeverityLevel = true;
  var ret = [];
  this.getDebugBuffer_().forEachRecord(function(record) {
    ret.push(formatter.formatRecord(record));
  });
  return ret.join('');
};


/**
 * Appends the given LogRecord to the console only if it is expanded.
 * @param {!goog.log.LogRecord} logRecord The record to add.
 */
wireless.debug.LogConsole.prototype.addLogRecord = function(logRecord) {
  if (this.isExpanded() && this.recordMatchesFilter_(logRecord)) {
    this.innerConsole_.addLogRecord(logRecord);
  }
};


/**
 * @override
 */
wireless.debug.LogConsole.prototype.setExpanded = function(value) {
  goog.base(this, 'setExpanded', value);

  var logger = this.getDebugLogRoot_();
  if (logger) {
    // Listen for new log messages only when expanded.
    if (value) {
      goog.log.addHandler(logger, this.logHandlerFunc_);
    } else {
      goog.log.removeHandler(logger, this.logHandlerFunc_);
    }
  }
};


/**
 * @param {!goog.log.LogRecord} logRecord The record match.
 * @return {boolean} Whether the given record matches the active filter.
 * @private
 */
wireless.debug.LogConsole.prototype.recordMatchesFilter_ = function(logRecord) {
  var filterRegex = this.activeFilterRegex;
  return !filterRegex || filterRegex.test(logRecord.getLoggerName()) ||
      filterRegex.test(logRecord.getMessage());
};


/**
 * @override
 * @protected
 */
wireless.debug.LogConsole.prototype.lazyCreate = function() {
  goog.asserts.assert(!this.innerConsole_,
      'lazyCreate called when already created.');
  var innerDiv = document.createElement('div');
  this.innerConsole_ = new goog.debug.DivConsole(innerDiv);
  innerDiv.style.fontSize = 'inherit';
  this.setInnerElem(innerDiv);
};
