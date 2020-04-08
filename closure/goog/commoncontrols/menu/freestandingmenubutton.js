goog.provide('controls.FreestandingMenuButton');

goog.require('goog.math.Box');
goog.require('goog.positioning.Corner');
goog.require('goog.positioning.MenuAnchoredPosition');
goog.require('goog.style');
goog.require('goog.ui.MenuButton');
goog.require('controls.FreestandingMenuButtonRenderer');



/**
 * A freestanding menu button with no caption. Upon click, opens a menu that's
 * positioned such that the menu is below but slightly offset from the left
 * edge of the button itself.
 *
 * @param {goog.ui.Menu=} opt_menu Menu containing options.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper, used for
 *     document interaction.
 * @constructor
 * @extends {goog.ui.MenuButton}
 */
controls.FreestandingMenuButton = function(opt_menu, opt_domHelper) {
  goog.base(this, null /* caption */, opt_menu,
      controls.FreestandingMenuButtonRenderer.getInstance(), opt_domHelper);
};
goog.inherits(controls.FreestandingMenuButton, goog.ui.MenuButton);


/**
 * The offset of the popped-up menu from the bottom edge of the menu button.
 * @type {number}
 * @private
 */
controls.FreestandingMenuButton.MENU_TOP_OFFSET_PX_ = -1;


/**
 * Positions the menu under the button. May be called directly in cases when
 * the menu size is known to change. The positioning logic is similar to that
 * found in goog.ui.MenuButton, except that a y offset is applied such that the
 * menu border overlaps the button's bottom border. This can't be done in CSS
 * since the menus are absolutely repositioned when they are shown, and those
 * positions are adjusted depending on the size of the viewport.
 * @override
 */
controls.FreestandingMenuButton.prototype.positionMenu = function() {
  if (!this.getMenu().isInDocument()) {
    return;
  }

  var positionElement = this.getElement();

  var anchorCorner = this.isAlignMenuToStart() ?
      goog.positioning.Corner.BOTTOM_START : goog.positioning.Corner.BOTTOM_END;

  var position = new goog.positioning.MenuAnchoredPosition(positionElement,
      anchorCorner, /* opt_adjust */ !this.isScrollOnOverflow(),
      /* opt_resize */ this.isScrollOnOverflow());

  // If invisible, make element visible for measurement.
  var elem = this.getMenu().getElement();
  if (!this.getMenu().isVisible()) {
    elem.style.visibility = 'hidden';
    goog.style.showElement(elem, true);
  }

  var preferredSize = this.isScrollOnOverflow() ? goog.style.getSize(elem) :
      null;
  var popupCorner = this.isAlignMenuToStart() ?
      goog.positioning.Corner.TOP_START : goog.positioning.Corner.TOP_END;

  // Offset the menu by a fixed amount.
  var box = new goog.math.Box(
      controls.FreestandingMenuButton.MENU_TOP_OFFSET_PX_, 0, 0, 0);
  position.reposition(elem, popupCorner, box, preferredSize);

  // Reset visibility from above.
  if (!this.getMenu().isVisible()) {
    goog.style.showElement(elem, false);
    elem.style.visibility = 'visible';
  }
};
