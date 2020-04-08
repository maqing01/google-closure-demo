goog.provide('controls.tooltipManager');
goog.provide('controls.tooltipManager.TriggerType');

goog.require('goog.Timer');
goog.require('goog.async.Delay');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.dom.safe');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.legacyconversions');
goog.require('goog.html.utils');
goog.require('goog.positioning.Corner');
goog.require('goog.string');
goog.require('goog.style');
goog.require('controls.ArrowAlignment');
goog.require('controls.ArrowPosition');
goog.require('controls.PopupPosition');
goog.require('controls.SilentTooltipRenderer');


/**
 * Installs tooltip handler on a given DOM helper, or for the current document,
 * if none is specified.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 */
controls.tooltipManager.install = function(opt_domHelper) {
  var domHelper = opt_domHelper || goog.dom.getDomHelper();
  var id = goog.getUid(domHelper.getDocument());
  if (!controls.tooltipManager.instances_[id]) {
    controls.tooltipManager.instances_[id] = new controls.TooltipManager_(domHelper);
  }
};


/**
 * Uninstalls a previously installed tooltip handler on a given DOM helper,
 * or for the current document, if none is specified.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 */
controls.tooltipManager.uninstall = function(opt_domHelper) {
  var domHelper = opt_domHelper || goog.dom.getDomHelper();
  var id = goog.getUid(domHelper.getDocument());
  if (controls.tooltipManager.instances_[id]) {
    controls.tooltipManager.instances_[id].dispose();
    delete controls.tooltipManager.instances_[id];
  }
};


/**
 * Sets the tooltip on the given element with the given {@code tooltipText}.
 * The text will be html-escaped. If {@code opt_ariaLabel} is provided, the
 * tooltip's aria-label will be set to it, otherwise, it will be set to match
 * {@code tooltipText}.  For convenience, linebreaks will be converted to
 * <br>s.
 *
 * Passing an empty string to this function will remove the tooltip.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {string} tooltipText Text for the tooltip.
 * @param {string=} opt_ariaLabel Text to use for the tooltip's aria-label.
 */
controls.tooltipManager.setTooltipText = function(
    element, tooltipText, opt_ariaLabel) {
  controls.tooltipManager.setTooltipHelper_(
      element, tooltipText, false, opt_ariaLabel);
};


//  Convert callsites to setTooltipSafeHtml and deprecate this
// function.
/**
 * Sets the tooltip on the given element with the given {@code tooltipHtml}.
 * The html will not be escaped. If {@code opt_ariaLabel} is provided, the
 * tooltip's aria-label will be set to it, otherwise, it will be set to match
 * text version of {@code tooltipHtml}.
 *
 * Passing an empty string to this function will remove the tooltip.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {string} tooltipHtml HTML markup for the tooltip.
 * @param {string=} opt_ariaLabel Text to use for the tooltip's aria-label.
 */
controls.tooltipManager.setTooltipHtml = function(
    element, tooltipHtml, opt_ariaLabel) {
  controls.tooltipManager.setTooltipHelper_(
      element, tooltipHtml, true, opt_ariaLabel);
};


/**
 * Sets the tooltip on the given element with the given {@code tooltipHtml}.
 * If {@code opt_ariaLabel} is provided, the tooltip's aria-label will be set to
 * it, otherwise, it will be set to match text version of {@code tooltipHtml}.
 *
 * Cloning a node will not preverve the tooltip. Use data-tooltip-contained if
 * you need this.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {!goog.html.SafeHtml} tooltipHtml HTML for the tooltip.
 * @param {string=} opt_ariaLabel Text to use for the tooltip's aria-label.
 */
controls.tooltipManager.setTooltipSafeHtml = function(
    element, tooltipHtml, opt_ariaLabel) {
  controls.tooltipManager.setTooltipHelper_(
      element, tooltipHtml, true, opt_ariaLabel);
};


/**
 * Sets the tooltip on the given element using the title attribute of the
 * element if it exists. If the title attribute is undefined, the tooltip will
 * be unchanged. The title attribute will be html-escaped.
 *
 * @param {!Element} element Element to set the tooltip on.
 */
controls.tooltipManager.setTooltipFromTitle = function(element) {
  var title = element.getAttribute('title');
  //Use goog.isDef or element.hasAttribute once we no longer
  //support ie7.
  if (!title) {
    return;
  }
  controls.tooltipManager.setTooltipHelper_(element, title, false);
};


/**
 * Sets a tooltip on a given DOM element and ensures that a TooltipManager is
 * wired up for the parent document.
 *
 * The original "title" attribute will be deleted to prevent the default
 * browser tooltip from showing up and aria-label will be set to the new tooltip
 * or to {@code opt_ariaLabel} if it is defined.
 *
 * If {@code tooltip} is empty, the tooltip and aria-label are removed.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {string|!goog.html.SafeHtml} tooltip Tooltip text or HTML (depending
 *     on {@code isHtml}).
 * @param {boolean} isHtml Whether the {@code tooltip} should be treated as
 *     HTML or plain text.
 * @param {string=} opt_ariaLabel Text to use for the tooltip's aria-label.
 * @private
 */
controls.tooltipManager.setTooltipHelper_ = function(
    element, tooltip, isHtml, opt_ariaLabel) {
  var ariaLabel = opt_ariaLabel;
  if (!ariaLabel) {
    ariaLabel = (tooltip instanceof goog.html.SafeHtml ?
        goog.html.SafeHtml.unwrap(tooltip) : tooltip);
    if (isHtml) {
      ariaLabel = goog.html.utils.stripHtmlTags(ariaLabel);
    }
  }
  element.removeAttribute('title');
  element.removeAttribute(controls.tooltipManager.TOOLTIP_CONTAINED_ATTR_);
  element.removeAttribute(controls.tooltipManager.TOOLTIP_ATTR_);
  element.removeAttribute(controls.tooltipManager.TOOLTIP_HTML_ATTR_);

  if (tooltip) {
    if (tooltip instanceof goog.html.SafeHtml) {
      element.controlsTooltipHtmlInternal = tooltip;
    } else {
      element.setAttribute(isHtml ?
          controls.tooltipManager.TOOLTIP_HTML_ATTR_ :
          controls.tooltipManager.TOOLTIP_ATTR_, tooltip);
      element.controlsTooltipHtmlInternal = null;
    }
    //element.setAttribute('aria-label', ariaLabel);
  } else {
    element.controlsTooltipHtmlInternal = null;
    //element.removeAttribute('aria-label');
  }

  controls.tooltipManager.install(goog.dom.getDomHelper(element));
};


/**
 * Sets the tooltip delay on a given DOM element. This should be used in
 * conjunction with setTooltip so that the tooltip content is also set. Without
 * content, the delay attribute has no effect.
 *
 * The minimum delay is configurable at SHOW_DELAY_MS, although this may change
 * in the future.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {number} delay Delay in ms to wait before showing the tooltip. The
 *     minimum delay is configurable at SHOW_DELAY_MS.
 */
controls.tooltipManager.setTooltipDelay = function(element, delay) {
  element.setAttribute(controls.tooltipManager.TOOLTIP_DELAY_ATTR, delay);
};


/**
 * Sets the tooltip position and alignment on a given DOM element. This should
 * be used in conjunction with setTooltip so that the tooltip content is also
 * set. Without content, the position attribute has no effect.
 *
 * @param {!Element} element Element to set the tooltip on.
 * @param {controls.PopupPosition.<number>} position Popup position for the tooltip.
 * @param {controls.ArrowAlignment.<number>} alignment Alignment for the tooltip
 *     arrow.
 */
controls.tooltipManager.setTooltipPosition = function(
    element, position, alignment) {
  element.setAttribute(controls.tooltipManager.TOOLTIP_ALIGNMENT_ATTR,
      controls.TooltipManager_.computeAlignmentAttr_(position, alignment));
};


/**
 * Sets the tooltip offset on a given DOM element. This should be used in
 * conjunction with setTooltip so that the tooltip content is also set. Without
 * content, the position attribute has no effect.
 *
 * @param {!Element} element Element to set the tooltip offset on.
 * @param {number} offset Offset (in px) for the tooltip with respect to the
 *     anchor. Positive value brings the tooltip closer to the center of the
 *     anchor.
 */
controls.tooltipManager.setTooltipOffset = function(element, offset) {
  element.setAttribute(controls.tooltipManager.TOOLTIP_OFFSET_ATTR, offset);
};


/**
 * Sets the types of events that will trigger the tooltip. By default, both
 * focus and mouse events will cause it to appear.
 * @param {!Element} element The element to change tooltip behavior for.
 * @param {controls.tooltipManager.TriggerType} triggerType The type of trigger that
 *     the tooltip should respond to..
 */
controls.tooltipManager.setTooltipTrigger = function(element, triggerType) {
  if (triggerType == controls.tooltipManager.TriggerType.ALL) {
    element.removeAttribute(controls.tooltipManager.TOOLTIP_TRIGGER_ATTR);
  } else {
    element.setAttribute(controls.tooltipManager.TOOLTIP_TRIGGER_ATTR, triggerType);
  }
};


/**
 * Adds the given class name to the given tooltip.
 * @param {!Element} element The element to add the class names to.
 * @param {string} className Additional CSS class for the tooltip.
 */
controls.tooltipManager.setTooltipClass = function(element, className) {
  //  Add support for multiple class names.
  if (!goog.string.isEmptySafe(className)) {
    element.setAttribute(controls.tooltipManager.TOOLTIP_CLASS_ATTR_, className);
  }
};


/**
 * Suspends or resumes all tooltips on the element specified, but not those of
 * ancestors or descendants. When a tooltip is suspended, it doesn't
 * appear on hover, but the tooltip is still present in the element attributes,
 * so it can be restored without setting up the tooltip again.
 * @param {!Element} element Element to set the tooltip on.
 * @param {boolean} suspend Whether to suspend or resume the tooltip.
 **/
controls.tooltipManager.setTooltipSuspended = function(element, suspend) {
  if (suspend) {
    element.setAttribute(controls.tooltipManager.TOOLTIP_SUSPENDED_ATTR_, 'true');
  } else {
    element.removeAttribute(controls.tooltipManager.TOOLTIP_SUSPENDED_ATTR_);
  }
};


/**
 * Prevents the tooltip from showing on the specified element unless the
 * contents of the element is overflowing (in either the x or y direction).
 * @param {!Element} element Element to set the tooltip on.
 * @param {boolean} onlyOnOverflow Whether to show tooltips for this element
 *     only when the contents are overflowing.
 */
controls.tooltipManager.setTooltipOnlyOnOverflow =
    function(element, onlyOnOverflow) {
  if (onlyOnOverflow) {
    element.setAttribute(controls.tooltipManager.TOOLTIP_ONLY_ON_OVERFLOW_ATTR_,
        'true');
  } else {
    element.removeAttribute(controls.tooltipManager.TOOLTIP_ONLY_ON_OVERFLOW_ATTR_);
  }
};


/**
 * Hides the tooltip on the given DOM helper, or for the current document, if
 * none is specified.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 */
controls.tooltipManager.hide = function(opt_domHelper) {
  var domHelper = opt_domHelper || goog.dom.getDomHelper();
  var id = goog.getUid(domHelper.getDocument());
  if (controls.tooltipManager.instances_[id]) {
    controls.tooltipManager.instances_[id].hideTooltip();
  }
};


/**
 * Class name of the nested element with tooltip contents.
 * @private {string}
 */
controls.tooltipManager.TOOLTIP_ELEMENT_CLASS_ = goog.getCssName('controls-tooltip-data');


/**
 * Element attribute specifying to extract the tooltip from nested element.
 * @private {string}
 */
controls.tooltipManager.TOOLTIP_CONTAINED_ATTR_ = 'tt1';


/**
 * Element attribute to extract the tooltip text from.
 * @type {string}
 * @private
 */
controls.tooltipManager.TOOLTIP_ATTR_ = 'tt2';


/**
 * Element attribute to extract the tooltip HTML from.
 * IMPORTANT: This attribute is deprecated. Use data-tooltip-contained instead
 * and put the tooltip in a nested element with a class controls-tooltip-data.
 * @type {string}
 * @private
 */
controls.tooltipManager.TOOLTIP_HTML_ATTR_ = 'tt3';


/**
 * Element attribute indicating whether the tooltip is suspended.
 * @type {string}
 * @private
 */
controls.tooltipManager.TOOLTIP_SUSPENDED_ATTR_ = 'tt4';


/**
 * Element attribute indicating whether the tooltip show only be displayed
 * if the elements contents are overflowing.
 * @type {string}
 * @private
 */
controls.tooltipManager.TOOLTIP_ONLY_ON_OVERFLOW_ATTR_ = 'tt5';


/**
 * @private {string}
 */
controls.tooltipManager.TOOLTIP_CLASS_ATTR_ = goog.getCssName('tooltip-class');


/**
 * Element attribute to extract the popup position and tooltip alignment from.
 * Properties are comma separated, with the first property being the popup
 * position and second the tooltip alignment.
 * The popup position can be one of: 'l' for left, 't' for top, 'r' for right,
 * and 'b' for bottom which is the default.
 * The tooltip alignment can be one of: 'l' for left-or-top, 'r' for
 * right-or-bottom, or 'c' for center which is the default.
 * E.g. t,r for a tooltip that displays above the given element with the arrow
 * aligned near the right side of the popup.
 * @type {string}
 */
controls.tooltipManager.TOOLTIP_ALIGNMENT_ATTR = 'tt6';


/**
 * Element attribute to extract the popup offset from. Positive value brings the
 * tooltip closer to the center of the anchor. If the attribute is absent, the
 * default value of -1 will be assumed.
 * @type {string}
 */
controls.tooltipManager.TOOLTIP_OFFSET_ATTR = 'tt7';


/**
 * Element attribute to extract the tooltip delay from. Note that there is a
 * minumum delay configurable at SHOW_DELAY_MS, and any smaller values will be
 * ignored.
 *
 *  If we want to allow having a delay less than SHOW_DELAY_MS,
 * then we should add a THROTTLE_DELAY_MS for the listening and just use
 * SHOW_DELAY_MS and HIDE_DELAY_MS for the default values.
 * @type {string}
 */
controls.tooltipManager.TOOLTIP_DELAY_ATTR = 'tt8';


/**
 * The attribute to determine when a tooltip should be triggered on a DOM
 * element. Its values should come from the
 * {controls.tooltipManager.TriggerType} enum. If the attribute is absent,
 * the default value of ALL will be assumed.
 * @type {string}
 * @see {controls.tooltipManager.TriggerType}
 */
controls.tooltipManager.TOOLTIP_TRIGGER_ATTR = 'tt9';


/**
 * An enumeration of possible triggers for the tooltip.
 * @enum {string}
 */
controls.tooltipManager.TriggerType = {
  /** Triggers tooltip by either mouse hover or focus. This is the default. */
  ALL: 'all',

  /** Triggers tooltip by mouse hover only. */
  MOUSE: 'mouse'
};


/**
 * Delay in ms before a tooltip is shown.
 * @type {number}
 */
controls.tooltipManager.SHOW_DELAY_MS = 300;


/**
 * Delay in ms before a tooltip is hidden.
 * @type {number}
 */
controls.tooltipManager.HIDE_DELAY_MS = 50;


/**
 * Default offset of the tooltip from the anchor element. Positive values bring
 * the tooltip closer to the center of the anchor.
 * @type {number}
 */
controls.tooltipManager.TOOLTIP_OFFSET_PX = -1;


/**
 * A map of document UIDs to TooltipManager_ instances.
 * @type {Object.<number, controls.TooltipManager_>}
 * @private
 */
controls.tooltipManager.instances_ = {};



/**
 * A document-wide tooltip provider.
 * A replacement for goog.ui.Tooltip allowing for tooltips to be set in the
 * HTML declaratively and eliminating the need for goog.ui.Tooltip instances
 * to be created individually.  This improves performance by eliminating
 * redundant DOM nodes, event listeners and boilerplate JavaScript code.
 *
 * The tooltip manager ensures that there is only one active tooltip at a time.
 *
 * @param {!goog.dom.DomHelper} domHelper DOM helper.
 * @constructor
 * @extends {goog.events.EventHandler}
 * @private
 */
controls.TooltipManager_ = function(domHelper) {
  controls.TooltipManager_.base(this, 'constructor');

  /**
   * @type {goog.dom.DomHelper}
   * @private
   */
  this.domHelper_ = domHelper;

  /**
   * @type {goog.async.Delay}
   * @private
   */
  this.delay_ = new goog.async.Delay(this.throttledHover_, 0, this);
  this.registerDisposable(this.delay_);

  var doc = domHelper.getDocument();

  // NOTE:  FOCUS and BLUR events do not bubble and IE doesn't support event
  // capturing, so we use the FOCUSIN and FOCUSOUT events which are mapped to
  // the proprietary IE events (identically named) that do bubble and the
  // generally unsupported DOMFocusIn and DOMFocusOut for everyone else.
  // For all other browsers, FOCUS and BLUR can be captured at the document
  // level.

  // ALL of these events are needed.  Do not change without extensive testing!
  this.listen(doc,
      [
        goog.events.EventType.MOUSEOUT,
        goog.events.EventType.MOUSEDOWN,
        goog.events.EventType.CLICK,
        goog.events.EventType.BLUR,
        goog.events.EventType.FOCUSOUT,
        goog.events.EventType.KEYDOWN
      ],
      this.clearActiveElement_,
      true);

  this.listen(doc,
      [
        goog.events.EventType.MOUSEOVER,
        goog.events.EventType.FOCUS,
        goog.events.EventType.FOCUSIN
      ],
      this.setActiveElement_,
      true);
};
goog.inherits(controls.TooltipManager_, goog.events.EventHandler);


/**
 * Keep track of whether the last event was a KEYDOWN.
 * @type {boolean}
 * @private
 */
controls.TooltipManager_.prototype.isKeyboardEvent_;


/**
 * Keeps track of whether the event that triggered the tooltip timer was a
 * FOCUS.
 * @type {boolean}
 * @private
 */
controls.TooltipManager_.prototype.isFocusEvent_;


/**
 * Active element.
 * @type {Element}
 * @private
 */
controls.TooltipManager_.prototype.activeEl_;


/**
 * A node for which a throttled hover event has been fired and the tooltip
 * is being shown.
 * @type {Element}
 * @private
 */
controls.TooltipManager_.prototype.hoverEl_;


/**
 * Timer key.
 * @type {number}
 * @private
 */
controls.TooltipManager_.prototype.timeoutId_;


/**
 * Tooltip DOM element wrapper.
 * @type {controls.TooltipRenderer}
 * @private
 */
controls.TooltipManager_.prototype.tooltip_;


/**
 * Tooltip positioning helper.
 * @type {controls.ArrowPosition}
 * @private
 */
controls.TooltipManager_.prototype.tooltipPos_;


/**
 * Additional tooltip class name.
 * @private {string}
 */
controls.TooltipManager_.prototype.tooltipClass_;


/**
 * The id of the secondary delay timer, used if a tooltip has an additional
 * delay on top of the normal mouse over delay.
 * @type {number}
 * @private
 */
controls.TooltipManager_.prototype.secondaryTimerId_;


/**
 * Class name for hiding tooltip element.
 * @type {string}
 * @private
 */
controls.TooltipManager_.HIDE_TOOLTIP_CLASS_NAME_ =
    goog.getCssName('controls-tooltip-hide');


/** @override */
controls.TooltipManager_.prototype.disposeInternal = function() {
  this.clearSecondaryTimer_();
  controls.TooltipManager_.base(this, 'disposeInternal');
};


/**
 * Tracks whether the last event was triggered by a keyboard.
 * This lets us detect when a FOCUS event is triggered via a keyboard
 * and not by clicking on the element.  If a window loses focus and is
 * later re-activated, this flag will retain its state, so the tooltip
 * will be shown only if it has previously been shown as a result of
 * keyboard navigation.  Yay.
 * @param {goog.events.Event} e Event object.
 * @private
 */
controls.TooltipManager_.prototype.trackEventTrigger_ = function(e) {
  switch (e.type) {
    case goog.events.EventType.MOUSEDOWN:
    case goog.events.EventType.MOUSEOVER:
    case goog.events.EventType.MOUSEOUT:
    case goog.events.EventType.CLICK:
      this.isKeyboardEvent_ = false;
      break;
    case goog.events.EventType.KEYDOWN:
      this.isKeyboardEvent_ = true;
      break;
  }
};


/**
 * Sets the active element from event target and resets the timer.
 * @param {goog.events.Event} e Event object.
 * @private
 */
controls.TooltipManager_.prototype.setActiveElement_ = function(e) {
  this.trackEventTrigger_(e);
  // If the focus was caused by a non-key event, treat it as a signal to
  // hide the tooltip.
  // This can happen either programmatically, by the browser window
  // getting focused and re-setting focus on the last focused element
  // or as a result of a mouse interaction.
  var focusEvent = (e.type == goog.events.EventType.FOCUS ||
      e.type == goog.events.EventType.FOCUSIN);
  if (!this.isKeyboardEvent_ && focusEvent) {
    this.activeEl_ = null;
  } else {
    this.isFocusEvent_ = focusEvent;
    this.activeEl_ = /** @type {Element} */ (e.target);
  }
  this.resetTimer_();
};


/**
 * Clears the active element and resets the timer.
 * @param {goog.events.Event} e Event object.
 * @private
 */
controls.TooltipManager_.prototype.clearActiveElement_ = function(e) {
  var targetEl = /** @type {Element}*/ (e.target);
  var isClickEvent = e.type == goog.events.EventType.MOUSEDOWN ||
      e.type == goog.events.EventType.CLICK;
  var isTargetWithinTooltip = this.tooltip_ &&
      goog.dom.contains(this.tooltip_.getContentElement(), targetEl);
  if (isClickEvent && isTargetWithinTooltip) {
    return;
  }

  this.trackEventTrigger_(e);
  this.activeEl_ = null;
  this.resetTimer_();
};


/**
 * Resets the throttle timer.
 * The delay varies depending on whether a tooltip is active.
 * @private
 */
controls.TooltipManager_.prototype.resetTimer_ = function() {
  this.clearSecondaryTimer_();

  var delay = this.hoverEl_ ?
      controls.tooltipManager.HIDE_DELAY_MS :
      controls.tooltipManager.SHOW_DELAY_MS;
  this.delay_.start(delay);
};


/**
 * Clears the secondary timer. Secondary timer may be present of the
 * tooltip delay is customized to be > the mouseover delay.
 * @private
 */
controls.TooltipManager_.prototype.clearSecondaryTimer_ = function() {
  if (this.secondaryTimerId_) {
    goog.Timer.clear(this.secondaryTimerId_);
    this.secondaryTimerId_ = 0;
    this.hoverEl_ = null;
  }
};


/**
 * @param {!Element} element
 * @return {!goog.html.SafeHtml}
 * @private
 */
controls.TooltipManager_.getTooltipHtml_ = function(element) {
  if (element.controlsTooltipHtmlInternal) {
    return /** @type {!goog.html.SafeHtml} */ (element.controlsTooltipHtmlInternal);
  }
  var tooltip = element.getAttribute(controls.tooltipManager.TOOLTIP_HTML_ATTR_);
  if (tooltip) {
    //  This is very unsafe if templates are not escaping
    // the attribute properly. We need to convert everyone to use contained
    // tooltips.
    return goog.html.legacyconversions.safeHtmlFromString(tooltip);
  }
  return goog.html.SafeHtml.htmlEscapePreservingNewlines(
      element.getAttribute(controls.tooltipManager.TOOLTIP_ATTR_));
};


/**
 * Throttled "hover intent" event.
 * Potentially hides an existing tooltip and/or shows a new one.
 * @private
 */
controls.TooltipManager_.prototype.throttledHover_ = function() {
  if (!this.activeEl_) {
    // This can happen when the tooltip target is overlapping one of
    // the browser viewport edge.
    this.hideTooltip();
    return;
  }

  // Are we hovering over the tooltip itself?
  if (this.hoverEl_ && this.tooltip_ &&
      goog.dom.contains(this.tooltip_.getElement(), this.activeEl_)) {
    return;
  }

  var ancestorWithTooltip = /** @type {Element} */ (goog.dom.getAncestor(
      this.activeEl_,
      function(node) {
        return node.getAttribute && (
            node.getAttribute(controls.tooltipManager.TOOLTIP_CONTAINED_ATTR_) ||
            node.getAttribute(controls.tooltipManager.TOOLTIP_ATTR_) ||
            node.controlsTooltipHtmlInternal ||
            node.getAttribute(controls.tooltipManager.TOOLTIP_HTML_ATTR_)) &&
            !node.getAttribute(controls.tooltipManager.TOOLTIP_SUSPENDED_ATTR_);
      },
      true));

  var tooltipWasVisibleAndThenHidden = false;
  if (this.hoverEl_ && this.hoverEl_ != ancestorWithTooltip) {
    this.hideTooltip();
    tooltipWasVisibleAndThenHidden = true;
  }

  if (!this.hoverEl_ && ancestorWithTooltip) {
    this.hoverEl_ = ancestorWithTooltip;
    if (!this.shouldShowTooltip_(ancestorWithTooltip)) {
      return;
    }

    var tooltipHtml = goog.html.SafeHtml.EMPTY;
    if (ancestorWithTooltip.getAttribute(
        controls.tooltipManager.TOOLTIP_CONTAINED_ATTR_)) {
      var tooltipEls = goog.dom.getElementsByClass(
          controls.tooltipManager.TOOLTIP_ELEMENT_CLASS_,
          ancestorWithTooltip);
      for (var i = 0; i < tooltipEls.length; i++) {
        if (tooltipEls[i].parentNode == ancestorWithTooltip) {
          tooltipHtml = tooltipEls[i].cloneNode(true);
          break;
        }
      }
    } else {
      tooltipHtml = controls.TooltipManager_.getTooltipHtml_(ancestorWithTooltip);
    }

    var alignmentAttr = ancestorWithTooltip.getAttribute(
        controls.tooltipManager.TOOLTIP_ALIGNMENT_ATTR);
    var classAttr = ancestorWithTooltip.getAttribute(
        controls.tooltipManager.TOOLTIP_CLASS_ATTR_);
    var offsetAttr = ancestorWithTooltip.getAttribute(
        controls.tooltipManager.TOOLTIP_OFFSET_ATTR);
    var offset = goog.string.isEmptySafe(offsetAttr) ?
        controls.tooltipManager.TOOLTIP_OFFSET_PX : Number(offsetAttr);

    if (!tooltipWasVisibleAndThenHidden) {
      var delay = ancestorWithTooltip.getAttribute(
          controls.tooltipManager.TOOLTIP_DELAY_ATTR);
      delay = Math.max(0, delay - controls.tooltipManager.SHOW_DELAY_MS);
      if (delay) {
        this.secondaryTimerId_ = goog.Timer.callOnce(
            goog.partial(this.showTooltipImpl_,
                this.hoverEl_, tooltipHtml, alignmentAttr, offset, classAttr),
            delay, this);
        return;
      }
    }

    this.showTooltipImpl_(this.hoverEl_, tooltipHtml, alignmentAttr, offset,
        classAttr);
  }
};


/**
 * Whether a tooltip should be shown for the given element.
 * @param {Element} element
 * @return {boolean} Whether the tooltip should be shown.
 * @private
 */
controls.TooltipManager_.prototype.shouldShowTooltip_ = function(element) {
  // Check if contents are overflowing and if the element only shows tooltips
  // on overflowing content.
  if (element.getAttribute(controls.tooltipManager.TOOLTIP_ONLY_ON_OVERFLOW_ATTR_) &&
      element.offsetWidth >= element.scrollWidth &&
      element.offsetHeight >= element.scrollHeight) {
    return false;
  }

  // Check if this is a focus event and the element doesn't show tooltips
  // on focus.
  if (this.isFocusEvent_) {
    var showOnFocus = controls.tooltipManager.TriggerType.MOUSE !=
        element.getAttribute(controls.tooltipManager.TOOLTIP_TRIGGER_ATTR);
    if (!showOnFocus) {
      return false;
    }
  }
  return true;
};


/**
 * Computes the alignment attribute value that is the string representation of
 * the given popup position and arrow alignment.
 * @param {controls.PopupPosition.<number>} position The popup position.
 * @param {controls.ArrowAlignment.<number>} alignment The enum value for the popup
 *     position to.
 * @return {string} The computed alignment attribute value that is the string
 *     representation of the given popup position and arrow alignment.
 * @private
 */
controls.TooltipManager_.computeAlignmentAttr_ = function(position, alignment) {
  var alignmentAttr = '';
  switch (position) {
    case controls.PopupPosition.LEFT:
      alignmentAttr += 'l';
      break;
    case controls.PopupPosition.TOP:
      alignmentAttr += 't';
      break;
    case controls.PopupPosition.RIGHT:
      alignmentAttr += 'r';
      break;
    default:
      alignmentAttr += 'b';
      break;
  }

  alignmentAttr += ',';

  switch (alignment) {
    case controls.ArrowAlignment.LEFT_OR_TOP:
      alignmentAttr += 'l';
      break;
    case controls.ArrowAlignment.RIGHT_OR_BOTTOM:
      alignmentAttr += 'r';
      break;
    default:
      alignmentAttr += 'c';
      break;
  }
  return alignmentAttr;
};


/**
 * Parses the position from an alignment string and returns the PopupPosition
 * enum value. The format is specified in the documentation for
 * TOOLTIP_ALIGNMENT_ATTR.
 * @param {string} alignmentStr The alignment string. Properties are space
 *     separated, with the first property being the arrow the second the popup
 *     position. Popup position can be one of: 'l' for left, 't' for top, 'r'
 *     for right, and 'b' for bottom which is the default.
 * @return {controls.PopupPosition.<number>} The enum value for the popup position to
 *     use.
 * @private
 */
controls.TooltipManager_.parsePosition_ = function(alignmentStr) {
  if (alignmentStr) {
    var splitStr = alignmentStr.toLowerCase().split(',');
    switch (splitStr[0]) {
      case 'l':
        return controls.PopupPosition.LEFT;
      case 't':
        return controls.PopupPosition.TOP;
      case 'r':
        return controls.PopupPosition.RIGHT;
    }
  }
  return controls.PopupPosition.BOTTOM;
};


/**
 * Parses the arrow alignment from an alignment attribute string and returns the
 * ArrowAlignment enum value. The format is specified in the documentation for
 * TOOLTIP_ALIGNMENT_ATTR.
 * @param {string} alignmentStr The alignment string. Properties are space
 *     separated, with the first property being the arrow the second the popup
 *     position. Arrow alignment can be one of: 'l' for left-or-top, 'r' for
 *     right-or-bottom, or 'c' for center which is the default.
 * @return {controls.ArrowAlignment.<number>} The enum value for the arrow alignment
 *     to use.
 * @private
 */
controls.TooltipManager_.parseArrowAlignment_ = function(alignmentStr) {
  if (alignmentStr) {
    var splitStr = alignmentStr.toLowerCase().split(',');
    switch (splitStr[1]) {
      case 'l':
        return controls.ArrowAlignment.LEFT_OR_TOP;
      case 'r':
        return controls.ArrowAlignment.RIGHT_OR_BOTTOM;
    }
  }
  return controls.ArrowAlignment.CENTER;
};


/**
 * Shows a tooltip.
 * @param {Element} anchor Element that the tooltip should be anchored to.
 * @param {!Element|!goog.html.SafeHtml} tooltipHtml Element containing the
 *     tooltip or HTML markup for the tooltip.
 * @param {string} alignmentAttr The alignment string to use for positioning the
 *     tooltip. The format is specified in the documentation for
 *     TOOLTIP_ALIGNMENT_ATTR.
 * @param {number} offset The offset from the anchor element.
 * @param {string} classAttr The additional CSS class for the tooltip.
 * @private
 */
controls.TooltipManager_.prototype.showTooltipImpl_ = function(
    anchor, tooltipHtml, alignmentAttr, offset, classAttr) {
  this.secondaryTimerId_ = 0;
  if (!this.tooltip_) {
    this.tooltip_ = new controls.SilentTooltipRenderer(this.domHelper_);
    this.hideTooltipImpl_();
    goog.dom.appendChild(this.domHelper_.getDocument().body,
        this.tooltip_.getElement());
    this.registerDisposable(this.tooltip_);
    // NOTE(klevy): Disabling subpixels is a patch for
    // http://code.google.com/p/chromium/issues/detail?id=29937 (subpixels cause
    // janky rendering with opacity transitions).
    this.tooltipPos_ = new controls.ArrowPosition(
        this.tooltip_.getClassName(), true /* opt_disableSubpixels*/);
    this.tooltipPos_.setAutoReposition(true);
    this.tooltipPos_.setElements(this.tooltip_.getElement(),
        this.tooltip_.getArrowElement());
  }

  var alignment = controls.TooltipManager_.parseArrowAlignment_(alignmentAttr);
  var position = controls.TooltipManager_.parsePosition_(alignmentAttr);
  this.tooltipPos_.setPosition(position, alignment,
      undefined /* opt_arrowOffset */, offset);

  goog.dom.classlist.remove(this.tooltip_.getElement(),
      controls.TooltipManager_.HIDE_TOOLTIP_CLASS_NAME_);
  if (this.tooltipClass_ != classAttr) {
    if (this.tooltipClass_ && !goog.string.isEmptySafe(this.tooltipClass_)) {
      goog.dom.classlist.remove(this.tooltip_.getElement(), this.tooltipClass_);
    }

    if (!goog.string.isEmptySafe(classAttr)) {
      goog.dom.classlist.add(this.tooltip_.getElement(), classAttr);
    }
    this.tooltipClass_ = classAttr;
  }

  // Reset tooltip position so its new content doesn't make it extend past
  // the window border and cause text wrapping before being repositioned.
  goog.style.setPosition(this.tooltip_.getElement(), 0, 0);

  if (tooltipHtml instanceof goog.html.SafeHtml) {
    goog.dom.safe.setInnerHtml(this.tooltip_.getContentElement(), tooltipHtml);
  } else {
    goog.dom.removeChildren(this.tooltip_.getContentElement());
    var child;
    while ((child = tooltipHtml.firstChild)) {
      this.tooltip_.getContentElement().appendChild(child);
    }
  }
  this.tooltipPos_.setAnchorElement(anchor);
  this.tooltipPos_.reposition(null /* unused */,
      goog.positioning.Corner.TOP_LEFT /* unused */);
};


/**
 * Hides a tooltip.
 * @private
 */
controls.TooltipManager_.prototype.hideTooltipImpl_ = function() {
  if (this.tooltip_) {
    goog.dom.classlist.add(this.tooltip_.getElement(),
        controls.TooltipManager_.HIDE_TOOLTIP_CLASS_NAME_);
  }
};


/**
 * Forces the tooltip to hide.
 */
controls.TooltipManager_.prototype.hideTooltip = function() {
  this.hideTooltipImpl_();
  this.hoverEl_ = null;
};
