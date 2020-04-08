

/**
 * @fileoverview Wrappers to hide some details of the ever evolving File API
 *     standard from the rest of the code.
 *      Refactor to using the goog.fs Closure abstractions of
 *     the File API instead of hand-crafting wrappers.

 */

goog.provide('office.localstore.filesystem');


/**
 * Requests a new filesystem.
 * @param {number} type Filesystem type.
 * @param {number} size Filesystem size.
 * @param {function(!FileSystem)} successCallback Callback called with the
 *     created filesystem.
 * @param {function(!FileError)} errorCallback Callback called in case of
 *     an error.
 */
office.localstore.filesystem.requestFileSystem = function(type, size,
    successCallback, errorCallback) {
  if (goog.isDef(goog.global['requestFileSystem'])) {
    goog.global['requestFileSystem'](
        type, size, successCallback, errorCallback);
  } else if (goog.isDef(goog.global['webkitRequestFileSystem'])) {
    goog.global['webkitRequestFileSystem'](
        type, size, successCallback, errorCallback);
  } else {
    throw new Error('File API unsupported');
  }
};
