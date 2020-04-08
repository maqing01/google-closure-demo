

/**
 * @fileoverview Base class for collapsible debug divs.
 *
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.debug.CollapsibleDiv');

goog.require('goog.asserts');
goog.require('goog.string');
goog.require('wireless.dom');



/**
 * Base class for LogConsole/TextConsole.
 * @param {string} titleHtml The title for the collapsed div.
 * @constructor
 */
wireless.debug.CollapsibleDiv = function(titleHtml) {
  /**
   * The title of the element.
   * @type {string}
   * @private
   */
  this.titleHtml_ = titleHtml;

  /**
   * The div that contains all UI elements when expanded.
   * @type {Element|undefined}
   * @private
   */
  this.outerElem_;

  /**
   * The root div for the inner console.
   * @type {Element|undefined}
   * @private
   */
  this.innerElem_;

  /**
   * The expand/collapse link.
   * @type {Element|undefined}
   * @private
   */
  this.expandLink_;

  /**
   * @type {boolean|undefined}
   * @private
   */
  this.isBuilt_;

  /**
   * Whether the console is currently expanded or collapsed.
   * @type {boolean|undefined}
   */
  this.isExpanded_;

  /**
   * @type {function(!wireless.debug.CollapsibleDiv)|undefined}
   * @private
   */
  this.expandCallback_;
};


/**
 * Adds a link to the header. Must be called before build().
 * @param {string} html The innerHTML for the link.
 * @param {Function} onClickFunc The onclick handler for the link.
 * @return {!Element} The anchor tag.
 */
wireless.debug.CollapsibleDiv.prototype.addLink = function(html, onClickFunc) {
  var link = document.createElement('a');
  link.href = 'javascript:;';
  link.onclick = onClickFunc;
  link.innerHTML = html;
  link.style.marginLeft = '8px';
  this.addHeaderElem(link);
  return link;
};


/**
 * Adds the given element to the header. Must be called before build().
 * @param {!Element} elem The element to add.
 */
wireless.debug.CollapsibleDiv.prototype.addHeaderElem = function(elem) {
  goog.asserts.assert(!this.isBuilt_, 'addHeaderElem after build().');
  var outerElem = this.getOrCreateOuterElem_();
  outerElem.firstChild.appendChild(elem);
};


/**
 * Adds the given element to the header. Must be called before build().
 * @param {function(!wireless.debug.CollapsibleDiv)} callback The function to
 *     call whenever the Expand/Collapse link is clicked.
 */
wireless.debug.CollapsibleDiv.prototype.setOnExpandCallback =
    function(callback) {
  this.expandCallback_ = callback;
};


/**
 * Sets the innerElem to the given element. This must be called after all calls
 * to addLink() and can be set after build().
 * @param {!Element} elem The inner element.
 */
wireless.debug.CollapsibleDiv.prototype.setInnerElem = function(elem) {
  goog.style.setElementShown(elem, this.isExpanded_);
  this.innerElem_ = elem;
  this.outerElem_.appendChild(elem);
};


/**
 * @return {Element|undefined} The set inner element, if there is one.
 */
wireless.debug.CollapsibleDiv.prototype.getInnerElem = function() {
  return this.innerElem_;
};


/**
 * @return {!Element} Returns the root element for the widget.
 */
wireless.debug.CollapsibleDiv.prototype.build = function() {
  goog.asserts.assert(!this.isBuilt_, 'build() after build().');
  return this.getOrCreateOuterElem_();
};


/**
 * Expands/collapses the console.
 * @param {boolean} value Whether to expand or collapse.
 */
wireless.debug.CollapsibleDiv.prototype.setExpanded = function(value) {
  this.isExpanded_ = value;
  if (value) {
    this.expandLink_.textContent = 'Collapse';
  } else {
    this.expandLink_.textContent = 'Expand';
  }
  if (this.expandCallback_) {
    this.expandCallback_(this);
  }
  goog.asserts.assert(!value || this.innerElem_,
      'innerElem has not been set on expand.');
  if (this.innerElem_) {
    goog.style.setElementShown(this.innerElem_, value);
  }
};


/**
 * @return {boolean|undefined} Whether the div is currently expanded.
 */
wireless.debug.CollapsibleDiv.prototype.isExpanded = function() {
  return this.isExpanded_;
};


/**
 * Event handler for the "expand/collapse" link.
 * @private
 */
wireless.debug.CollapsibleDiv.prototype.onToggleExpanded_ = function() {
  this.setExpanded(!this.isExpanded_);
};


/**
 * Gets or creates the outer div.
 * @return {!Element} The outer element.
 * @private
 */
wireless.debug.CollapsibleDiv.prototype.getOrCreateOuterElem_ = function() {
  if (!this.outerElem_) {
    goog.asserts.assert(!this.innerElem_,
        'getOuterElem_ cannot be called after innerElem is set.');
    // Create the DOM elements for the div.
    var outerElem = document.createElement('div');
    var html =
        '<div style="background:#eee">' +
        '<b>' + this.titleHtml_ + '</b> -';
    outerElem.innerHTML = html;
    outerElem.style.fontSize = '12px';
    outerElem.style.margin = '6px 0';
    this.outerElem_ = outerElem;
    this.expandLink_ =
        this.addLink('Expand', goog.bind(this.onToggleExpanded_, this));
  }
  return this.outerElem_;
};
