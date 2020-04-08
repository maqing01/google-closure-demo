goog.provide('apps.uploader.MechanismUnavailableError2');
goog.provide('apps.uploader.UploadManager2');
goog.provide('apps.uploader.UploadManager2.UploadMechanism');

//goog.require('apps.uploader.FlashUploader');
goog.require('apps.uploader.HtmlFormUploader');
//goog.require('apps.uploader.JavaUploader');
//goog.require('apps.uploader.RtmpUploader');
//goog.require('apps.uploader.SilverlightUploader');
goog.require('apps.uploader.XhrUploader');
goog.require('apps.uploader.javadetection');
//goog.require('apps.uploader.silverlightdetection');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.debug.FancyWindow');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.net.XmlHttp');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');
goog.require('goog.userAgent.flash');



/**
 * A class that detects available upload mechanisms and selects the most
 * appropriate one. Supports XHR, Flash, Java, Silverlight, and HTML Form
 * uploads. A brief usage example:
 *
 * <pre>
 * var uploadManager =
 *     new apps.uploader.UploadManager2('http://www.google.com/someService');
 *
 * // Reject possibility of doing Flash-based uploads.
 * var mechanisms = uploadManager.getAvailableMechanisms();
 * goog.array.remove(mechanisms,
 *     apps.uploader.UploadManager2.UploadMechanism.FLASH);
 * uploadManager.restrictMechanisms(mechanisms);
 * </pre>
 *
 *  Remove opt_enableJavaMechanism parameter when customers
 *     are able to deploy the java applet jar file, and when JAVA can be used
 *     more universally.
 *
 * @param {string} sessionServerUrl A session control URL for this upload
 *     manager. All uploads made through uploaders obtained from this object
 *     will be initialized using this URL, which unambiguously specifies the
 *     customer. The uploads go to the specified customer's processing pipeline.
 * @param {boolean=} opt_enableJavaMechanism True if JAVA should be an available
 *     upload mechanism.
 * @param {boolean=} opt_enableVisibleFlash True if FLASH will be used in
 *     windowed mode (non-transparent). Flash using transparency is broken for
 *     flash 10 on Linux, so we only enable flash on Linux if it is visible.
 *     Default is to use transparent flash.
 * @param {boolean=} opt_enableSilverlightMechanism True if SILVERLIGHT should
 *     be an available upload mechanism.
 * @throws {Error} If sessionServerUrl is null or empty.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
apps.uploader.UploadManager2 = function(sessionServerUrl,
    opt_enableJavaMechanism, opt_enableVisibleFlash,
    opt_enableSilverlightMechanism) {
  goog.events.EventTarget.call(this);

  if (goog.string.isEmptySafe(sessionServerUrl)) {
    throw Error("sessionServerUrl can't be empty");
  }

  /**
   * URL used to managed sessions on the server.
   * @type {string}
   * @private
   */
  this.sessionServerUrl_ = sessionServerUrl;

  /**
   * Array of available upload mechanisms.
   * @type {Array.<apps.uploader.UploadManager2.UploadMechanism>}
   * @private
   */
  this.availableMechanisms_ = [];

  /**
   * The constructed uploader.
   * @type {apps.uploader.BaseUploader}
   * @private
   */
  this.uploader_ = null;

  /**
   * Callback function to call when {@link #createUploader} successfully
   * creates an uploader (some uploaders load asynchronously).
   * @type {function(apps.uploader.BaseUploader)|undefined}
   * @private
   */
  this.uploaderOnLoad_ = undefined;

  /**
   * Optional additional flash variables.
   * @type {string|undefined}
   * @private
   */
  this.flashVars_;

  /**
   * Sets if flash should use wmode windowed (true) or transparent (false).
   * @type {boolean}
   * @private
   */
  this.flashIsVisible_ = opt_enableVisibleFlash ? true : false;

  // Upload mechanism detection.
  var isHttpsOnFF2 =
      goog.userAgent.getUserAgentString().indexOf('Firefox/2.') >= 0 &&
      goog.Uri.resolve(window.location, sessionServerUrl).getScheme() ==
          'https';
  // Detect XHR2 support
  //  Add Xhr.upload to //javascript/externs:common.
  if (!!goog.net.XmlHttp()['upload'] && (!goog.userAgent.GECKO ||
      goog.userAgent.isVersionOrHigher('1.9.2'))) {
    this.availableMechanisms_.push(
        apps.uploader.UploadManager2.UploadMechanism.XHR);
  }
  // For the Silverlight uploader we require Silverlight 2.0 or newer.
  // Any corresponding Moonlight version should also be acceptable.
//  if (opt_enableSilverlightMechanism &&
//      apps.uploader.silverlightdetection.isSilverlightAvailable(3, true)) {
//    // NOTE(azzie): On Windows, the Silverlight uploader was tested and
//    // works well with IE, Chrome and Firefox. Silverlight 3 is required
//    // to use client HTTP stack. On Linux, as of 01/08/2011, Moonlight
//    // stable does not work well with Chrome, while Moonlight 4 preview
//    // happens to throw a security exception when opening a file dialog.
//    // Fortunately, this does not really matter for users, as for Linux
//    // browsers the XHR uploader will take priority over Silverlight.
//    // For development, Firefox with Moonlight 2.4.1 stable can be used.
//    this.availableMechanisms_.push(
//        apps.uploader.UploadManager2.UploadMechanism.SILVERLIGHT);
//  }
//  if (opt_enableJavaMechanism && apps.uploader.JavaUploader.isJavaAvailable()) {
//    this.availableMechanisms_.push(
//        apps.uploader.UploadManager2.UploadMechanism.JAVA);
//  }

  // Allow flash 10 or higher for Mac and Windows.
  // Allow flash 11 or higher for Linux (transparent flash will show garbage in
  // the control and hang chrome on flash 10.2.153).
  if (goog.userAgent.flash.HAS_FLASH &&
      ((!goog.userAgent.LINUX &&
      goog.string.compareVersions(goog.userAgent.flash.VERSION, '10') >= 0) ||
      (goog.string.compareVersions(goog.userAgent.flash.VERSION, '11') >= 0))) {
    this.availableMechanisms_.push(
        apps.uploader.UploadManager2.UploadMechanism.FLASH);
  }
  this.availableMechanisms_.push(
      apps.uploader.UploadManager2.UploadMechanism.HTML_FORM);
  goog.log.info(this.logger_,
      'Available mechanisms: ' + this.availableMechanisms_);
};
goog.inherits(apps.uploader.UploadManager2, goog.events.EventTarget);


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.UploadManager2.prototype.logger_ =
    goog.log.getLogger('apps.uploader.UploadManager2');


/**
 * Returns an array of currently available mechanisms. This array is initialized
 * upon the construction of object and it reflects capabilities of user's web
 * browser. It can be further restricted using {@link #restrictMechanisms}.
 * @return {!Array.<apps.uploader.UploadManager2.UploadMechanism>} An array of
 *     upload mechanisms (defense-cloned).
 */
apps.uploader.UploadManager2.prototype.getAvailableMechanisms = function() {
  return goog.array.clone(this.availableMechanisms_);
};


/**
 * @return {apps.uploader.UploadManager2.UploadMechanism} Currently preferred
 *     upload mechanism.
 */
apps.uploader.UploadManager2.prototype.getPreferredMechanism = function() {
  return this.availableMechanisms_[0];
};


/**
 * Restricts available mechanisms to given list of mechanisms or single
 * mechanism. This will narrow the list of available mechanisms to the
 * intersection of currently available mechanisms (as returned from
 * {@link #getAvailableMechanisms}) and mechanisms given as
 * {@code allowedMechanisms}.
 *
 * <p>If {@code opt_forceOrder} is {@code false} or absent, the order of
 * preference for mechanisms is retained. If it's {@code true}, the order of
 * preference will match the new order obtained from {@code allowedMechanisms}
 * array (this has obviously no effect if only one mechanism is given).
 *
 * @param {Array.<apps.uploader.UploadManager2.UploadMechanism>|apps.uploader.UploadManager2.UploadMechanism} allowedMechanisms
 *     Mechanisms that should be taken into consideration.
 * @param {boolean=} opt_forceOrder Whether force preference order or not.
 * @throws {apps.uploader.MechanismUnavailableError} If none of
 *     {@code allowedMechanisms} matches currently available mechanisms. This
 *     prevents situation where the list of available mechanisms is empty.
 * @throws {Error} If {@code allowedMechanisms} is undefined, is an empty array,
 *     or contains unknown mechanism.
 */
apps.uploader.UploadManager2.prototype.restrictMechanisms =
    function(allowedMechanisms, opt_forceOrder) {
  goog.log.info(this.logger_,
      'Restricting mechanisms to: ' + allowedMechanisms);

  if (!allowedMechanisms) {
    throw Error('allowedMechanisms must be defined');
  }

  if (!goog.isArray(allowedMechanisms)) {
    allowedMechanisms = [allowedMechanisms];
  }

  if (goog.array.isEmpty(allowedMechanisms)) {
    throw Error('allowedMechanisms must not be empty');
  }
  goog.array.forEach(
      allowedMechanisms,
      function(mechanism) {
        if (!this.isKnownUploadMechanism(mechanism)) {
          throw Error('Unknown upload mechanism: ' + mechanism);
        }
      },
      this);

  // This is pretty naive, but given the amount of data, it's sufficiently
  // smart. ;-)
  var newMechanisms;
  if (opt_forceOrder) {
    newMechanisms = goog.array.filter(
        allowedMechanisms,
        function(mechanism) {
          return goog.array.contains(this.availableMechanisms_, mechanism);
        },
        this);
  } else {
    newMechanisms =
        goog.array.filter(this.availableMechanisms_, function(mechanism) {
          return goog.array.contains(/** @type {Array} */(allowedMechanisms),
                                     mechanism);
        });
  }

  if (goog.array.isEmpty(newMechanisms)) {
    throw new apps.uploader.MechanismUnavailableError2(
        'No allowed mechanism is currently available');
  }
  this.availableMechanisms_ = newMechanisms;
  goog.log.info(this.logger_, 'Available mechanisms now: ' + newMechanisms);
};


/**
 * Checks if the mechanism's implementation is known to the library.
 * @param {apps.uploader.UploadManager2.UploadMechanism} mechanism Name of
 *     mechanism to be checked.
 * @return {boolean} {@code true} if the mechanism is valid.
 */
apps.uploader.UploadManager2.prototype.isKnownUploadMechanism =
    function(mechanism) {
  return goog.object.contains(apps.uploader.UploadManager2.UploadMechanism,
      mechanism);
};


/**
 * Set options common to all upload mechanisms.
 * @param {string=} opt_userKey A secret key, unique to each user. This
 *     could be used by the upload mechanism to protect some persistent
 *     user-specific data.
 * @param {boolean=} opt_allowRecovery Whether to allow upload recovery
 *     if supported. It requires the user key to be set and is currently
 *     disabled by default. The default is likely to change in the future.
 */
apps.uploader.UploadManager2.prototype.setCommonOptions =
    function(opt_userKey, opt_allowRecovery) {
  this.userKey_ = opt_userKey;
  this.allowRecovery_ = opt_allowRecovery;
};


/**
 * Set options for the HTML form upload mechanism.
 * @param {string|Element!} overlayElement Element ID or DOM node used for the
 *     HTML form uploader overlay. If the created uploader is a
 *     {@link apps.uploader.HtmlFormUploader}, a CSS class
 *     "uploader-overlay-visible" will be added to it as soon as the uploader is
 *     rendered. See {@link apps.uploader.HtmlFormUploader} for details.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 */
apps.uploader.UploadManager2.prototype.setHtmlFormOptions =
    function(overlayElement, opt_disableTabStop) {
  this.formOverlayElement_ = overlayElement;
  this.disableTabStop_ = opt_disableTabStop;
};


/**
 * Set options for the xhr upload mechanism.
 * @param {string|Element!} overlayElement Element ID or DOM node used for the
 *     xhr uploader overlay. If the created uploader is a
 *     {@link apps.uploader.XhrUploader}, a CSS class
 *     "uploader-overlay-visible" will be added to it as soon as the uploader is
 *     rendered. See {@link apps.uploader.XhrUploader} for details.
 * @param {boolean=} opt_listen True if click/action events should
 *     automatically be listened for on the overlay element.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 */
apps.uploader.UploadManager2.prototype.setXhrOptions =
    function(overlayElement, opt_listen, opt_disableTabStop) {
  this.xhrOverlayElement_ = overlayElement;
  this.xhrListen_ = opt_listen;
  this.disableTabStop_ = opt_disableTabStop;
};


/**
 * Set options for the Silverlight upload mechanism.
 * @param {string} xapUrl URL to the xap file with the Silverlight application.
 */
apps.uploader.UploadManager2.prototype.setSilverlightOptions =
    function(xapUrl) {
  this.silverlightXapUrl_ = xapUrl;
};


/**
 * Set options for the Flash upload mechanism.
 * @param {string|Element!} overlayElement Element ID or DOM node used for the
 *     Flash uploader overlay. If the created uploader is a
 *     {@link apps.uploader.FlashUploader}, a CSS class
 *     "uploader-overlay-visible" will be added to it as soon as the uploader is
 *     rendered. See {@link apps.uploader.FlashUploader} for details.
 * @param {string=} opt_swfFlashApiUrl URL to the swf file used for the flash
 *     uploader.
 * @param {string=} opt_flashVars Additional flash vars for the flash object.
 * @param {boolean=} opt_flashIsVisible Determines if flash is windowed mode
 *     (visible) or in transparent mode (invisible).
 */
apps.uploader.UploadManager2.prototype.setFlashOptions = function(
    overlayElement, opt_swfFlashApiUrl, opt_flashVars, opt_flashIsVisible) {
  this.flashOverlayElement_ = overlayElement;
  this.flashSwfApiUrl_ = opt_swfFlashApiUrl;
  this.flashVars_ = opt_flashVars;
  if (goog.isDef(opt_flashIsVisible)) {
    this.flashIsVisible_ = opt_flashIsVisible;
  }
};


/**
 * Sets the applet (java) jar archive URL.
 * @param {string} appletJarUrl The URL to the applet jar archive.
 * @param {string=} opt_locale The locale to use when localizing strings in the
 *     java applet.
 */
apps.uploader.UploadManager2.prototype.setJavaOptions = function(
    appletJarUrl, opt_locale) {
  this.appletJarUrl_ = appletJarUrl;
  this.appletLocale_ = opt_locale;
};


/**
 * Creates an uploader of type corresponding to the preferred upload mechanism.
 * Some uploaders load asynchronously. The Java uploader, for example, requires
 * that a security dialog that is displayed to the user. Flash and Silverlight
 * uploaders need time to load and initialize the core application. It is
 * therefore recommended that asynchronous uploader creation mode is used, i.e.,
 * the opt_uploaderOnLoad callback is specified. Asynchronous uploader creation
 * also enables uploader fallback, i.e., in case initialization fails for some
 * uploader, the next one is tried.
 * @param {function(apps.uploader.BaseUploader)=} opt_uploaderOnLoad The
 *     callback to be called when the uploader is fully loaded and ready to be
 *     used.
 * @return {?apps.uploader.BaseUploader} A new uploader, or null if the
 *     opt_uploaderOnLoad callback is specified (to which the newly created
 *     uploader will be passed).
 * @see #getPreferredMechanism
 */
apps.uploader.UploadManager2.prototype.createUploader = function(
    opt_uploaderOnLoad) {
  //  The overlay element should be passed once for all uploaders,
  //              and not as multiple individual options to some uploaders.
  var overlayElement = null;
  var mechanism = this.getPreferredMechanism();
  if (mechanism) {
    goog.log.info(this.logger_, 'Creating uploader for mechanism ' + mechanism);
  } else {
    goog.log.info(this.logger_, 'No mechanisms left to create an uploader');
  }
  switch (mechanism) {
//    case apps.uploader.UploadManager2.UploadMechanism.JAVA:
//      this.uploader_ = new apps.uploader.JavaUploader(
//          this.appletJarUrl_, this.appletLocale_);
//      break;
    case apps.uploader.UploadManager2.UploadMechanism.XHR:
      this.uploader_ = new apps.uploader.XhrUploader(
          this.xhrListen_, this.disableTabStop_);
      overlayElement = this.xhrOverlayElement_;
      break;
//    case apps.uploader.UploadManager2.UploadMechanism.SILVERLIGHT:
//      this.uploader_ = new apps.uploader.SilverlightUploader(
//          this.silverlightXapUrl_);
//      break;
//    case apps.uploader.UploadManager2.UploadMechanism.FLASH:
//      if (this.flashSwfApiUrl_) {
//        apps.uploader.FlashUploader.setFlashApiSwfUrl(this.flashSwfApiUrl_);
//      }
//      this.uploader_ = new apps.uploader.FlashUploader();
//      if (this.flashVars_) {
//        this.uploader_.setFlashVars(this.flashVars_);
//      }
//      this.uploader_.setFlashVisible(this.flashIsVisible_);
//      overlayElement = this.flashOverlayElement_;
//      break;
    case apps.uploader.UploadManager2.UploadMechanism.HTML_FORM:
      this.uploader_ = new apps.uploader.HtmlFormUploader(this.disableTabStop_);
      overlayElement = this.formOverlayElement_;
      break;
    default:
      this.uploader_ = null;
      break;
  }

  if (!this.uploader_) {
    if (opt_uploaderOnLoad) {
      opt_uploaderOnLoad(null);
    }
    return null;
  }

  this.uploader_.setParentEventTarget(this);
  var element = goog.dom.getElement(overlayElement);
  if (opt_uploaderOnLoad) {
    this.uploaderOnLoad_ = opt_uploaderOnLoad;
    goog.events.listen(this.uploader_, [
          apps.uploader.EventType.APPLET_FAILED_TO_LOAD,
          apps.uploader.EventType.UPLOADER_WITHOUT_PERMISSION,
          apps.uploader.EventType.APPLET_TIMED_OUT,
          apps.uploader.EventType.APPLET_FAILED_TO_INITIALIZE
        ], goog.bind(this.handleMechanismFailed_, this, mechanism, element));
    goog.events.listen(this.uploader_,
        apps.uploader.EventType.UPLOADER_READY,
        goog.bind(this.handleMechanismLoaded_, this, mechanism, element));
  }
  this.uploader_.install(element);

  this.uploader_.setSessionServerUrl(this.sessionServerUrl_);
  if (goog.isBoolean(this.allowRecovery_)) {
    this.uploader_.setAllowRecovery(this.allowRecovery_);
  }
  if (this.userKey_) {
    // setAllowRecovery() should have been called before if appropriate.
    this.uploader_.setUserKey(this.userKey_);
  }
  return opt_uploaderOnLoad ? null : this.uploader_;
};


/**
 * @param {string=} opt_magicWord Set this to 'rtmp' in order to use the
 *     RtmpUploader. We avoid hardcoding the string because we don't want to
 *     publicly leak it in the JS.
 * @return {!apps.uploader.RtmpUploader} a new RtmpUploader.
 */
//apps.uploader.UploadManager2.prototype.createRtmpUploader = function(
//    opt_magicWord) {
//  return new apps.uploader.RtmpUploader(this.sessionServerUrl_, opt_magicWord);
//};


/**
 * Handles when a mechanism has loaded successfully.
 * @param {apps.uploader.UploadManager2.UploadMechanism} mechanism Upload
 *     mechanism which is handled.
 * @param {Element} element The overlay element or null.
 * @param {apps.uploader.UploaderEvent} event Corresponding uploader event.
 * @private
 */
apps.uploader.UploadManager2.prototype.handleMechanismLoaded_ =
    function(mechanism, element, event) {
  // If another uploader is tried, we must discard any deprecated events.
  if (event.uploader != this.uploader_) {
    return;
  }

  // Return the ready uploader.
  if (this.uploaderOnLoad_) {
    this.uploaderOnLoad_(this.uploader_);
    this.uploaderOnLoad_ = undefined;
  }
};


/**
 * Handles when a mechanism has failed loading or initializing.
 * @param {apps.uploader.UploadManager2.UploadMechanism} mechanism Upload
 *     mechanism which is handled.
 * @param {Element} element The overlay element or null.
 * @param {apps.uploader.UploaderEvent} event Corresponding uploader event.
 * @private
 */
apps.uploader.UploadManager2.prototype.handleMechanismFailed_ =
    function(mechanism, element, event) {
  // If another uploader is tried, we must discard any deprecated events.
  if (event.uploader != this.uploader_) {
    return;
  }

  // Remove the current preferred mechanism since it failed to load and try
  // the next one.
  this.uploader_.uninstall(element);
  goog.array.remove(this.availableMechanisms_, mechanism);
  this.createUploader(this.uploaderOnLoad_);
};


/**
 * Enumeration for upload mechanisms.
 * @enum {string}
 */
apps.uploader.UploadManager2.UploadMechanism = {
  JAVA: 'JAVA',
  FLASH: 'FLASH',
  HTML_FORM: 'HTML_FORM',
  XHR: 'XHR',
  SILVERLIGHT: 'Silverlight'
};



/**
 * An exception indicating that there is no upload mechanism available.
 * @param {...*} var_args These arguments are propagated to {@link Error}
 *     constructor.
 * @constructor
 * @extends {Error}
 */
apps.uploader.MechanismUnavailableError2 = function(var_args) {
  Error.apply(this, arguments);
};
goog.inherits(apps.uploader.MechanismUnavailableError2, Error);


/**
 * Create a new FancyWindow so that it starts capturing logging events
 * immediately. It is not enabled, so it will not show the window immediately.
 * {@link apps.uploader.showDebugWindow} should be called to show
 * the debug window.
 */
apps.uploader.debugWindow = new goog.debug.FancyWindow('apps.uploader');
if (apps.uploader.debugWindow) {
  // Check to see if debugWindow is not null.  In certain cases, the JsCompiler
  // can be configured to strip out 'debug' related objects, resulting in a
  // null assignment to apps.uploader.debugWindow.  This check ensures that
  // that isn't the case before we call 'setEnabled'.
  apps.uploader.debugWindow.setEnabled(false);
}


/**
 * Shows the debug window.
 */
apps.uploader.showDebugWindow = function() {
  apps.uploader.debugWindow.setEnabled(true);
};


/**
 * Export apps.uploader.showDebugWindow so that it can be used if the
 * code is compiled.
 * Note that we cannot export the symbol apps.uploader.logger.showDebugWindow,
 * or anything under apps.uploader.logger for that matter, because Doclist uses
 * the JSCompiler flag '--strip_name_suffix="logger"', which would cause a
 * JS error at eval time, due to apps.uploader.logger being undefined.
 */
//goog.exportSymbol('apps.uploader.showDebugWindow',
//                  apps.uploader.showDebugWindow);
