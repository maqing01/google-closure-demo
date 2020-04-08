

/**
 * @fileoverview Base class for LogConsole/TextConsole.
 *
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.debug.CollapsibleConsole');

goog.require('goog.asserts');
goog.require('goog.string');
goog.require('wireless.debug.CollapsibleDiv');
goog.require('wireless.dom');



/**
 * Base class for LogConsole/TextConsole.
 * @param {string} titleHtml The title for the "Show {title}" link.
 * @param {function(string)=} opt_onEmailCallback Function to call when the
 *     email link is clicked. If not specified, the email link will be hidden.
 * @constructor
 * @extends {wireless.debug.CollapsibleDiv}
 */
wireless.debug.CollapsibleConsole = function(titleHtml, opt_onEmailCallback) {
  goog.base(this, titleHtml);

  /**
   * The element that contains the filter UI, and that is shown/hidden during
   * expand/collapse.
   * @type {Element}
   * @private
   */
  this.filterElem_;

  /**
   * The labels for the filters that can be applied.
   * @type {!Array.<string>}
   * @private
   */
  this.filterNames_ = ['All Messages'];

  /**
   * The regular expressions for the filters that can be applied. A null entry
   * means no filter.
   * @type {!Array.<RegExp>}
   * @private
   */
  this.filterValues_ = [null];

  /**
   * The active filter expression. Null means no filter.
   * @type {RegExp}
   * @protected
   */
  this.activeFilterRegex;

  /**
   * Function to call when the email link is clicked.
   * @type {function(string)|undefined}
   * @private
   */
  this.onEmailCallback_ = opt_onEmailCallback;
};
goog.inherits(wireless.debug.CollapsibleConsole, wireless.debug.CollapsibleDiv);


/**
 * The index of the currently selected filter.
 * @type {number}
 * @private
 */
wireless.debug.CollapsibleConsole.prototype.selectedFilterIndex_ = 0;


/**
 * Copies all buffered logs to the innerConsole, applying the active filter
 * if present.
 * @protected
 */
wireless.debug.CollapsibleConsole.prototype.addAllBufferedLogs =
    goog.abstractMethod;


/**
 * @return {string} Returns the contents of the console as plain text.
 */
wireless.debug.CollapsibleConsole.prototype.getLogsAsText =
    goog.abstractMethod;


/**
 * Lazily creates the inner div.
 * @protected
 */
wireless.debug.CollapsibleConsole.prototype.lazyCreate =
    goog.abstractMethod;


/**
 * Clears the console and all buffered items.
 * @param {boolean=} opt_clearBuffer Whether to clear the message buffer in
 *     addition to the UI element.
 */
wireless.debug.CollapsibleConsole.prototype.clear = goog.abstractMethod;


/**
 * Adds a filter to the filter list. Must be called before getElement().
 * @param {string} label The label for the new filter.
 * @param {!RegExp} filter The pattern for the filter.
 */
wireless.debug.CollapsibleConsole.prototype.addFilter =
    function(label, filter) {
  goog.asserts.assert(!this.filterElem_,
      'addFilter() may not be called after build()');
  this.filterNames_.push(label);
  this.filterValues_.push(filter);
};


/**
 * @override
 */
wireless.debug.CollapsibleConsole.prototype.setExpanded = function(value) {
  if (value) {
    if (!this.getInnerElem()) {
      this.lazyCreate();
    }
    this.addAllBufferedLogs();
  } else {
    this.clear();
  }
  goog.style.setElementShown(this.filterElem_, value);
  goog.base(this, 'setExpanded', value);
};


/**
 * Applies the given filter.
 * @param {RegExp} filterRegex The filter to apply. Null means no filter.
 * @private
 */
wireless.debug.CollapsibleConsole.prototype.applyFilter_ =
    function(filterRegex) {
  // Save its height to prevent scrolling when it is emptied.
  var elem = this.getInnerElem();
  elem.style.height = elem.offsetHeight + 'px';
  this.clear();
  this.activeFilterRegex = filterRegex;
  this.addAllBufferedLogs();
  elem.style.height = '';
};


/**
 * Event handler for the "email" link.
 * @private
 */
wireless.debug.CollapsibleConsole.prototype.onEmailLink_ = function() {
  this.onEmailCallback_(this.getLogsAsText());
};


/**
 * Event handler for the filter combo box.
 * @param {!Event} e The change event.
 * @private
 */
wireless.debug.CollapsibleConsole.prototype.onFilterChanged_ = function(e) {
  var selectElem = e.target;
  var lastSelectedIndex = this.selectedFilterIndex_;
  var filterNames = this.filterNames_;
  var filterValues = this.filterValues_;
  var newIndex = selectElem.selectedIndex;
  var filter = filterValues[newIndex];
  // See if they chose the "Custom..." options.
  if (newIndex && !filter) {
    // Set the default text as the current RegExp.
    var defaultValue = !filterValues[lastSelectedIndex] ? '' :
        filterValues[lastSelectedIndex].toString().replace(/^\/|\/$/g, '');
    var userInput = prompt('Enter log filter regular expression', defaultValue);
    if (!userInput) {
      selectElem.selectedIndex = lastSelectedIndex;
      return;
    }
    filter = new RegExp(userInput, 'i');
    // Add the new filter to the lists and to the combo box.
    newIndex = filterNames.push(userInput) - 1;
    filterValues.push(filter);
    var newOption = document.createElement('option');
    wireless.dom.setText(newOption, userInput);
    selectElem.insertBefore(newOption, selectElem.lastChild);
    selectElem.selectedIndex = newIndex;
  }
  this.selectedFilterIndex_ = newIndex;
  this.applyFilter_(filter);
};


/**
 * @override
 */
wireless.debug.CollapsibleConsole.prototype.build = function() {
  this.addLink('Clear', goog.bind(this.clear, this, true));
  if (this.onEmailCallback_) {
    this.addLink('Email', goog.bind(this.onEmailLink_, this, true));
  }

  var html =
      '<label style="white-space:nowrap;margin-left:6px">Filter: <select>';
  for (var i = 0, filterName; filterName = this.filterNames_[i++]; ) {
    html += '<option>' + goog.string.htmlEscape(filterName) + '</option>';
  }
  html += '<option>Custom...</option></select></label>';

  var tmpDiv = document.createElement('div');
  tmpDiv.innerHTML = html;

  this.filterElem_ = /** @type {!Element} */ (tmpDiv.firstChild);
  var selectElem = tmpDiv.getElementsByTagName('select')[0];
  selectElem.onchange = goog.bind(this.onFilterChanged_, this);
  this.addHeaderElem(this.filterElem_);
  return goog.base(this, 'build');
};
