
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for element styles.
 */

goog.provide('wireless.style');
goog.require('goog.userAgent');


/**
 * Gets the vendor CSS prefix.
 * Use wireless.style.VENDOR_PREFIX.
 * @private
 * @return {string} The vendor CSS prefix.
 */
wireless.style.getVendorPrefix_ = function() {
  if (goog.userAgent.IE) {
    return '-ms-';
  }
  if (goog.userAgent.GECKO) {
    return '-moz-';
  }
  if (goog.userAgent.OPERA) {
    return '-o-';
  }
  return '-webkit-';
};


/**
 * Gets the vendor CSS prefix.
 * Use wireless.style.CAMEL_CASE_VENDOR_PREFIX.
 * @private
 * @return {string} The vendor CSS prefix.
 */
wireless.style.getCamelCaseVendorPrefix_ = function() {
  if (goog.userAgent.IE) {
    return 'ms';
  }
  if (goog.userAgent.GECKO) {
    return 'Moz';
  }
  if (goog.userAgent.OPERA) {
    return 'O';
  }
  return 'webkit';
};


/**
 * The vendors CSS Prefix.
 * @type {string}
 */
wireless.style.VENDOR_PREFIX = wireless.style.getVendorPrefix_();


/**
 * The vendors CSS Prefix. Use instead of wireless.style.VENDOR_PREFIX for keys
 * of element style objects since these should be camel case instead of
 * selector-case. For example use the following:
 * myElement.style['OTransition'] = ...
 * instead of
 * myElement.style['-o-transition'] = ...
 * since it does not work on Opera.
 * @type {string}
 */
wireless.style.CAMEL_CASE_VENDOR_PREFIX =
    wireless.style.getCamelCaseVendorPrefix_();


/**
 * Style name for transform.
 * @type {string}
 */
wireless.style.TRANSFORM_STYLE = wireless.style.VENDOR_PREFIX + 'transform';


/**
 * Camel case style name for transform. Use as a property of style when setting
 * Element.style.
 * @type {string}
 */
wireless.style.CAMEL_CASE_TRANSFORM_STYLE =
    wireless.style.CAMEL_CASE_VENDOR_PREFIX + 'Transform';


/**
 * Style name for transition.
 * @type {string}
 */
wireless.style.TRANSITION_STYLE = wireless.style.VENDOR_PREFIX + 'transition';


/**
 * Style name for transition.
 * @type {string}
 */
wireless.style.CAMEL_CASE_TRANSITION_STYLE =
    wireless.style.CAMEL_CASE_VENDOR_PREFIX + 'Transition';

/**
 * Style name for filter.
 * @type {string}
 */
wireless.style.FILTER_STYLE = wireless.style.VENDOR_PREFIX + 'filter';

/**
 * Style name for filter.
 * @type {string}
 */
wireless.style.CAMEL_CASE_FILTER_STYLE =
    wireless.style.CAMEL_CASE_VENDOR_PREFIX + 'Filter';


/**
 * Retrieves a computed style value of a node.
 *
 * Limitations:
 * - Does not report border styles correctly in Webkit.
 *
 * @param {!Element} element Element to get style of.
 * @return {!CSSStyleDeclaration} Computed style.
 */
wireless.style.getComputedStyle = function(element) {
  return document.defaultView.getComputedStyle(element, null);
};


/**
 * Retrieves the current transform of an element.
 *
 * @param {!Element} element Element to get transform of.
 * @return {!CSSMatrix} Style value.
 */
wireless.style.getCurrentTransformMatrix = function(element) {
  var style = wireless.style.getComputedStyle(element);
  var transform = style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE];
  if (typeof WebKitCSSMatrix != 'undefined') {
    return new WebKitCSSMatrix(transform);
  } else if (typeof MSCSSMatrix != 'undefined') {
    return new MSCSSMatrix(transform);
  } else if (typeof CSSMatrix != 'undefined') {
    // The standards compliant object (and Opera).
    return new CSSMatrix(transform);
  } else {
    return /** @type {!CSSMatrix} */({});
  }
};
