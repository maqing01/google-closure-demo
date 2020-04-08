

/**
 * @fileoverview Defines a class to hold memory stats.

 */

goog.provide('office.diagnostics.MemoryStats');



/**
 * Contains memory statistics.
 * @param {number} jsHeapSizeLimitInMb The heap size limit in MB.
 * @param {number} totalJSHeapSizeInMb The total heap size in MB.
 * @param {number} usedJSHeapSizeInMb The used heap size in MB.
 * @constructor
 * @struct
 */
office.diagnostics.MemoryStats = function(jsHeapSizeLimitInMb,
    totalJSHeapSizeInMb, usedJSHeapSizeInMb) {
  /**
   * The JS heap size limit in MB.
   * @type {number}
   * @private
   */
  this.jsHeapSizeLimitInMb_ = jsHeapSizeLimitInMb;

  /**
   * The total JS heap size in MB.
   * @type {number}
   * @private
   */
  this.totalJSHeapSizeInMb_ = totalJSHeapSizeInMb;

  /**
   * The used JS heap size in MB.
   * @type {number}
   * @private
   */
  this.usedJSHeapSizeInMb_ = usedJSHeapSizeInMb;
};


/**
 * Gets the heap size limit in MB.
 * @return {number} The heap size limit in MB.
 */
office.diagnostics.MemoryStats.prototype.getHeapSizeLimit = function() {
  return this.jsHeapSizeLimitInMb_;
};


/**
 * Gets the total heap size in MB.
 * @return {number} The total heap size in MB.
 */
office.diagnostics.MemoryStats.prototype.getTotalHeapSize = function() {
  return this.totalJSHeapSizeInMb_;
};


/**
 * Gets the used heap size in MB.
 * @return {number} The used heap size in MB.
 */
office.diagnostics.MemoryStats.prototype.getUsedHeapSize = function() {
  return this.usedJSHeapSizeInMb_;
};
