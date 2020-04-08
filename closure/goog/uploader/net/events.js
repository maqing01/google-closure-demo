
// All Rights Reserved.

/**
 * @fileoverview Common events and error codes for upload network classes.
 *
 * @author wescarr@google.com (Wes Carr)
 */


goog.provide('apps.uploader.net.EventType');


/**
 * Event names for network events.
 * @enum {string}
 */
apps.uploader.net.EventType = {
  BACKOFF: 'backoff',
  ERROR: 'error',
  PROGRESS: 'progress',
  SUCCESS: 'success'
};
