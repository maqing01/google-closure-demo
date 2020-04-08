goog.provide('office.diagnostics.MemoryStatsCollector');

goog.require('office.diagnostics.MemoryStats');



/**
 * @constructor
 * @struct
 */
office.diagnostics.MemoryStatsCollector = function() {};


/**
 * The number of bytes in a MB.
 * @type {number}
 * @const
 */
office.diagnostics.MemoryStatsCollector.ONE_MB = 1048576;


/**
 * Gets the memory stats if available.  We will get memory stats if
 * the window.performance.memory API exists and the total JS heap size is
 * not zero.
 * @return {office.diagnostics.MemoryStats} A memory stats object or null we
 * were unable to obtain memory stats.
 */
office.diagnostics.MemoryStatsCollector.prototype.getMemoryStats = function() {
  if (goog.global['performance'] && goog.global['performance']['memory']) {
    var memory = goog.global['performance']['memory'];
    if (memory.totalJSHeapSize != 0) {
      return new office.diagnostics.MemoryStats(
          this.roundToMb_(memory.jsHeapSizeLimit),
          this.roundToMb_(memory.totalJSHeapSize),
          this.roundToMb_(memory.usedJSHeapSize));
    }
  }
  return null;
};


/**
 * Gets the rounded value in whole megabytes.
 * @param {number} value The number to round.
 * @return {number} The value round to whole MB.
 * @private
 */
office.diagnostics.MemoryStatsCollector.prototype.roundToMb_ = function(value) {
  return Math.round(value / office.diagnostics.MemoryStatsCollector.ONE_MB);
};
