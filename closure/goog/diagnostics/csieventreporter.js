/**
 * @fileoverview Contains the implementation of a class to handle CSI timers.
 */

goog.provide('apps.diagnostics.CsiEventReporter');

goog.require('goog.net.XhrIo');



/**
 * A class for sending CSI reports.
 * @param {string=} opt_reportUri An optional reporting URI. If not specified,
 *     the CSI library's default will be used.
 * @param {apps.diagnostics.CsiEventReporter.ReportingStrategy=}
 *     opt_reportingStrategy How the CSI reports should be delivered. If not
 *     specified, CSI default submission will be used.
 * @constructor
 */
apps.diagnostics.CsiEventReporter = function(
    opt_reportUri, opt_reportingStrategy) {
  /**
   * @private {?string}
   */
  this.reportUri_ = opt_reportUri || null;

  /**
   * @private {!apps.diagnostics.CsiEventReporter.ReportingStrategy}
   */
  this.reportingStrategy_ = opt_reportingStrategy ||
      apps.diagnostics.CsiEventReporter.ReportingStrategy.CSI_OBJECT;
};


/**
 * Ways in which reports can be delivered to CSI.
 * @enum {string}
 */
apps.diagnostics.CsiEventReporter.ReportingStrategy = {
  CSI_OBJECT: 'rs-csi',
  XHR: 'rs-xhr',
  IMPORT_SCRIPTS: 'rs-is'
};


/**
 * Report a list of events to CSI. If an event's CSI code is included multiple
 * times, only the last will be reported.
 * @param {string} timerName The timer name to report.
 * @param {!Array.<Object>} events The events to report.
 * @param {number} startTime The start time relative to the events.
 * @param {boolean} includesServerResponseTime Whether the event time already
 *     includes server response time.
 * @param {!Object=} opt_csiParameters An optional map of additional parameters
 *     to add to the report.
 * @param {string=} opt_serviceName An optional service name to set for the
 *     report. The original service name will be restored after this report.
 * @return {boolean} Whether the global CSI object was found, and the report
 *     attempted.
 */
apps.diagnostics.CsiEventReporter.prototype.reportEvents = function(
    timerName, events, startTime, includesServerResponseTime, opt_csiParameters,
    opt_serviceName) {
  var csiObject = this.findCsiObject_();
  if (!csiObject) {
    return false;
  }

  var initialServiceName = csiObject['sn'];
  if (opt_serviceName) {
    csiObject['sn'] = opt_serviceName;
  }

  var timer = new csiObject['Timer'](startTime);
  timer['name'] = timerName;

//  for (var i = 0; i < events.length; i++) {
//    var eventCode = events[i][0];
//    var eventTime = events[i][1];
//    // Add ticks for every event in the CSI timer.
//    if (includesServerResponseTime) {
//      timer.tick('_start', undefined, startTime);
//      timer.tick(eventCode, '_start', startTime + eventTime);
//    } else {
//      timer.tick(eventCode, undefined, startTime + eventTime);
//    }
//  }

  if (csiObject.getNavTiming) {
    csiObject.getNavTiming(timer);
  }

//  var Strategy = apps.diagnostics.CsiEventReporter.ReportingStrategy;
//  switch (this.reportingStrategy_) {
//    case Strategy.CSI_OBJECT:
//      csiObject.report(
//          timer, opt_csiParameters, this.reportUri_ || undefined);
//      break;
//    case Strategy.XHR:
//      var fullReportUri = csiObject.getReportUri(
//          timer, opt_csiParameters, this.reportUri_ || undefined);
//      goog.net.XhrIo.send(fullReportUri, undefined /* opt_callback */, 'POST');
//      break;
//    case Strategy.IMPORT_SCRIPTS:
//      var fullReportUri = csiObject.getReportUri(
//          timer, opt_csiParameters, this.reportUri_ || undefined);
//      try {
//        goog.global.importScripts(fullReportUri);
//      } catch (e) {
//        // importScripts will throw if the script can't be loaded.
//      }
//      break;
//  }

  // If the service name was replaced, it should be set back.
  if (opt_serviceName) {
    csiObject['sn'] = initialServiceName;
  }

  return true;
};


/**
 * @return {boolean} Whether CSI reporting is available.
 */
apps.diagnostics.CsiEventReporter.prototype.isCsiAvailable = function() {
  return !!this.findCsiObject_();
};


/**
 * Finds the CSI object if one is available.
 * @return {Object} The CSI object, or null if none is available.
 * @private
 */
apps.diagnostics.CsiEventReporter.prototype.findCsiObject_ = function() {
  var csiObject = goog.global['jstiming'];
  if (!csiObject) {
    return null;
  }

  // 'getReportUri' is only needed for non-CSI-object reporting.
  var strategy = apps.diagnostics.CsiEventReporter.ReportingStrategy;
  if (this.reportingStrategy_ != strategy.CSI_OBJECT &&
      !csiObject['getReportUri']) {
    if (goog.DEBUG && goog.global['getReportUri']) {
      // In DEBUG mode there is no compilation and no way to set
      // DEF_INCLUDE_FUNCTION_GETREPORTURI and therefore no way to have CSI
      // automatically export getReportUri. Because it's not compiled
      // getReportUri is globally exported and not on the timing object -- add
      // a reference to it.
      csiObject['getReportUri'] = goog.global['getReportUri'];
    } else {
      return null;
    }
  }

  return csiObject;
};
