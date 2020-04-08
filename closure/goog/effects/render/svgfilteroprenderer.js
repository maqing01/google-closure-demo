goog.provide('office.effects.render.SvgFilterOpRenderer');

goog.require('office.effects.filters.ComponentTransferFunction');
goog.require('office.effects.filters.ConvolveFilterOp');
goog.require('office.effects.filters.FilterOp');
goog.require('goog.array');
goog.require('goog.object');



/**
 * Renders {@code office.effects.filters.FilterOp} primitives into a SVG filter
 * effect. Each filter op primitive corresponds to a SVG filter primitive
 * element.
 * @see http://www.w3.org/TR/SVG11/filters.html#FilterElement
 * @param {!Document} doc The parent document the filter element is created in.
 * @constructor
 * @struct
 * @final
 */
office.effects.render.SvgFilterOpRenderer = function(doc) {
  /** @private {!Document} */
  this.doc_ = doc;
};


/**
 * The 'in' or 'in2' attribute for any filter primitive may be any value in this
 * enum or the value of any previous filter primitive element's 'result'
 * attribute.
 *
 * Note: Chrome and Firefox do not currently support BackgroundImage:
 * {@see https://code.google.com/p/chromium/issues/detail?id=137230}
 * {@see https://bugzilla.mozilla.org/show_bug.cgi?id=437554}
 *
 * @see {http://www.w3.org/TR/SVG/filters.html#CommonAttributes}
 * @enum {string}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.FilterPrimitiveIn_ = {
  BACKGROUND_ALPHA: 'BackgroundAlpha',
  BACKGROUND_IMAGE: 'BackgroundImage',
  FILL_PAINT: 'FillPaint',
  SOURCE_ALPHA: 'SourceAlpha',
  SOURCE_GRAPHIC: 'SourceGraphic',
  STROKE_PAINT: 'StrokePaint'
};


/**
 * The SVG namespace.
 * @private {string}
 */
office.effects.render.SvgFilterOpRenderer.SVG_NS_ = 'http://www.w3.org/2000/svg';


/**
 * The default attributes that will be added to all filter elements. These
 * values set the filter region and filter primitive subregion up as a
 * bounding box sized exactly to the referencing image's bounding box, defined
 * in terms of percentages of the bounding box's size.
 * @see {http://www.w3.org/TR/SVG/filters.html#FilterEffectsRegion}
 * @see {http://www.w3.org/TR/SVG/filters.html#FilterPrimitiveSubRegion}
 * @private {!Object.<string>}
 */
office.effects.render.SvgFilterOpRenderer.DEFAULT_FILTER_ATTRIBUTES_ = {
  'filterUnits': 'objectBoundingBox',
  'primitiveUnits': 'objectBoundingBox',
  'x': '0%',
  'y': '0%',
  'width': '100%',
  'height': '100%',
  //  Remove filterRes once Chrome bug http://crbug.com/345441, for
  // animating SVG images with filters, is fixed. Setting the filterRes is a
  // workaround for the issue. This is done for all browsers due to server side
  // caching making it difficult to produce different SVG for different
  // browsers. The value 1000 was chosen after investigating b/13472548.
  // @see http://www.w3.org/TR/SVG/filters.html#FilterEffectsRegion
  'filterRes': '1000'
};


/**
 * Map of ComponentTransferFunction.Type to SVG function element 'type'
 * attribute value.
 * @private
 *      {!Object.<office.effects.filters.ComponentTransferFunction.Type, string>}
 */
office.effects.render.SvgFilterOpRenderer.COMPONENT_TRANSFER_FUNCTION_TYPE_MAP_ =
    goog.object.create(
        office.effects.filters.ComponentTransferFunction.Type.DISCRETE,
        'discrete',
        office.effects.filters.ComponentTransferFunction.Type.TABLE, 'table');


/**
 * Map of ConvolveFilterOp.EdgeMode to SVG convolution edge mode values.
 * @private {!Object.<office.effects.filters.ConvolveFilterOp.EdgeMode, string>}
 */
office.effects.render.SvgFilterOpRenderer.CONVOLUTION_EDGE_MODE_MAP_ =
    goog.object.create(
        office.effects.filters.ConvolveFilterOp.EdgeMode.DUPLICATE, 'duplicate',
        office.effects.filters.ConvolveFilterOp.EdgeMode.NONE, 'none',
        office.effects.filters.ConvolveFilterOp.EdgeMode.WRAP, 'wrap');


/**
 * Renders an array of primitive filter ops as an SVG filter element.
 * @param {!Array.<!office.effects.filters.FilterOp>} filterOps
 * @return {Element}
 * @throws {Error} If filterOps contains an unrenderable filter operation.
 */
office.effects.render.SvgFilterOpRenderer.prototype.renderFilterOps =
    function(filterOps) {
  if (!filterOps.length) {
    return null;
  }
  var filterElement = this.createElement_('filter',
      office.effects.render.SvgFilterOpRenderer.DEFAULT_FILTER_ATTRIBUTES_);
  for (var i = 0; i < filterOps.length; i++) {
    var filterPrimitiveElement = this.renderFilterOp_(filterOps[i], i);
    filterElement.appendChild(filterPrimitiveElement);
  }
  return filterElement;
};


/**
 * Renders a primitive filter op into an SVG filter primitive element.
 * @param {!office.effects.filters.FilterOp} filterOp
 * @param {number} index The index of the current filter op in the processing
 *     pipeline. This may be used to refer to previous filter results.
 * @return {!Element}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.renderFilterOp_ =
    function(filterOp, index) {
  var element;
  var Type = office.effects.filters.FilterOp.Type;
  switch (filterOp.getType()) {
    case Type.COLOR_MATRIX:
      element = this.renderColorMatrixFilterOp_(
          /** @type {!office.effects.filters.ColorMatrixFilterOp} */ (filterOp),
          index);
      break;
    case Type.COMPONENT_TRANSFER:
      element = this.renderComponentTransferFilterOp_(
          /** @type {!office.effects.filters.ComponentTransferFilterOp} */ (
              filterOp), index);
      break;
    case Type.CONVOLVE:
      element = this.renderConvolveFilterOp_(
          /** @type {!office.effects.filters.ConvolveFilterOp} */ (filterOp),
          index);
      break;
    default:
      throw Error('Unknown filter operation type' + filterOp.getType());
  }
  element.setAttribute('result',
      office.effects.render.SvgFilterOpRenderer.getResultNameForIndex_(index));
  // Server-side bitmap rendering happens in sRGB color space, but the default
  // filter primitive color space is linearized RGB. Set sRGB as the filter
  // primitive color space in order to match server side rendering.
  // {@see http://www.w3.org/TR/SVG/filters.html#FilterPrimitivesOverviewIntro}
  element.setAttribute('effect-cif', 'sRGB');
  return element;
};


/**
 * Renders a color matrix filter element for the given color matrix filter
 * operation.
 * @param {!office.effects.filters.ColorMatrixFilterOp} filterOp
 * @param {number} index The index of the current filter op in the processing
 *     pipeline.
 * @return {!Element}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.renderColorMatrixFilterOp_ =
    function(filterOp, index) {
  var values = goog.array.flatten(filterOp.getMatrix().toArray()).join(' ');
  return this.createElement_('feColorMatrix', {
    'in': office.effects.render.SvgFilterOpRenderer.
        getPreviousResultNameOrDefault_(index),
    'type': 'matrix',
    'values': values
  });
};


/**
 * Renders a component transfer filter element for the given filter operation.
 * @param {!office.effects.filters.ComponentTransferFilterOp} filterOp
 * @param {number} index The index of the current filter op in the processing
 *     pipeline.
 * @return {!Element}
 * @private
 * @throws {Error} If there is not at least one non-null transfer function.
 */
office.effects.render.SvgFilterOpRenderer.prototype.
    renderComponentTransferFilterOp_ = function(filterOp, index) {
  if (!filterOp.getRedFunction() && !filterOp.getGreenFunction() &&
      !filterOp.getBlueFunction() && !filterOp.getAlphaFunction()) {
    throw Error('Invalid ComponentTransferFilterOp');
  }

  var feComponentTransfer = this.createElement_('feComponentTransfer', {
    'in': office.effects.render.SvgFilterOpRenderer.
        getPreviousResultNameOrDefault_(index)
  });
  this.maybeAddComponentTransferEl_(
      feComponentTransfer, 'feFuncR', filterOp.getRedFunction());
  this.maybeAddComponentTransferEl_(
      feComponentTransfer, 'feFuncG', filterOp.getGreenFunction());
  this.maybeAddComponentTransferEl_(
      feComponentTransfer, 'feFuncB', filterOp.getBlueFunction());
  this.maybeAddComponentTransferEl_(
      feComponentTransfer, 'feFuncA', filterOp.getAlphaFunction());
  return feComponentTransfer;
};


/**
 * Renders an convolve matrix filter element for the given convolve filter op.
 * @param {!office.effects.filters.ConvolveFilterOp} filterOp
 * @param {number} index
 * @return {!Element}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.renderConvolveFilterOp_ =
    function(filterOp, index) {
  var kernel = filterOp.getKernel();
  var svgEdgeMode = office.effects.render.SvgFilterOpRenderer.
      CONVOLUTION_EDGE_MODE_MAP_[filterOp.getEdgeMode()];
  return this.createElement_('fCM', {
    'in': office.effects.render.SvgFilterOpRenderer.
        getPreviousResultNameOrDefault_(index),
    'edgeMode': svgEdgeMode,
    'kernelMatrix': kernel.getValues().join(' '),
    'order': [kernel.getOrderX(), kernel.getOrderY()].join(' '),
    'targetX': kernel.getTargetX(),
    'targetY': kernel.getTargetY(),
    'preserveAlpha': filterOp.getPreserveAlpha()
  });
};


/**
 * Adds a child function element to a feComponentTransfer element for the given
 * transfer function. Does nothing if the transfer function is null.
 * @param {!Element} feComponentTransferEl The parent element.
 * @param {string} tagName The function element name. Must be one of feFuncR,
 *     feFuncG, feFuncB, or feFuncA.
 * @param {office.effects.filters.ComponentTransferFunction} transferFunction
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.maybeAddComponentTransferEl_ =
    function(feComponentTransferEl, tagName, transferFunction) {
  if (!transferFunction) {
    return;
  }

  var functionEl = this.createElement_(tagName);
  var type = transferFunction.getType();
  var elementType = office.effects.render.SvgFilterOpRenderer.
      COMPONENT_TRANSFER_FUNCTION_TYPE_MAP_[type];
  switch (type) {
    case office.effects.filters.ComponentTransferFunction.Type.DISCRETE:
      var discreteFunction = /** @type {!office.effects.filters.
          DiscreteComponentTransferFunction} */ (transferFunction);
      office.effects.render.SvgFilterOpRenderer.setDomAttributes_(functionEl, {
        'type': elementType,
        'tableValues': discreteFunction.getDiscreteValues().join(' ')
      });
      break;
    case office.effects.filters.ComponentTransferFunction.Type.TABLE:
      var tableFunction = /** @type {!office.effects.filters.
          TableComponentTransferFunction} */ (transferFunction);
      office.effects.render.SvgFilterOpRenderer.setDomAttributes_(functionEl, {
        'type': elementType,
        'tableValues': tableFunction.getTableValues().join(' ')
      });
      break;
    default:
      throw Error('Unknown function type ' + transferFunction.getType());
  }
  feComponentTransferEl.appendChild(functionEl);
};


/**
 * Returns a string to use as the 'result' attribute for a filter at the given
 * index. For more information on the result attribute
 * {@see office.effects.render.SvgFilterOpRenderer.FilterPrimitiveIn_}.
 * @param {number} index The index used to build the result name.
 * @return {string}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.getResultNameForIndex_ =
    function(index) {
  return 'result-' + index;
};


/**
 * Returns the result name of the filter prior to the given index, or
 * a default value if index is 0.
 * @param {number} index The index of the current filter op.
 * @param {office.effects.render.SvgFilterOpRenderer.FilterPrimitiveIn_=}
 *     opt_default The default value if index is 0. Defaults to SourceGraphic.
 * @return {string}
 * @private
 */
office.effects.render.SvgFilterOpRenderer.getPreviousResultNameOrDefault_ =
    function(index, opt_default) {
  var SvgFilterOpRenderer = office.effects.render.SvgFilterOpRenderer;
  return index > 0 ?
      SvgFilterOpRenderer.getResultNameForIndex_(index - 1) :
      opt_default || SvgFilterOpRenderer.FilterPrimitiveIn_.SOURCE_GRAPHIC;
};


//  Make {@code createElement_} and {@code {createElementNs_}
// common with {@code sketchy.graphics.SvgGraphics}.
/**
 * Creates a new SVG element.
 * @param {string} name Element name.
 * @param {!Object=} opt_attrs Map of DOM attribute name to value.
 * @return {!Element} DOM node.
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.createElement_ =
    function(name, opt_attrs) {
  return this.createElementNS_(
      office.effects.render.SvgFilterOpRenderer.SVG_NS_, name, opt_attrs);
};


/**
 * Creates a new element in the given namespace.
 * @param {string} ns Namespace.
 * @param {string} name Element name.
 * @param {!Object=} opt_attrs Map of DOM attribute name to value.
 * @return {!Element} DOM node.
 * @private
 */
office.effects.render.SvgFilterOpRenderer.prototype.createElementNS_ =
    function(ns, name, opt_attrs) {
  var element = this.doc_.createElementNS(ns, name);
  if (opt_attrs) {
    office.effects.render.SvgFilterOpRenderer.setDomAttributes_(
        element, opt_attrs);
  }
  return element;
};


/**
 * Sets the key-value pairs in the {@code attrs} object as attributes on the
 * element.
 * @param {!Element} element
 * @param {!Object} attrs Map of DOM attribute name to value.
 * @private
 */
office.effects.render.SvgFilterOpRenderer.setDomAttributes_ =
    function(element, attrs) {
  for (var key in attrs) {
    if (!goog.isDefAndNotNull(attrs[key])) {
      throw Error('Can not set attribute ' + key + ' to undefined or null');
    }
    element.setAttribute(key, attrs[key]);
  }
};
