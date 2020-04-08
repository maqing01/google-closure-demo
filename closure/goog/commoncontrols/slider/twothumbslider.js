// Copyright 2011 Google, Inc. All Rights Reserved.

/**
 * @fileoverview JFK two-thumb (range) slider.
 * @author ehwang@google.com (Eric Hwang)
 * @see twothumbslider_demo.html
 */

goog.provide('jfk.TwoThumbSlider');

goog.require('goog.dom.classlist');
goog.require('goog.dom.safe');
goog.require('goog.html.SafeHtml');
goog.require('goog.ui.TwoThumbSlider');



/**
 * Creates a JFK TwoThumbSlider object.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {goog.ui.TwoThumbSlider}
 */
jfk.TwoThumbSlider = function(opt_domHelper) {
  jfk.TwoThumbSlider.base(this, 'constructor', opt_domHelper);
};
goog.inherits(jfk.TwoThumbSlider, goog.ui.TwoThumbSlider);


/**
 * The CSS prefix for JFK-specific slider elements.
 * @type {string}
 */
jfk.TwoThumbSlider.JFK_CSS_CLASS_PREFIX = goog.getCssName('jfk-slider');


/**
 * The CSS class for JFK-specific two-thumb slider elements.
 * @type {string}
 */
jfk.TwoThumbSlider.JFK_TWOTHUMB_SLIDER_CSS_CLASS =
    goog.getCssName('jfk-twothumbslider');


/**
 * CSS class name for the scale element.
 * @type {string}
 */
jfk.TwoThumbSlider.SCALE_CSS_CLASS = goog.getCssName(
    jfk.TwoThumbSlider.JFK_CSS_CLASS_PREFIX, 'scale');


/**
 * CSS class name for the thumb graphic implementation.
 * @type {string}
 */
jfk.TwoThumbSlider.THUMB_IMPL_CSS_CLASS = goog.getCssName(
    jfk.TwoThumbSlider.JFK_CSS_CLASS_PREFIX, 'thumbimpl');


/** @override */
jfk.TwoThumbSlider.prototype.decorateInternal = function(element) {
  jfk.TwoThumbSlider.base(this, 'decorateInternal', element);
  var slider = this.getElement();

  goog.dom.classlist.add(slider,
      jfk.TwoThumbSlider.JFK_TWOTHUMB_SLIDER_CSS_CLASS);

  var scale = this.getElementByClass(jfk.TwoThumbSlider.SCALE_CSS_CLASS);
  if (!scale) {
    scale = this.getDomHelper().createDom('div',
        jfk.TwoThumbSlider.SCALE_CSS_CLASS);
    if (slider.firstChild) {
      this.getDomHelper().insertSiblingBefore(scale, slider.firstChild);
    } else {
      slider.appendChild(scale);
    }
  }
};


/** @override */
jfk.TwoThumbSlider.prototype.createThumbs = function() {
  jfk.TwoThumbSlider.base(this, 'createThumbs');
  var thumbImpl = goog.html.SafeHtml.create('div',
      {'class': jfk.TwoThumbSlider.THUMB_IMPL_CSS_CLASS});
  if (this.valueThumb && this.extentThumb) {
    goog.dom.safe.setInnerHtml(this.valueThumb, thumbImpl);
    goog.dom.safe.setInnerHtml(this.extentThumb, thumbImpl);
  }
};
