
/**
 * @fileoverview Contains debugging defines.
 * @author davidhu@google.com (David Hu)
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.debug');


/**
 * @define {boolean} Whether loggers should be left out of the build.
 */
wireless.debug.STRIP_LOGGERS = !goog.DEBUG;


/**
 * @define {boolean} Whether tracers should be left out of the build.
 */
wireless.debug.STRIP_TRACERS = !goog.DEBUG;
