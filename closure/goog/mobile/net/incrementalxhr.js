

/**
 * @fileoverview Manages Incremental XHRs.
 *
 * XHRs can be parsed incrementally so that batched responses can be parsed and
 * handled as they arrive. This is a big win on mobile devices because it means
 * we can send fewer and larger responses (minimizing number of round trips),
 * while handling individual responses as soon as they are available.
 *
 * This class is designed to be a simple wrapper around the wireless.net.Xhr
 * class. It will register with the class's onUpdate callback and parse the
 * responseText which is expected to be in the following format:
 * - Initial preamble to skip
 * - Message, message, message, etc.
 *
 * The initial preamble is optional, but it is encouraged to use something that
 * prevents cross-domain JSON inclusion. E.g. )]}'\n
 * - http://wiki.corp.google.com/twiki/bin/view/Main/ISETeamScriptInclusion
 *
 * Each message should be of the format:
 * - size
 * - token
 * - text
 *
 * This class will parse each message first to find the token, which is a
 * separator used to mark the end of the size. When a token is found, we will
 * parse the size to see how much more we need to read in order to have the full
 * text message. After the end of the text message, the next size, token, text
 * should begin immediately. Note that the separator token is a harcoded
 * constant of value '&'. It is encouraged to use this value rather than create
 * some mechanism of supporting variable tokens.
 *
 * An example of an XHR having 3 messages:
 *      )]}'\n5&Hello4&Ryan10&Fioravanti
 *
 * Given this example message, this class would invoke the update callback 3
 * times with the strings:
 * - Hello, Ryan, Fioravanti
 *
 * @author rjfioravanti@google.com (Ryan Fioravanti)
 */

goog.provide('wireless.net.IncrementalXhr');

goog.require('goog.log');
goog.require('wireless.net.Xhr');



/**
 * @param {!wireless.net.Xhr} xhr The base xhr object.
 * @param {function(!wireless.net.Xhr, string)} onChunk On update callback.
 * @param {number=} opt_preambleLength The initial length of responseText
 *      to skip.
 * @constructor
 */
wireless.net.IncrementalXhr = function(xhr, onChunk, opt_preambleLength) {
  /**
   * The base XHR class.
   * @type {!wireless.net.Xhr}
   * @private
   */
  this.xhr_ = xhr;

  /**
   * The user-specified callback to call when the response is updated.
   * @type {function(!wireless.net.Xhr, string)|undefined}
   * @private
   */
  this.onChunkCallback_ = onChunk;

  /**
   * Length of preamble.
   * @type {number}
   * @private
   */
  this.preambleLength_ = opt_preambleLength || 0;

  xhr.setOnUpdateCallback(goog.bind(this.onUpdate_, this));
};


/**
 * The token separator.
 * @type {string}
 * @private
 */
wireless.net.IncrementalXhr.SEPARATOR_ = '&';


/**
 * @type {goog.log.Logger}
 * @private
 */
wireless.net.IncrementalXhr.prototype.logger_ =
    goog.log.getLogger('wireless.net.IncrementalXhr');


/**
 * Current seek index in response text. This will always point to the start of a
 * first unread record.
 * @type {number}
 * @private
 */
wireless.net.IncrementalXhr.prototype.currentIndex_;


/**
 * Performs a POST request.
 * @param {string} url The url to request.
 * @param {string} method Either 'POST' or 'GET'.
 * @param {?string} content The body of the request to send.
 * @param {!Object.<string>} headers The headers of the request to send. If null
 *     or missing the Content-Type header, x-www-form-urlencoded will be used.
 */
wireless.net.IncrementalXhr.prototype.send =
    function(url, method, content, headers) {
  this.currentIndex_ = this.preambleLength_;
  this.xhr_.send(url, method, content, headers);
};


/**
 * @return {!wireless.net.Xhr} Returns the underlying XHR object.
 */
wireless.net.IncrementalXhr.prototype.getUnderlyingXhr = function() {
  return this.xhr_;
};


/**
 * @param {function(!wireless.net.Xhr, string)} onChunk On update callback.
 */
wireless.net.IncrementalXhr.prototype.setOnChunkCallback = function(onChunk) {
  this.onChunkCallback_ = onChunk;
};


/**
 * @return {function(!wireless.net.Xhr, string)|undefined} The onChunk callback.
 */
wireless.net.IncrementalXhr.prototype.getOnChunkCallback = function() {
  return this.onChunkCallback_;
};


/**
 * XHR update event. Parse the available response text and see if we can send
 * anything upstream.
 * @param {!wireless.net.Xhr} xhr The base xhr class.
 * @private
 */
wireless.net.IncrementalXhr.prototype.onUpdate_ = function(xhr) {
  // Get the response and find the next separator.
  var response = xhr.getResponseText();
  var nextTokenIndex = response.indexOf(
      wireless.net.IncrementalXhr.SEPARATOR_, this.currentIndex_) + 1;

  goog.log.fine(this.logger_, 'Parsing updated responseText of length: ' +
      response.length);

  // If we don't have a next token yet then do nothing.
  if (nextTokenIndex) {
    // Read the size of the message.
    var size = +response.substring(this.currentIndex_, nextTokenIndex - 1);

    // Get the end index of the next message.
    var nextMessageEndIndex = size + nextTokenIndex;

    // If we don't have the next full message then do nothing.
    if (response.length >= nextMessageEndIndex) {
      // Send the message to the update callback.
      this.currentIndex_ = nextMessageEndIndex;
      var message = response.substring(nextTokenIndex, nextMessageEndIndex);
      goog.log.fine(this.logger_, 'Ready to process chunk. Chunk size: ' +
          message.length);
      this.onChunkCallback_(xhr, message);

      // Another message may have been received, try again.
      this.onUpdate_(xhr);
    }
  }
};
