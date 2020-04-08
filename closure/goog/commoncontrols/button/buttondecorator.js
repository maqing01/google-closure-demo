// Copyright 2011 Google, Inc. All Rights Reserved.

/**
 * @fileoverview Definition of controls.Button decorator, a static call
 * to goog.ui.registry.

 */

/** @suppress {extraProvide} */
goog.provide('controls.decorator.button');

goog.require('goog.ui.registry');
goog.require('controls.Button');


// Register a decorator factory function for controls.Buttons.
goog.ui.registry.setDecoratorByClassName(controls.Button.CSS_NAME,
    function() {
      return new controls.Button(null);
    });
