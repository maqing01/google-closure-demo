goog.provide('office.clipboard.MimeClipboard');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');



/**
 * MIME Clipboard interface. A MIME clipboard allows storing and retrieving
 * clips with a specified MIME type and arbitrary content. Clip data is
 * typically accessed in an asynchronous fashion using goog.async.Deferred
 * result objects.
 *
 * The clip stored on a clipboard may change unexpectedly (e.g. due to
 * incoming events) when executing an series of asynchronous steps on the
 * clipboard. To ensure the clip being accessed does not change during use
 * of the clipboard the class uses /clip handles/. With a clip handle one
 * can keep addressing a specific clipboard state throughout a transaction
 * consisting of several asynchronous steps. Note that when a clip handle is
 * used, it is the responsibility of the caller to call finish() with the
 * handle after it is no longer needed. This frees any resources (data
 * structures, pending RPCs) associated with the clip state addressed by the
 * handle.
 *
 * Applications typically need to manage the same clip in many formats (plain
 * text, HTML, application-specific). To help deciding whether the clip data on
 * two clipboards represent the same logical clip (but in different formats),
 * the class provides the ability to match clips using so-called digests. A clip
 * /digest/ is an identifier for the logical content of the clip, such as e.g. a
 * hash of the unformatted text content of a clip, or some unique string
 * embedded in clips that are logically the same. The class provides a
 * getDigests() method to obtain clip digests, and a getClipHandle() method to
 * look up a handle to a clip that matches a given digest.
 *
 * To get a feel how clips, handles, and digests work together, consider the
 * following example, where SampleClipboard is a MimeClipboard capable of
 * holding several clips simultaneously in text and HTML mimetypes. For the
 * sake of brevity, we access results of getClip as if they were synchronous,
 * and omit the package part of the class names.
 *
 * var TEXT_MIME = 'text/plain';
 * var HTML_MIME = 'text/html';
 * var HTML = '<p>Hello World</p>';
 * var TEXT = 'Hello World';
 * var TEXT_HASH = goog.string.hashCode(TEXT); // Hash code of TEXT
 *
 * var clipboard = new SampleClipboard();
 *
 * // We can set the current clip to text and html
 * clipboard.setClip(new Clip(TEXT_MIME, TEXT));
 * clipboard.setClip(new Clip(HTML_MIME, HTML));
 *
 * // getClip will return the most recent clip.
 * assertEquals(clipboard.getClip(HTML_MIME), HTML);
 * // The most recent clip is of type HTML, so retreiving
 * // type TEXT yields nothing
 * assertNull(clipboard.getClip(TEXT_MIME));
 *
 * // What if HTML and TEXT are different representations of the same
 * // logical clip? In this case we store both clips using the same
 * // clip handle to indicate this relationship.
 * var handle = clipboard.newClipHandle();
 * clipboard.setClip(new Clip(TEXT_MIME, TEXT, handle));
 * clipboard.setClip(new Clip(HTML_MIME, HTML, handle));
 *
 * // Now we can retrieve both representations
 * assertEquals(clipboard.getClip(HTML_MIME, handle), HTML);
 * assertEquals(clipboard.getClip(TEXT_MIME, handle), TEXT);
 *
 * // We may obtain a "fingerprint" of the logical clip using getDigests
 * assertEquals(clipboard.getDigests(handle),
 *     [new Digest(DigestType.TEXT_HASH, TEXT_HASH)]);
 *
 * // Once done reading/writing on this handle, we finish it
 * clipboard.finish(handle);
 *
 * // Suppose we want to paste the above clip as HTML in our app,
 * // but only if it matches what is currently on the system clipboard
 * // to be consistent with how the operating system paste command works.
 * // One option would be to loop over all clips on clipboard comparing
 * // the clips to the system clipboard. This is however not efficient,
 * // in particular if the clipboard is implemented with a server component
 * // for storing clips.
 * // Instead we can query the clipboard for a logical clip matching a given
 * // "fingerprint", i.e. Digest. The different representations of the
 * // logical clip will then appear in the context of the returned handle.
 * var systemClipboardHash = goog.string.hashCode(
 *     systemClipboard.getTextContent());
 * var matchingClipsHandle = clipboard.getClipHandle(
 *     [new Digest(DigestType.TEXT_HASH, systemClipboardHash)]);
 *
 * // matchingClipsHandle then allows access to both representations
 * assertEquals(clipboard.getClip(HTML_MIME, matchingClipsHandle), HTML);
 * assertEquals(clipboard.getClip(TEXT_MIME, matchingClipsHandle), TEXT);
 *
 * For a more detailed description, including further examples, see
 * go/office-unified-clipboard
 *
 * @interface
 */
office.clipboard.MimeClipboard = function() {};


/**
 * Retrieve the first clip with non-null data. Useful for retrieving a clip when
 * the priority is determined by clip MIME type. The next type in the type list
 * is attempted only after call back of the previous type has fired (i.e., clips
 * are not requested in parallel). Clip retrieval stops immediately if there is
 * an errback from the clipboard.
 *
 * @param {!office.clipboard.MimeClipboard} clipboard The clipboard.
 * @param {!Array.<string>} mimeTypes The MIME types to retrieve, in order of
 *     precedence. The array must not be empty.
 * @param {?string=} opt_handle Optional clip handle. If unspecified/null, a new
 *     handle for the current state is obtained, used for all getClip
 *     operations, and then finished.
 * @return {!goog.async.Deferred} The retrieved clip. In case no clip with
 *     non-null data could be retrieved, the returned clip will have null data
 *     and an unspecified MIME type.
 */
office.clipboard.MimeClipboard.getFirstExistingClip =
    function(clipboard, mimeTypes, opt_handle) {
  goog.asserts.assert(mimeTypes.length > 0, 'Empty list of types.');
  var handle = opt_handle || clipboard.getClipHandle();
  var deferred = new goog.async.Deferred();
  if (opt_handle != handle) {
    // Make sure the handle obtained here is finished once we're done.
    deferred.addBoth(function(resultToPassOn) {
      clipboard.finish(handle);
      return resultToPassOn;
    });
  }
  var getClipLoopFn = function(index, clip) {
    index++;
    if (index == 0 || (!clip.hasData() && index < mimeTypes.length)) {
      clipboard.getClip(mimeTypes[index], handle).addCallbacks(
          goog.partial(getClipLoopFn, index),
          goog.bind(deferred.errback, deferred));
    } else {
      deferred.callback(clip);
    }
  };
  getClipLoopFn(-1, null);
  return deferred;
};


/**
 * Generates a pseudorandom globally unique id string. The Guid is computed
 * from the current url, User Agent string, time, and a random number. For the
 * structure of the id string, see en.wikipedia.org/UUID (MimeClipboard
 * uses the term Guid rather than UUID which is used in the reference).
 * @return {string} A unique identifier.
 */
office.clipboard.MimeClipboard.newGuid = function() {
  //  Would be great to find some id unique to the browser to mix
  // in, like the ip.
  var time = new Date().getTime();
  return goog.array.map([
    // Elements of array are (prefix,length,random_number).
    ['', 8, Math.abs(
        goog.string.hashCode('' + navigator.userAgent + window.location))],
    ['-', 4, time >>> 16],
    ['-', 4, time],
    ['-', 4, Math.random() * 0x10000],
    ['-', 6, Math.random() * 0x1000000],
    ['', 6, Math.random() * 0x1000000]], function(args) {
    var hexStr = '00000000' + Math.round(args[2]).toString(16);
    return args[0] + hexStr.substring(hexStr.length - args[1], hexStr.length);
  }).join('');
};


/**
 * Sets clipboard clip. If a handle is provided the clip is stored with that
 * handle. Otherwise the most recent clip handle is used.
 *
 * @param {!office.clipboard.Clip} clip The clip to store.
 * @param {?string=} opt_handle The handle associated with the clip.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 */
office.clipboard.MimeClipboard.prototype.setClip = goog.abstractMethod;


/**
 * Retrieves clip by given MIME type. A clip handle may optionally be specified,
 * if unspecified the most recent clip is returned.
 *
 * @param {string} mimeType MIME type of the clip to retrieve.
 * @param {?string=} opt_handle Optional clip handle. If unspecified/null, the
 *     most recent clip is retrieved.
 * @param {number=} opt_timeout Optional timeout in milliseconds. If
 *     unspecified or 0, no timeout is in effect.
 * @return {!goog.async.Deferred} The retrieved clip. The clip MIME type and
 *     handle will be set to the mimeType and opt_handle parameters
 *     respectively. The clip will be empty (null data) if there is no clip
 *     with this MIME type.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 */
office.clipboard.MimeClipboard.prototype.getClip = goog.abstractMethod;


/**
 * Gets the MIME types this clipboard can project to, including the native type
 * of the clipboard.
 *
 * @return {!Array.<string>} Supported MIME types in alphabetical order.
 */
office.clipboard.MimeClipboard.prototype.getMimeTypes = goog.abstractMethod;


/**
 * Retrieves handle to a clip matching one or more digests. If no digest
 * parameter is specified, a handle to the most recent clip is returned. The
 * returned handle will address null clip data if no clip matching the digests
 * is available. Note that by the definition of the method, an empty digests
 * list (i.e., []) will never match any clip. Each invocation of this method
 * should be accompanied by a corresponding finish() call on the returned
 * handle.
 *
 * @param {!Array.<!office.clipboard.Digest>=} opt_digests The optional digests.
 *     The empty digest list [] will not match any clip.
 * @return {string} Handle to a clip matching at least one digest.
 */
office.clipboard.MimeClipboard.prototype.getClipHandle = goog.abstractMethod;


/**
 * Creates handle for a new (empty) clip, optionally with a given clip GUID.
 * If a GUID is specified, clips set within the context of the handle will
 * have this GUID as embedded digest (if the MIME type supports it). Note the
 * difference between getClipHandle() (no args) newClipHandle() (no args):
 * the former will return a handle to the most recent clip, whereas the latter
 * will not.
 *
 * @param {?string=} opt_guid The GUID associated with this handle.
 * @return {string} The new clip handle without any associated clip.
 */
office.clipboard.MimeClipboard.prototype.newClipHandle = goog.abstractMethod;


/**
 * Frees any temporary resources and pending callbacks associated with the
 * given clip handle and invalidates the handle.
 *
 * @param {string} handle Handle to finish.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 */
office.clipboard.MimeClipboard.prototype.finish = goog.abstractMethod;


/**
 * Retrieves digests for the clip. Some array members may be deferred (e.g. when
 * computing the digest requires clip retrieval). For deferred values, a
 * callback value of null means there is no such digest.
 *
 * @param {?string=} opt_handle Handle to the source clip, if unspecified/null
 *     the most recent clip is used.
 * @return {!Array.<!office.clipboard.Digest>} The clip digests.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 */
office.clipboard.MimeClipboard.prototype.getDigests = goog.abstractMethod;
