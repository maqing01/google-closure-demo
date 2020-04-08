
// All rights reserved.

/**
 * @fileoverview A UI for viewing plain text messages (such as tracers) that has
 * minimal overhead when not expanded.
 *
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.debug.TextConsole');

goog.require('goog.asserts');
goog.require('goog.structs.CircularBuffer');
goog.require('wireless.debug.CollapsibleConsole');
goog.require('wireless.dom');



/**
 * A collapsible console that contains plain text messages.
 * @param {string} titleHtml The title of the console.
 * @param {function(string)=} opt_onEmailCallback Function to call when the
 *     email link is clicked. If not specified, the email link will be hidden.
 * @param {number=} opt_maxEntries The maximium number of entries to buffer when
 *     collapse. Default is 100.
 * @constructor
 * @extends {wireless.debug.CollapsibleConsole}
 */
wireless.debug.TextConsole =
    function(titleHtml, opt_onEmailCallback, opt_maxEntries) {
  goog.base(this, titleHtml, opt_onEmailCallback);

  /**
   * The element that messages are added to.
   * @type {Element|undefined}
   * @private
   */
  this.elem_;

  /**
   * The buffer to hold the messages in.
   * @type {!goog.structs.CircularBuffer}
   * @private
   */
  this.logBuffer_ = new goog.structs.CircularBuffer(opt_maxEntries ||
      wireless.debug.TextConsole.DEFAULT_MAX_NUM_LOGS_TO_KEEP_);
};
goog.inherits(wireless.debug.TextConsole, wireless.debug.CollapsibleConsole);


/**
 * The size of the message buffer.
 * @type {number}
 * @private
 */
wireless.debug.TextConsole.DEFAULT_MAX_NUM_LOGS_TO_KEEP_ = 100;


/**
 * @override
 */
wireless.debug.TextConsole.prototype.addAllBufferedLogs = function() {
  var buf = this.logBuffer_;
  var logs = buf.getValues();
  for (var i = 0, il = buf.getCount(); i < il; ++i) {
    this.addMessageToUi_(/** @type {string} */ (buf.get(i)));
  }
};


/**
 * @override
 */
wireless.debug.TextConsole.prototype.clear = function(opt_clearBuffer) {
  if (this.elem_) {
    this.elem_.innerHTML = '';
  }
  if (opt_clearBuffer) {
    this.logBuffer_.clear();
  }
};


/**
 * @override
 */
wireless.debug.TextConsole.prototype.getLogsAsText = function() {
  var values = this.logBuffer_.getValues();
  return values.join('\n')
};


/**
 * Adds the given message to the buffer, and to the console if it matches the
 * active filter.
 * @param {string} message The message to add.
 */
wireless.debug.TextConsole.prototype.addMessage = function(message) {
  if (this.isExpanded()) {
    this.addMessageToUi_(message);
  }
  this.logBuffer_.add(message);
};


/**
 * Adds the given message to the console if it matches the active filter.
 * @param {string} message The message to add.
 * @private
 */
wireless.debug.TextConsole.prototype.addMessageToUi_ = function(message) {
  goog.asserts.assert(this.elem_, 'addMessageToUi_ before created.');
  var filterRegex = this.activeFilterRegex;
  if (!filterRegex || filterRegex.test(message)) {
    var newDiv = document.createElement('div');
    newDiv.style.borderTop = '1px solid #ccc';
    wireless.dom.setText(newDiv, message);
    this.elem_.appendChild(newDiv);
  }
};


/**
 * @override
 * @protected
 */
wireless.debug.TextConsole.prototype.lazyCreate = function() {
  var elem = document.createElement('div');
  elem.style.fontFamily = 'monospace';
  elem.style.whiteSpace = 'pre';
  this.elem_ = elem;
  this.setInnerElem(elem);
};
