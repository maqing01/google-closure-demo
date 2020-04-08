

/**
 * @fileoverview Provides helper functions for Closure's tracers.
 * @author agrieve@google.com (Andrew Grieve)
 * @author davidhu@google.com (David Hu)
 */

goog.provide('wireless.debug.traceutil');

goog.require('goog.debug.Console');
goog.require('goog.debug.RelativeTimeProvider');
goog.require('goog.debug.Trace');
goog.require('wireless.debug');
goog.require('wireless.debug.LogConsole');
goog.require('wireless.debug.TextConsole');



// The existence of the function definitions in this scope is a little hacky but
// it is here to work around access controls warnings due to us accessing
// private members of good.debug.Trace_.
goog.scope(function() {
  var Trace = goog.debug.Trace_;


  /**
   * @param {number} id The tracer id.
   * @return {goog.debug.Trace_.Event_} The event.
   */
  Trace.prototype.getOutstandingEvent = function(id) {
    return /** @type {goog.debug.Trace_.Event_} */ (
            this.outstandingEvents_.get(id));
  };


  /**
   * @return {goog.structs.Map} The outstanding events.
   */
  Trace.prototype.getOutstandingEvents = function() {
    return this.outstandingEvents_;
  };


  /**
   * @return {Array.<goog.debug.Trace_.Event_>} The events.
   */
  Trace.prototype.getEvents = function() {
    return this.events_;
  };
});


/**
 * The minimum number of milliseconds that an action must take for it to be
 * reported in trace output.
 * @type {number}
 * @private
 */
//  Setting this to non-zero messes up the nesting of comments.
//     This should be fixed in Closure.
wireless.debug.traceutil.TRACE_THRESHOLD_ = 0;


/**
 * The maximum number of lines from previous traces to buffer. This is used
 * to prevent traces mismatches start/stop traces from causing prevTraceOutput_
 * to grow indefinitely.
 * @type {number}
 * @private
 */
wireless.debug.traceutil.MAX_OUTSTANDING_TRACE_SIZE_ = 300;


/**
 * The output of the previous logging of the the trace.
 * @type {(Array.<string>|undefined)}
 */
wireless.debug.traceutil.prevTraceOutput_;


/**
 * The console for the tracer output.
 * @type {!wireless.debug.TextConsole|undefined}
 */
wireless.debug.traceutil.traceConsole;


/**
 * Whether to allow extended output.
 * @type {boolean|undefined}
 * @private
 */
wireless.debug.traceutil.extendedOutput_;


/**
 * Creates and returns a TracerDivConsole.
 * @param {HTMLElement=} opt_detailsDiv Div containing build details.
 * @param {function(string)=} opt_onEmailCallBack Function to call when the
 *     email link is clicked. If not specified, the email link will be hidden.
 * @return {!wireless.debug.TextConsole} The text console.
 */
wireless.debug.traceutil.makeTracerConsole =
    function(opt_detailsDiv, opt_onEmailCallBack) {
  var lazyConsole = new wireless.debug.TextConsole('Tracers',
      opt_onEmailCallBack);
  lazyConsole.addLink('Refresh', wireless.debug.traceutil.flushTracers);
  lazyConsole.setOnExpandCallback(wireless.debug.traceutil.flushTracers);

  wireless.debug.traceutil.traceConsole = lazyConsole;
  // Log the start-up details.
  if (opt_detailsDiv) {
    wireless.debug.traceutil.addTraceLog(
        wireless.dom.getText(opt_detailsDiv));
  }
  return lazyConsole;
};


/**
 * Initialize tracing facilities.
 * @param {boolean|undefined} opt_extended Whether to allow extended tracer
 * output.
 */
wireless.debug.traceutil.initTracing = function(opt_extended) {
  if (!wireless.debug.STRIP_TRACERS) {
    wireless.debug.traceutil.setExtendedOutput(opt_extended);
  }
};


/**
 * Set whether to output previous tracer results and additional tracer
 * information along with the new output.
 * @param {boolean|undefined} enable Whether to enable extended output.
 */
wireless.debug.traceutil.setExtendedOutput = function(enable) {
  if (!wireless.debug.STRIP_TRACERS) {
    wireless.debug.traceutil.extendedOutput_ = enable;
  }
};


/**
 * Sets the default RelativeTimeProvider instance (which is used for timestamps)
 * to use a more accurate start time.
 * @param {number} startTime The more accurate start time as a Unix timestamp.
 */
wireless.debug.traceutil.initAppUpTime = function(startTime) {
  if (!wireless.debug.STRIP_TRACERS) {
    goog.debug.RelativeTimeProvider.getDefaultInstance().set(startTime);
    goog.debug.Trace.initCurrentTrace(
        wireless.debug.traceutil.TRACE_THRESHOLD_);
    goog.debug.Trace.setStartTime(startTime);
  }
};


/**
 * Same as goog.debug.Trace.startTracer(), but uses the given time as the start
 * time for the event.
 * @param {string} description .
 * @param {number} time Start time in milliseconds.
 * @return {number|undefined} The tracer id.
 */
wireless.debug.traceutil.startTracerWithCustomStartTime =
    function(description, time) {
  if (!wireless.debug.STRIP_TRACERS) {
    var tracer = goog.debug.Trace.startTracer(description);
    // A bit of hackery to set the start time for the trace.
    var startEvent = goog.debug.Trace.getOutstandingEvent(tracer);
    startEvent.startTime = time;
    startEvent.eventTime = time;
    return tracer;
  }
};


/**
 * Logs the given message to the tracer div console.
 * @param {string} message .
 */
wireless.debug.traceutil.addTraceLog = function(message) {
  if (!wireless.debug.STRIP_TRACERS &&
      wireless.debug.traceutil.traceConsole) {
    wireless.debug.traceutil.traceConsole.addMessage(message);
  }
};


/**
 * Returns the tracer output with some cruft removed.
 * @return {string} .
 * @private
 */
wireless.debug.traceutil.getAndNormalizeTracerOutput_ = function() {
  var lines = goog.debug.Trace.getFormattedTrace().split('\n');
  if (!wireless.debug.traceutil.extendedOutput_) {
    // Don't re-print output from previous trace.
    var prevTrace = wireless.debug.traceutil.prevTraceOutput_ || [];
    for (var i = 0, il = lines.length; i < il; ++i) {
      if (prevTrace[i] != lines[i]) {
        break;
      }
    }
    var firstNewLineIndex = i;
    // - 6 to strip off the tracer status output.
    var lastNewLineIndex = il - 6;
    for (var i = lastNewLineIndex; i >= firstNewLineIndex; --i) {
      if (lines[i] == ' Unstopped:') {
        lastNewLineIndex = i;
        break;
      }
    }
    wireless.debug.traceutil.prevTraceOutput_ =
        lines.slice(0, lastNewLineIndex);
    lines = lines.slice(firstNewLineIndex, lastNewLineIndex);
  }
  return lines.join('\n');
};


/**
 * Logs out any finished tracers and clears the records of them.
 */
wireless.debug.traceutil.flushTracers = function() {
  if (!wireless.debug.STRIP_TRACERS) {
    if (goog.debug.Trace.getEvents().length) {
      var output =
          wireless.debug.traceutil.getAndNormalizeTracerOutput_();
      if (output) {
        wireless.debug.traceutil.addTraceLog(output);
        var prevTrace = wireless.debug.traceutil.prevTraceOutput_ || [];
        // Only clear traces if none are outstanding.
        if (goog.debug.Trace.getOutstandingEvents().isEmpty() ||
            prevTrace.length >
            wireless.debug.traceutil.MAX_OUTSTANDING_TRACE_SIZE_) {
          prevTrace.length = 0;
          goog.debug.Trace.initCurrentTrace(
              wireless.debug.traceutil.TRACE_THRESHOLD_);
        }
      }
    }
  }
};
