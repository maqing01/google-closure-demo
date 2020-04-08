// Copyright 2009 The Closure Library Authors. All Rights Reserved.
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

goog.provide('wireless.Spinner');

goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('wireless.device');
//
function bezier(x1, y1, x2, y2, epsilon){

  var curveX = function(t){
    var v = 1 - t;
    return 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t;
  };

  var curveY = function(t){
    var v = 1 - t;
    return 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t;
  };

  var derivativeCurveX = function(t){
    var v = 1 - t;
    return 3 * (2 * (t - 1) * t + v * v) * x1 + 3 * (- t * t * t + 2 * v * t) * x2;
  };

  return function(t){

    var x = t, t0, t1, t2, x2, d2, i;

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 8; i++){
      x2 = curveX(t2) - x;
      if (Math.abs(x2) < epsilon) return curveY(t2);
      d2 = derivativeCurveX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }

    t0 = 0, t1 = 1, t2 = x;

    if (t2 < t0) return curveY(t0);
    if (t2 > t1) return curveY(t1);

    // Fallback to the bisection method for reliability.
    while (t0 < t1){
      x2 = curveX(t2);
      if (Math.abs(x2 - x) < epsilon) return curveY(t2);
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * .5 + t0;
    }

    // Failure
    return curveY(t2);

  };

};
//
/**
 * Creates the spinner dom node. Use getNode to insert it into the document.
 * @param {HTMLCanvasElement=} opt_canvas The canvas element to use.
 * @param {Array.<number>=} opt_color The rgb color to use.  Please don't
 *     use for Cirrus applications.
 * @constructor
 */
wireless.Spinner = function(opt_canvas, opt_color) {

  /**
   * The canvas node where the spinner is drawn.
   * @type {HTMLCanvasElement}
   * @private
   */
  this.node_;

  //begin
  this.circleCount = 0;
  this.paintCount = 0;
  this.stagePaintTimes = 45;
  this.minAngle = 5;
  this.state = 'expand'
  this.easeInOut = new Array();
  //this.easeOut = new Array();
  //this.easeIn = new Array();

  var easeInOut = bezier(0.42, 0, 0.58, 1.0, 0.00001);
  //var easeIn = bezier(0.42, 0, 1, 1, 0.001);
  //var easeOut = bezier(0, 0, 0.58, 1.0, 0.001);
  for (var t = 0; t <= 1; t += (1/this.stagePaintTimes)){
    this.easeInOut.push(easeInOut(t));
   // this.easeOut.push(easeOut(t));
    //this.easeIn.push(easeIn(t));
  }

  if (opt_canvas) {
    if (typeof opt_canvas == 'object') {
      if (opt_canvas['size']) {
        wireless.Spinner.SIZE_ = opt_canvas['size']
      }
      this.node_ =
          /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
      // Scale up the canvas to avoid jaggies
      this.node_.height = wireless.Spinner.SIZE_ * wireless.Spinner.SCALE_;
      this.node_.width = wireless.Spinner.SIZE_ * wireless.Spinner.SCALE_;
      this.node_.style.height = wireless.Spinner.SIZE_ + 'px';
      this.node_.style.width = wireless.Spinner.SIZE_ + 'px';
    } else {
      this.node_ = opt_canvas;
    }
  } else {
    this.node_ =
        /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
    // Scale up the canvas to avoid jaggies
    this.node_.height = wireless.Spinner.SIZE_ * wireless.Spinner.SCALE_;
    this.node_.width = wireless.Spinner.SIZE_ * wireless.Spinner.SCALE_;
    this.node_.style.height = wireless.Spinner.SIZE_ + 'px';
    this.node_.style.width = wireless.Spinner.SIZE_ + 'px';
  }


  /**
   * The rendering context used to draw the boxes.
   * It first checks for getContext in order to fail gracefully on
   * unsupported browsers (e.g. IE8).
   * @type {CanvasRenderingContext2D|undefined}
   * @private
   */
  this.context_ = this.node_.getContext ?
      /** @type {CanvasRenderingContext2D} */ (this.node_.getContext('2d')) :
      undefined;

  goog.asserts.assert(!opt_color || (opt_color.length == 3 &&
      opt_color.toString().match('[0-9]+,[0-9]+,[0-9]+')),
      'color of spinner must be specified as an RGB triple, or omitted');
  /**
   * A precomputed string for drawing.
   * The base color, expressed as the three rgb color values. The elements of
   * the spinner will be drawn as increasingly transparent versions of this
   * color.
   * @type {string}
   * @private
   */
  this.colorString_ = opt_color ? (opt_color + ',') :
      wireless.Spinner.defaultColorString_;
};


/**
 * The width and height of the spinner in pixels.
 * @type {number}
 * @private
 */
wireless.Spinner.SIZE_ = 40;


/**
 * The maximum number of boxes that are drawn to create the spinner.
 * @type {number}
 * @private
 */
//wireless.Spinner.BOXES_ = 12;//old
wireless.Spinner.BOXES_ = 120;//new

/**
 * This is how far up we scale the canvas so we don't get the jaggies as
 * we go from spec. pixels to device pixels.
 * @type {number}
 * @private
 */
//wireless.Spinner.SCALE_ = 3;
wireless.Spinner.SCALE_ = 1;


/**
 * The fraction of the radius that is the gap between sectors.
 * @type {number}
 * @private
 */
//wireless.Spinner.GAP_FRACTION_ = 0.125;
wireless.Spinner.GAP_FRACTION_ = 0;


/**
 * The fraction of the radius that is empty in the center.
 * Range is GAP_FRACTION_ .. 1.00
 * @type {number}
 * @private
 */
//wireless.Spinner.RADIUS_FRACTION_ = 0.618;
wireless.Spinner.RADIUS_FRACTION_ = 0.86;

/**
 * The animation speed. Defined as the number of milliseconds between re-draws.
 * @type {number}
 * @private
 */
//wireless.Spinner.SPEED_ = 120;
wireless.Spinner.SPEED_ = 18;

/**
 * The default for spinners colors.  See the doc for colorString_.
 * @type {string}
 * @private
 */
//wireless.Spinner.defaultColorString_ = '0,0,0,';
wireless.Spinner.defaultColorString_ = ['237,96,79,','56,180,158,','253,181,2,','58,172,206,'];
//wireless.Spinner.defaultColorString_ = ['237,96,79,'];


/**
 * The maximum opacity used for sectors. The elements of the spinner will be
 * drawn as increasingly transparent versions starting with this value.
 * @type {number}
 * @private
 */
//wireless.Spinner.OPACITY_SLOPE_ = 0.80; // 0.95 - OPACITY_MIN_;
wireless.Spinner.OPACITY_SLOPE_ = 1;

/**
 * The minimum opacity used for sectors. The elements of the spinner will be
 * drawn as increasingly transparent versions towards this value.
 * @type {number}
 * @private
 */
//wireless.Spinner.OPACITY_MIN_ = 0.15;
wireless.Spinner.OPACITY_MIN_ = 0;


/**
 * The angle of a full circle.  Kind of wish Math had this.
 * @type {number}
 * @private
 */
wireless.Spinner.FULL_CIRCLE_ = Math.PI * 2;

/**
 * The stepping angle from one sector to the next.
 * @type {number}
 * @private
 */
wireless.Spinner.SECTOR_ = wireless.Spinner.FULL_CIRCLE_ /
    wireless.Spinner.BOXES_;


/**
 * Angle to the top half of a sector beyond the angle to get to the top
 * of the gap at the outer radius.
 * @type {number}
 * @private
 */
wireless.Spinner.OUTSIDE_ARC_ = wireless.Spinner.SECTOR_ / 2 -
    Math.asin(wireless.Spinner.GAP_FRACTION_ / 2);

/**
 * Angle to the top of the inner portion of a sector.
 * Only makes sense if RADIUS_FRACTION_ > GAP_FRACTION_ * (2/sin(SECTOR_/2)).
 * Otherwise, we have no inside arc and we would use
 * RADIUS_FRACTION_ = GAP_FRACTION_ * (2/sin(SECTOR_/2)).
 * A fudge factor is required to draw an arc; 0 length arcs do not
 * participate in the shape.  INSIDE_ARC_ = 0.00001;
 * @type {number}
 * @private
 */
wireless.Spinner.INSIDE_ARC_ = wireless.Spinner.SECTOR_ / 2 -
    Math.asin(wireless.Spinner.GAP_FRACTION_ /
              wireless.Spinner.RADIUS_FRACTION_ / 2);


/**
 * The amount by which we change the position each frame,  currently we use a
 * fraction of sector.
 * @type {number}
 * @private
 */
//wireless.Spinner.ROTATION_STEP_ = 0.95 * wireless.Spinner.SECTOR_;
wireless.Spinner.ROTATION_STEP_ = 1 * wireless.Spinner.SECTOR_;

/**
 * Keeps track of where the heaviest box should be as the spinner rotates.
 * @type {number}
 * @private
 */
wireless.Spinner.prototype.drawState_ = 0;


/**
 * The id of the interval used to animate the spinner.
 * @type {?number}
 * @private
 */
wireless.Spinner.prototype.interval_;


/**
 * Provides the dom node containing the spinner.
 * @return {Element} The canvas dom node.
 */
wireless.Spinner.prototype.getNode = function() {
  return this.node_;
};


/**
 * Starts the spinner.
 */
wireless.Spinner.prototype.start = function() {
  if (!this.interval_ && this.context_) {
    //begin
    this.interval_ = window.setInterval(goog.bind(this.draw_, this),
                                         wireless.Spinner.SPEED_);

    // remove the hack
    goog.Timer.callOnce(goog.bind(this.stop, this), 30 * 1000);

    //end
    // Draw it immediately to be more responsive.
    this.draw_();
  }
};


/**
 * Stops the spinner.
 */
wireless.Spinner.prototype.stop = function() {
  window.clearInterval(this.interval_);
  this.interval_ = null;
};


/**
 * Draws one frame of the spinner animation.
 * @private
 */
wireless.Spinner.prototype.draw_ = function() {
  // Don't draw if not visible.
  if (!this.getNode().offsetWidth) {
    return;
  }

  // Get some variables local and useful.
  var size = this.getNode().height;
  var center = size / 2;
  var oRadius = Math.max(size / 3, size / 2 - wireless.Spinner.SCALE_);
  var iRadius = oRadius * wireless.Spinner.RADIUS_FRACTION_;
  var alwaysArc = !wireless.device.hasNonWrappingCanvasArcBug();

  var context = this.context_;

  //context.save();
  //context.clearRect(0, 0, size, size);
  //
  if (typeof this.colorString_ == 'string') {
    draw(this,this.colorString_);
  } else {
    var colorIndex = Math.floor(this.paintCount / (this.stagePaintTimes*2)) % this.colorString_.length;
    draw(this,this.colorString_[colorIndex]);
  }

  /**
   * This is the current center of the wedgie being drawn, stepping around
   * the circle in SECTOR_ steps, where the angle has been normalized to the
   * range (- OUTSIDE_ARC_ to 2pi - OUTSIDE_ARC_) (or modulo inclusion).
   * Some simplifications of tests rely on SECTOR_ being > 0.
   * @type {number}
   */
  /*
  var angle = this.drawState_ + wireless.Spinner.ROTATION_STEP_;
  angle = angle - Math.floor(angle / wireless.Spinner.FULL_CIRCLE_) *
      wireless.Spinner.FULL_CIRCLE_;
  if (angle + wireless.Spinner.OUTSIDE_ARC_ > wireless.Spinner.FULL_CIRCLE_) {
    angle -= wireless.Spinner.FULL_CIRCLE_;
  }
  this.drawState_ = angle;
  for (var i = 0; i < wireless.Spinner.BOXES_; i++) {
    if (angle + wireless.Spinner.OUTSIDE_ARC_ > wireless.Spinner.FULL_CIRCLE_) {
      angle -= wireless.Spinner.FULL_CIRCLE_;
    }
    context.beginPath();
    if (alwaysArc || angle > wireless.Spinner.OUTSIDE_ARC_) {
      context.arc(center, center, oRadius,
                  angle - wireless.Spinner.OUTSIDE_ARC_,
                  angle + wireless.Spinner.OUTSIDE_ARC_, false);
      context.arc(center, center, iRadius,
                  angle + wireless.Spinner.INSIDE_ARC_,
                  angle - wireless.Spinner.INSIDE_ARC_, true);
    } else {
      // Replace the sector arc with a trapezoid.  Same corners.
      // Bug in WebOS causes arcs over the axis to crash the browser and/or
      // phone.  Nice.
      // The compiler doesn't do aliasing of the local expressions.
      var a = angle - wireless.Spinner.OUTSIDE_ARC_;
      context.moveTo(center + oRadius * Math.cos(a),
                     center + oRadius * Math.sin(a));
      a = angle + wireless.Spinner.OUTSIDE_ARC_;
      context.lineTo(center + oRadius * Math.cos(a),
                     center + oRadius * Math.sin(a));
      a = angle + wireless.Spinner.INSIDE_ARC_;
      context.lineTo(center + iRadius * Math.cos(a),
                     center + iRadius * Math.sin(a));
      a = angle - wireless.Spinner.INSIDE_ARC_;
      context.lineTo(center + iRadius * Math.cos(a),
                     center + iRadius * Math.sin(a));
    }
    context.closePath();

    var fraction = i / (wireless.Spinner.BOXES_ - 1.0);
    context.fillStyle = 'rgba(' + this.colorString_ +
        (wireless.Spinner.OPACITY_MIN_ + Math.pow(fraction, 3.0) *
        (wireless.Spinner.OPACITY_SLOPE_)) + ')';
    context.fill();
    angle += wireless.Spinner.SECTOR_;
  }
  context.restore();
   */
  function draw(that,color) {
    if (that.paintCount == 0) {
      context.translate(center,center);//平移以改变旋转中心点
    }
    context.clearRect(-center,-center,size,size);
    context.rotate((3.3)*Math.PI/180)
    context.globalCompositeOperation = '';
    if (that.state == 'expand') {//45次绘图完成
      var index = that.paintCount % that.stagePaintTimes
      that.startAngle = that.easeInOut[index]*90;
      that.endAngle = 4*that.easeInOut[index]*90;
      if ((that.endAngle - that.startAngle) <= that.minAngle){
        that.endAngle = that.startAngle + that.minAngle
      }
      if (index == (that.stagePaintTimes-1)) {
        that.state = 'shorten';
      }
      context.beginPath();
      context.arc(0,0,iRadius,that.startAngle*Math.PI/180,that.endAngle*Math.PI/180);
    } else {
      that.startAngle = 0;
      var index = that.paintCount % that.stagePaintTimes
      that.endAngle = -3*(that.easeInOut[that.stagePaintTimes-1-index])*90
      if (Math.abs(that.endAngle) <= that.minAngle){
        that.endAngle = -that.minAngle;
        if (index == (that.stagePaintTimes-1)){
          that.state = 'expand';
        }
      }
      //context.globalCompositeOperation = 'source-atop';
      context.beginPath();
      context.arc(0,0,iRadius,that.startAngle*Math.PI/180,that.endAngle*Math.PI/180,true);
    }

    context.lineWidth = oRadius - iRadius;
    context.lineCap = 'round'
    var fraction = 1
    context.strokeStyle = 'rgba(' + color +
        (wireless.Spinner.OPACITY_MIN_ + Math.pow(fraction, 3.0) *
        (wireless.Spinner.OPACITY_SLOPE_)) + ')';
    context.stroke();

    that.paintCount++;
  }
};


/**
 * Sets the default spinner color.
 * @param {!Array.<number>} color The default spinner color as an RGB triplet.
 */
wireless.Spinner.setDefaultColor = function(color) {
  goog.asserts.assert(color.length == 3 &&
      color.toString().match('[0-9]+,[0-9]+,[0-9]+'),
      'Color of spinner must be specified as an RGB triplet.');
  wireless.Spinner.defaultColorString_ = color + ',';
};