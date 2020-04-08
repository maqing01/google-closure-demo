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

goog.provide('wireless.dom');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.NodeType');
goog.require('goog.style');
goog.require('goog.userAgent');


//  Consider setting the default values of these defines based on
//     goog.userAgent.ASSUME_MOBILE_WEBKIT.

/**
 * @define {boolean} Whether to do a runtime check for
 *     Element.getElementsByClassName.
 */
wireless.dom.ASSUME_NATIVE_GET_ELEMENTS_BY_CLASS_NAME = false;


/**
 * @define {boolean} Whether to do a runtime check for Element.textContent.
 *     S60 does not support textContent.
 */
wireless.dom.ASSUME_NATIVE_TEXT_CONTENT = false;


/**
 * @define {boolean} Whether to do a runtime check for Element.innerText.
 *     Firefox < 3.0 does not support innerText.
 */
wireless.dom.ASSUME_NATIVE_INNER_TEXT = false;


/**
 * @define {boolean} Whether to do a runtime check for Element.outerHTML.
 *     Firefox does not support outerHTML, but Webkit & IE do.
 */
wireless.dom.ASSUME_NATIVE_OUTER_HTML = false;


/**
 * @define {boolean} Whether adding style/script tags to the head will cause
 *     them to execute properly.
 */
wireless.dom.ASSUME_TAG_INJECTION_WORKS = false;


/**
 * Inserts a new node before an existing reference node (i.e. as the previous
 * sibling). Same as goog.dom.insertSiblingBefore, except asserts that refNode
 * has a parent.
 * @param {Node|undefined} newNode Node to insert.
 * @param {Node|undefined} refNode Reference node to insert before.
 */
wireless.dom.insertSiblingBefore = function(newNode, refNode) {
  goog.asserts.assert(newNode, 'insertSiblingBefore: newNode is missing.');
  goog.asserts.assert(refNode, 'insertSiblingBefore: refNode is missing.');
  goog.asserts.assert(refNode.parentNode,
      'insertSiblingBefore: refNode has no parent.');
  refNode.parentNode.insertBefore(newNode, refNode);
};


/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). Same as goog.dom.insertSiblingAfter, except asserts that refNode
 * has a parent.
 * @param {Node|undefined} newNode Node to insert.
 * @param {Node|undefined} refNode Reference node to insert after.
 */
wireless.dom.insertSiblingAfter = function(newNode, refNode) {
  goog.asserts.assert(newNode, 'insertSiblingAfter: newNode is missing.');
  goog.asserts.assert(refNode, 'insertSiblingAfter: refNode is missing.');
  goog.asserts.assert(refNode.parentNode,
      'insertSiblingAfter: refNode has no parent.');
  refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
};


/**
 * Replaces a node in the DOM tree. Same as goog.dom.replaceNode, except asserts
 * that refNode has a parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
wireless.dom.replaceNode = function(newNode, oldNode) {
  goog.asserts.assert(newNode, 'replaceNode: newNode is missing.');
  goog.asserts.assert(oldNode, 'replaceNode: oldNode is missing.');
  goog.asserts.assert(oldNode.parentNode,
      'replaceNode: oldNode has no parent.');
  oldNode.parentNode.replaceChild(newNode, oldNode);
};


/**
 * Sets the outerHTML of the given node to the given value.
 * @param {Node} node Node to set outerHTML on.
 * @param {string} value The value.
 */
wireless.dom.setOuterHtml = function(node, value) {
  goog.asserts.assert(node, 'setOuterHtml: node is missing.');
  if (wireless.dom.ASSUME_NATIVE_OUTER_HTML || 'outerHTML' in node) {
    node.outerHTML = value;
  } else {
    node.innerHTML = value;
    while (node.firstChild) {
      wireless.dom.insertSiblingBefore(node.firstChild, node);
    }
    goog.dom.removeNode(node);
  }
};


/**
 * Returns a set of elements whose class names matches searchClass.
 * @param {string} searchClass className to search for.
 * @param {Node|undefined} node Element to search on.
 * @return {!Array.<!HTMLElement>|!NodeList} Contains the elements matching
 *     searchClass.
 */
wireless.dom.getElementsByClassName = function(searchClass, node) {
  goog.asserts.assert(searchClass,
      'getElementsByClassName: searchClass is missing.');
  goog.asserts.assert(node,
      'getElementsByClassName: node is missing. searchClass=' + searchClass);

  if (!wireless.dom.ASSUME_NATIVE_GET_ELEMENTS_BY_CLASS_NAME &&
      !node.getElementsByClassName) {
    return /** @type {!Array.<HTMLElement>} */ (
        goog.dom.getElementsByTagNameAndClass('*', searchClass,
                                              /** @type {!Element} */ (node)));
  }
  var ret = node.getElementsByClassName(searchClass);
  // Check for browser bugs. These cases have occurred in the past.
  goog.asserts.assert(ret, "Browser's getElementsByClassName() returned null.");
  if (goog.DEBUG) {
    for (var i = 0, il = ret.length; i < il; i++) {
      goog.asserts.assert(ret[i], 'getElementsByClassName: Element ' + i +
                          ' is missing! searchClass=' + searchClass);
    }
  }
  return ret;
};


/**
 * Returns the first element in the results array of a call to
 * getElementsByClassName.
 * @param {string} searchClass className to search for.
 * @param {Node|undefined} node Element to search on.
 * @return {!HTMLElement|undefined} 1st element matching searchClass; undefined
 *     if none found.
 */
wireless.dom.getFirstElementByClassName = function(searchClass, node) {
  return wireless.dom.getElementsByClassName(searchClass, node)[0];
};


/**
 * Returns the text content of the given node.
 * @param {Node|undefined} node The node for which the text content should be
 *     returned.
 * @return {string} The text content of the given HTML node.
 */
wireless.dom.getText = function(node) {
  goog.asserts.assert(node, 'getText: node is undefined.');
  if (wireless.dom.ASSUME_NATIVE_TEXT_CONTENT) {
    return node.textContent;
  } else if (wireless.dom.ASSUME_NATIVE_INNER_TEXT) {
    return node.innerText;
  }
  return node.textContent || node.innerText || '';
};


/**
 * Sets the text content of the given node.
 * @param {Node} node The node on which to set the new text content.
 * @param {string} value The new text content.
 */
wireless.dom.setText = function(node, value) {
  goog.asserts.assert(node, 'setText: node is undefined.');
  if (wireless.dom.ASSUME_NATIVE_TEXT_CONTENT) {
    node.textContent = value;
  } else if (wireless.dom.ASSUME_NATIVE_INNER_TEXT) {
    node.innerText = value;
  } else if (typeof node.textContent == 'string') {
    node.textContent = value;
  } else {
    node.innerText = value;
  }
};


/**
 * Computes the absolute X offset of the left of the element.
 * @param {Node} node The element.
 * @param {Node} opt_offsetParent Ancestor to be relative to.
 * @return {number} The absolute X offset from the left of the element.
 */
wireless.dom.calculateAbsoluteOffsetLeft = function(node, opt_offsetParent) {
  goog.asserts.assert(node, 'calculateAbsoluteOffsetLeft: node is undefined.');
  goog.asserts.assert(node.offsetParent,
      'calculateAbsoluteOffsetLeft: node.offsetParent is null. Node must be ' +
      'attached to the DOM and must not be display:none.');
  opt_offsetParent = opt_offsetParent || document.body;
  var left = node.offsetLeft;
  var parent = node.offsetParent;
  while (parent != opt_offsetParent) {
    left += parent.offsetLeft;
    parent = parent.offsetParent;
  }
  return left;
};


/**
 * Computes the absolute X offset of the right of the element.
 * @param {Node} node The element.
 * @param {Node} opt_offsetParent Ancestor to be relative to.
 * @return {number} The absolute X offset from the right of the element.
 */
wireless.dom.calculateAbsoluteOffsetRight = function(node, opt_offsetParent) {
  goog.asserts.assert(node, 'calculateAbsoluteOffsetRight: node is undefined.');
  goog.asserts.assert(node.offsetParent,
      'calculateAbsoluteOffsetRight: node.offsetParent is null. Node must be ' +
      'attached to the DOM and must not be display:none.');
  opt_offsetParent = opt_offsetParent || document.body;
  var right = opt_offsetParent.offsetWidth - node.offsetLeft - node.offsetWidth;
  var parent = node.offsetParent;
  while (parent != opt_offsetParent) {
    right -= parent.offsetLeft;
    parent = parent.offsetParent;
  }
  return right;
};


/**
 * Computes the absolute Y offset of the top of the element.
 * @param {Node} node The element.
 * @param {Node} opt_offsetParent Ancestor to be relative to.
 * @return {number} The absolute Y offset from the top of the element.
 */
wireless.dom.calculateAbsoluteOffsetTop = function(node, opt_offsetParent) {
  goog.asserts.assert(node, 'calculateAbsoluteOffsetTop: node is undefined.');
  goog.asserts.assert(node.offsetParent,
      'calculateAbsoluteOffsetTop: node.offsetParent is null. Node must be ' +
      'attached to the DOM and must not be display:none.');
  opt_offsetParent = opt_offsetParent || document.body;
  var top = node.offsetTop;
  var parent = node.offsetParent;
  while (parent != opt_offsetParent) {
    top += parent.offsetTop;
    parent = parent.offsetParent;
  }
  return top;
};


/**
 * Returns a regular expression for matching the given class name within a
 *     whitespace-separated list of class names.
 * @param {string} className The class name to find.
 * @return {RegExp} The regular expression.
 * @private
 */
wireless.dom.makeClassNameRegExp_ = function(className) {
  return new RegExp('(?:^| +)' + className + '(?:$| +)');
};


/**
 * Returns whether the given element contains the given class name.
 * @param {Node} node The node whose className to examine.
 * @param {string} className The class name to search for.
 * @return {boolean} Whether the given element contains the given class name.
 */
wireless.dom.hasClass = function(node, className) {
  goog.asserts.assert(node, 'hasClass: node is undefined.');
  return wireless.dom.makeClassNameRegExp_(className).test(node.className);
};


/**
 * Removes the given class name(s) from the element and then adds one back on
 * based on the useFirst parameter. If useFirst is false and no secondClass
 * is given, then no classes are added back on.
 * @param {Node|undefined} node The node to change the class of.
 * @param {*} useFirst True if the class name should use firstClass, false to
 *     use secondClass.
 * @param {string} firstClass The class name to be toggled or removed.
 * @param {string} opt_secondClass The class name to be toggled between.
 */
wireless.dom.toggleClass =
    function(node, useFirst, firstClass, opt_secondClass) {
  goog.asserts.assert(node, 'toggleClass: node is undefined.');
  var firstClassRegExp = wireless.dom.makeClassNameRegExp_(firstClass);
  var secondClass = opt_secondClass || '';
  var secondClassRegExp = wireless.dom.makeClassNameRegExp_(secondClass);

  if ((useFirst == firstClassRegExp.test(node.className) &&
      (!opt_secondClass ||
          (useFirst != secondClassRegExp.test(node.className))))) {
    // Return if this code should not make any changes to this node's class.
    return;
  }

  // Remove both class names.
  var className = node.className.replace(
      firstClassRegExp, ' ').replace(secondClassRegExp, ' ');

  node.className = className + ' ' + (useFirst ? firstClass : secondClass);
};


/**
 * Creates a node of the given type and with the given contents and adds it to
 * the head.
 * @param {string} nodeName The node name of the element to create.
 * @param {string} nodeContents The value of the node.
 * @return {Node} The newly created node.
 * @private
 */
wireless.dom.addNodeToHead_ = function(nodeName, nodeContents) {
  var element = document.createElement(nodeName);
  var propToSet = goog.userAgent.WEBKIT ? 'innerText' : 'innerHTML';
  element[propToSet] = nodeContents;
  return document.getElementsByTagName('head')[0].appendChild(element);
};


/**
 * Adds a style node to the document with the given contents.
 * @param {string} code The style content.
 */
wireless.dom.installStyles = function(code) {
  if (wireless.dom.ASSUME_TAG_INJECTION_WORKS) {
    wireless.dom.addNodeToHead_('style', code);
  } else {
    goog.style.installStyles(code);
  }
};


/**
 * If opt_regExp is given, then walks up the parents of the given node until one
 * is found where where node[propertyName] matches the RegExp.
 * If opt_regExp is not given, then walks up the parents of the given node until
 * one is found where node[propertyName] evaluates to true.
 * @param {Node|undefined} node The node to start iterating from. This function
 *     is a no-op when null/undefined.
 * @param {string} propertyName The property name to look for.
 * @param {RegExp=} opt_regExp The pattern that node[propertyName] must match.
 * @return {Node|undefined} The found node, or undefined if none was found.
 */
wireless.dom.findFirstAncestorWithProperty =
    function(node, propertyName, opt_regExp) {
  while (node) {
    var value = node[propertyName];
    // Check for empty string in addition to the regular expression to avoid
    // having undefined being cast to a string when node == document.
    if (value && (!opt_regExp || opt_regExp.test(value))) {
      return node;
    }
    node = node.parentNode;
  }
};


/**
 * Walks up the parents of the given node until one one is found with the given
 * class name.
 * @param {Node|undefined} node The node to start iterating from. This function
 *     is a no-op when null/undefined.
 * @param {string} className The class name to search for.
 * @return {Node|undefined} The found node, or undefined if none was found.
 */
wireless.dom.findFirstAncestorWithClass = function(node, className) {
  var classNameRegExp = wireless.dom.makeClassNameRegExp_(className);
  return wireless.dom.findFirstAncestorWithProperty(node, 'className',
      classNameRegExp);
};


/**
 * Walks up the parents of the given node until the last one with the given
 * class name is found.
 * @param {Node|undefined} node The node to start iterating from. This function
 *     is a no-op when null/undefined.
 * @param {string} className The class name to search for.
 * @return {Node|undefined} The found node, or undefined if none was found.
 */
wireless.dom.findLastAncestorWithClass = function(node, className) {
  var ret;
  while (node) {
    node = wireless.dom.findFirstAncestorWithClass(node, className);
    if (node) {
      ret = node;
      node = node.parentNode;
    }
  }
  return ret;
};


/**
 * Whether a node contains another node. Copied from goog.dom.contains and
 * stripped of unnecessary logic for mobile.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
wireless.dom.contains = function(parent, descendant) {
  // W3C DOM Level 3
  if (goog.userAgent.WEBKIT) {
    return parent.contains(descendant);
  } else {
    // This does not work for iPhone 2.2.1 we just use .contains for all WebKit
    // browsers. Firefox works only with this method.
    return parent == descendant ||
        !!(parent.compareDocumentPosition(descendant) & 16);
  }
};

/**
 * Forces the element to be repainted. Used to get around issues with dom
 * not always being repainted when dom elements are updated.
 * @param {Node} node The node that needs to be repainted.
 */
wireless.dom.forceRepaint = function(node) {
  // We are setting a garbage variable on the window so this line is not
  // lost due to compiler optimization.
  // Querying the offsetHeight seems to redraw the element.
  window['_bug'] = node.offsetHeight;
};


/**
 * If the node passed in is a textNode, this will return the parent which we
 * assume is a proper element node. If the node passed in is an element, then
 * this is just an identity function.
 * @param {!Node} node The node to get the element from.
 * @return {!Element} The node as an element.
 */
wireless.dom.getAsElement = function(node) {
  if (!wireless.dom.isElement(node)) {
    node = /** @type {!Node} */ (node.parentNode);
    goog.asserts.assert(node && node.nodeType == goog.dom.NodeType.ELEMENT,
                        'Expecting the node type to be ELEMENT.');
  }
  return /** @type {!Element} */ (node);
};


/**
 * Creates and returns an element of the given type whose innerHTML is set to
 * the given html content.
 * @param {string=} opt_type The tag type of the element to create. 'div' is
 *     used if none given.
 * @param {string=} opt_html The inner html content to set.
 * @param {string=} opt_classes The className to use for the element.
 * @return {!Element} The newly create div element.
 */
wireless.dom.createElement = function(opt_type, opt_html, opt_classes) {
  var e = document.createElement(opt_type || 'div');
  if (opt_html) {
    e.innerHTML = opt_html;
  }
  if (opt_classes) {
    e.className = opt_classes;
  }
  return e;
};


/**
 * Tests if a node is an element.
 * @param {Node|undefined} node The node to test.
 * @return {boolean} True if the object is an element, false otherwise.
 */
wireless.dom.isElement = function(node) {
  return !!node && node.nodeType == goog.dom.NodeType.ELEMENT;
};
