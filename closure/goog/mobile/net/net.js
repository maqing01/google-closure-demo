goog.provide('wireless.net');


/**
 * @return {boolean}
 */
wireless.net.isOnline = function() {
  return navigator.onLine !== false;
};
