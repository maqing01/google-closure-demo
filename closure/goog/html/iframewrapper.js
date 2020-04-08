goog.provide('office.html.IframeWrapper');

goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.iframe');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('goog.userAgent');



/**
 * An iframe wrapper that manages the asynchronous loading of iframes.
 * @param {boolean} isSandboxed Whether the iframe should be sandboxed.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.html.IframeWrapper = function(isSandboxed) {
  goog.base(this);

  /** @private {!goog.events.EventHandler.<!office.html.IframeWrapper>} */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /** @private {boolean} */
  this.iframeLoaded_ = false;

  /** @private {boolean} */
  this.isSandboxed_ = isSandboxed;

  /** @private {HTMLIFrameElement} */
  this.iframe_ = null;

  /** @private {Element} */
  this.iframeBody_ = null;

  /** @private {?function()} */
  this.iframeLoadHandler_ = null;

  /** @private {number} */
  this.reloadAttempts_ = 0;
};
goog.inherits(office.html.IframeWrapper, goog.Disposable);


/**
 * Whether the user agent is FF4+. The usage agent version matches the mozilla
 * version, which is 2 for FF4.
 * @type {boolean}
 * @private
 */
office.html.IframeWrapper.IS_FF_4_ = goog.userAgent.GECKO &&
    goog.userAgent.isVersionOrHigher('2');


/**
 * The source of the blank iframe to create.
 * @type {string}
 * @private
 */
office.html.IframeWrapper.IFRAME_BLANK_SOURCE_ =
    office.html.IframeWrapper.IS_FF_4_ ?
        goog.dom.iframe.BLANK_SOURCE_NEW_FRAME :
        goog.dom.iframe.BLANK_SOURCE;


/**
 * The source of the iframe when it is sandboxed. We cannot have javascript:''
 * as the source since script execution is prevented in sandboxed iframes.
 * @type {string}
 * @private
 */
office.html.IframeWrapper.SANDBOX_IFRAME_SOURCE_ = 'about:blank';


/**
 * The maximum number of times to attempt to reload the target iframe
 * before initialization fails entirely.
 * @type {number}
 * @private
 */
office.html.IframeWrapper.MAX_IFRAME_RELOADS_ = 3;


/**
 * Whether iframe load failures should be retried.
 * @type {boolean}
 * @private
 */
office.html.IframeWrapper.SHOULD_RETRY_ON_IFRAME_LOAD_FAILURE_ =
    !goog.userAgent.WEBKIT;


/**
 * @return {string} The iframe source to use.
 * @private
 */
office.html.IframeWrapper.prototype.getIframeSource_ = function() {
  return this.isSandboxed_ ?
      office.html.IframeWrapper.SANDBOX_IFRAME_SOURCE_ :
      office.html.IframeWrapper.IFRAME_BLANK_SOURCE_;
};


/**
 * @return {boolean} Whether the iframe load was synchronous.
 * @private
 */
office.html.IframeWrapper.prototype.wasIframeLoadSynchronous_ = function() {
  // When using about:blank, only webkit loads the iframes synchronously.
  if (this.isSandboxed_) {
    return goog.userAgent.WEBKIT;
  }

  return goog.userAgent.WEBKIT || office.html.IframeWrapper.IS_FF_4_;
};


/**
 * Creates the iframe element and appends it to the document.
 * @param {string} initialHtml The initial html to populate the iframe with.
 * @param {string} className The css class to be applied to the iframe.
 * @param {Element=} opt_parent A parent element for the iframe. If one is not
 *     specified, the document object is used.
 * @param {!goog.dom.DomHelper=} opt_domHelper The dom helper.
 * @return {!goog.async.Deferred} The deferred that is called with the iframe
 *     when the iframe finishes loading.
 */
office.html.IframeWrapper.prototype.initialize = function(
    initialHtml, className, opt_parent, opt_domHelper) {
  var domHelper = opt_domHelper || goog.dom.getDomHelper();

  var attributes = {
    'className': className,
    'src': this.getIframeSource_()
  };
  if (this.isSandboxed_) {
    // Set 'allow-same-origin' so that the parent iframe can access the iframe's
    // DOM.
    //attributes['sandbox'] = 'allow-same-origin';
  }

  this.iframe_ = /** @type {!HTMLIFrameElement} */ (domHelper.createDom(
      goog.dom.TagName.IFRAME, attributes));

  var deferred = new goog.async.Deferred();
  this.iframeLoadHandler_ = goog.functions.lock(goog.bind(
      this.handleIframeLoad_, this, deferred, initialHtml, domHelper));

  var synchronousLoad = this.wasIframeLoadSynchronous_();
  if (!synchronousLoad) {
    this.eventHandler_.listen(this.iframe_, goog.events.EventType.LOAD,
        this.iframeLoadHandler_);
  }

  var parent = opt_parent || domHelper.getDocument().body;
  domHelper.appendChild(parent, this.iframe_);

  if (synchronousLoad) {
    this.iframeLoadHandler_();
  }

  return deferred;
};


/**
 * @param {!goog.async.Deferred} deferred The deferred to call with the iframe
 *     when iframe load completes.
 * @param {string} initialHtml The initial html to populate the iframe with.
 * @param {!goog.dom.DomHelper} domHelper The dom helper.
 * @private
 */
office.html.IframeWrapper.prototype.handleIframeLoad_ = function(
    deferred, initialHtml, domHelper) {
  try {
    // Sometimes, the iframe is initialized with the wrong src when restoring
    // tabs after a failure. This causes the call below to fail with a security
    // exception. To deal with this, we catch the security exception and reset
    // the SRC attribute to force a reload.
    var iframeDocument = this.iframe_.contentWindow.document;
    this.eventHandler_.unlisten(this.iframe_, goog.events.EventType.LOAD,
        this.iframeLoadHandler_);
    goog.dom.iframe.writeContent(/** @type {!HTMLIFrameElement} */ (
        this.iframe_), initialHtml);
    this.iframeBody_ = iframeDocument.body;
    this.iframeLoaded_ = true;
    deferred.callback(this.iframe_);
  } catch (e) {
    // This check is a failsafe to prevent a browser from going into an infinite
    // loop.
    if (!office.html.IframeWrapper.SHOULD_RETRY_ON_IFRAME_LOAD_FAILURE_ ||
        this.reloadAttempts_ > office.html.IframeWrapper.MAX_IFRAME_RELOADS_) {
      this.eventHandler_.unlisten(this.iframe_, goog.events.EventType.LOAD,
          this.iframeLoadHandler_);
      deferred.errback('target iframe failed.');
    } else {
      // This call below will cause the iframe LOAD event to fire, forcing
      // initialize_ to be called again.
      this.iframe_.src = this.getIframeSource_();
      this.reloadAttempts_++;
    }
  }
};


/**
 * @return {boolean} Whether the hidden sizing iframe has loaded.
 */
office.html.IframeWrapper.prototype.isIframeLoaded = function() {
  return this.iframeLoaded_;
};


/**
 * @return {!Element} The iframe body element if the iframe is loaded.
 * @throws if called before the iframe is loaded.
 */
office.html.IframeWrapper.prototype.getIframeBody = function() {
  if (!this.iframeBody_ || !this.iframeLoaded_) {
    throw Error('Iframe not loaded.');
  }
  return /** @type {!Element} */ (this.iframeBody_);
};


/** @override */
office.html.IframeWrapper.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);

  goog.base(this, 'disposeInternal');
};
