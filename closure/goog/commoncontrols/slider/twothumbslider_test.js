// Copyright 2011 Google. All Rights Reserved.

/**
 * @fileoverview Unit tests for jfk.TwoThumbSlider.
 * @author ehwang@google.com (Eric Hwang)
 */

/** @suppress {extraProvide} */
goog.provide('jfk.TwoThumbSliderTest');

goog.require('goog.dom');
goog.require('goog.dom.classlist');
/** @suppress {extraRequire} */
goog.require('goog.testing.jsunit'); // Unreferenced: for testing.
goog.require('jfk.TwoThumbSlider');
goog.setTestOnly('jfk.TwoThumbSliderTest');



var containerDiv;
var slider;


function setUp() {
  containerDiv = goog.dom.createDom('div');
  slider = new jfk.TwoThumbSlider();
  goog.dom.append(document.body, containerDiv);
}


function tearDown() {
  goog.dispose(slider);
  goog.dom.removeNode(containerDiv);
}


function testRendering() {
  slider.render(containerDiv);
  assertSliderDomCorrect();
}


function testDecorate() {
  containerDiv.innerHTML = '<div id="slider">' +
      '<div class="goog-twothumbslider-value-thumb"></div>' +
      '<div class="goog-twothumbslider-extent-thumb"></div>' +
      '</div>';
  slider.decorate(goog.dom.getElement('slider'));
  assertSliderDomCorrect();
}


function assertSliderDomCorrect() {
  assertTrue(goog.dom.classlist.contains(slider.getElement(),
      'jfk-twothumbslider'));
  assertNumElementsWithClass(1, 'jfk-slider-scale', slider);
  assertNumElementsWithClass(1, 'goog-twothumbslider-rangehighlight', slider);
  assertNumElementsWithClass(1, 'goog-twothumbslider-value-thumb', slider);
  assertNumElementsWithClass(1, 'goog-twothumbslider-extent-thumb', slider);
  assertNumElementsWithClass(2, 'jfk-slider-thumbimpl', slider);
}


function assertNumElementsWithClass(expectedNumElements, className,
    component) {
  var elementsWithClass = goog.dom.getElementsByClass(className,
      component.getElement());
  assertEquals('Unexpected number of ' + className, expectedNumElements,
      elementsWithClass.length);
}
