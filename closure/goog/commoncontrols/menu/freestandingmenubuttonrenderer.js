goog.provide('controls.FreestandingMenuButtonRenderer');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.ui.ButtonRenderer');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuButton');
goog.require('goog.ui.MenuRenderer');



/**
 * A renderer for a freestanding menu button, which is a caption-less menu
 * button with a disclosure triangle. This renderer may be safely used with
 * both controls.FreestandingMenuButton and caption-less goog.ui.MenuButton
 * instances.
 * @constructor
 * @extends {goog.ui.ButtonRenderer}
 */
controls.FreestandingMenuButtonRenderer = function() {
  goog.base(this);
};
goog.inherits(controls.FreestandingMenuButtonRenderer, goog.ui.ButtonRenderer);
goog.addSingletonGetter(controls.FreestandingMenuButtonRenderer);


/**
 * Default CSS class to be applied to the root element of components rendered
 * by this renderer.
 * @type {string}
 * @private
 */
controls.FreestandingMenuButtonRenderer.CSS_CLASS_ =
    goog.getCssName('jfk-freestanding-menu-button');


/**
 * Takes an element, decorates it with the freestanding menu button control, and
 * returns the element.  Overrides {@link goog.ui.ButtonRenderer#decorate} by
 * looking for a child element that can be decorated by a menu, and if it
 * finds one, decorates it and attaches it to the menu button.
 * @param {goog.ui.Control} control Menu button to decorate the element. Must
 *     be instance of goog.ui.MenuButton.
 * @param {Element} element Element to decorate.
 * @return {Element} Decorated element.
 * @override
 */
controls.FreestandingMenuButtonRenderer.prototype.decorate = function(control,
    element) {
  goog.asserts.assertInstanceof(control, goog.ui.MenuButton,
      'control must be an instance of goog.ui.MenuButton');
  var button = /** @type {goog.ui.MenuButton} */ (control);
  // TODO(psolderitsch): MenuButtonRenderer and FlatMenuButtonRender use similar
  // code. Refactor this block to its own module where all of these renderers
  // can use it, e.g. in a BasicMenuButtonRenderer class.
  var menuElem = goog.dom.getElementsByTagNameAndClass(
      '*', goog.ui.MenuRenderer.CSS_CLASS, element)[0];
  if (menuElem) {
    // Move the menu element directly under the body, but hide it first; see
    // bug 1089244.
    goog.style.showElement(menuElem, false);

    // TODO(psolderitsch): If/when this gets refactored into a new
    // BasicMenuButtonRenderer class per above, avoid appending this blindly
    // to the document, as this causes leakage since it has no opportunity to
    // be disposed anywhere.
    button.getDomHelper().getDocument().body.appendChild(menuElem);

    // Decorate the menu and attach it to the button.
    var menu = new goog.ui.Menu();
    menu.decorate(menuElem);
    button.setMenu(menu);
  }

  // Let the superclass do the rest.
  return goog.base(this, 'decorate', button, element);
};


/** @override */
controls.FreestandingMenuButtonRenderer.prototype.getCssClass = function() {
  return controls.FreestandingMenuButtonRenderer.CSS_CLASS_;
};
