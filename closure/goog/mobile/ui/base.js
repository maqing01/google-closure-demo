goog.provide('wireless.ui');


/**
 * In debug mode, asserts that the given element has not already been passed to
 * this function and then marks it so that subsequent calls with the same
 * element will fail. This is used to guarantee that elements are decorated by
 * the wireless.ui classes at most once, as decorating multiple times leads to
 * unexpected behaviour when handling events.
 *
 * Outside debug mode, this is just the identity function.
 *
 * @param {!Element} element The element to mark as used.
 * @return {!Element} The same element.
 */
wireless.ui.use = function(element) {
  if (goog.DEBUG) {
    goog.asserts.assert(!goog.isDef(element.used),
        'Attempted to decorate the same element twice. This element has ' +
        'already been decorated by a call to decorate(), decorateAll() or a ' +
        'constructor for some class in wireless.ui. Decorating elements more ' +
        'than once may lead to unexpected behaviour when handling events.\n' +
        'Element innerHTML: ' + element.innerHTML);
    element.used = 1;
  }
  return element;
};
