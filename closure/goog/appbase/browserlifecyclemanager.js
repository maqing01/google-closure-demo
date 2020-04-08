goog.provide('office.app.BrowserLifecycleManager');

goog.require('office.app.LifecycleManager');
goog.require('office.app.ServiceId');
goog.require('office.app.UriUtil');
//goog.require('office.net.ImagePingSender');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.userAgent');



/**
 * @param {!Window} win The window object.
 * @param {office.net.NetService} netService The net service for sending XHRs to
 *     the server.
 * @param {string} docId The document id.
 * @constructor
 * @struct
 * @extends {office.app.LifecycleManager}
 */
office.app.BrowserLifecycleManager = function(win, netService, docId) {
  goog.base(this);

  /**
   * The window object.
   * @type {!Window}
   * @private
   */
  this.win_ = win;

  /**
   * @type {office.net.NetService}
   * @private
   */
  this.merlotNetService_ = netService;

  /**
   * @type {string}
   * @private
   */
  this.docId_ = docId;

  goog.events.listen(win, 'beforeunload',
      goog.bind(this.handleBeforeUnload_, this));
};
goog.inherits(office.app.BrowserLifecycleManager, office.app.LifecycleManager);


/**
 * @param {!office.net.NetService} netService The net service for sending XHRs to
 *     the server.
 */
office.app.BrowserLifecycleManager.prototype.registerNetService = function(
    netService) {
  this.merlotNetService_ = netService;
};


/**
 * The beforeunload callback. It executes the callbacks registered via
 * registerBeforeUnloadCallback in the order they were registered, and sets the
 * user prompt if appropriate, or cleans up as needed. The first message that is
 * returned from a callback is displayed to the user. The remaining callbacks
 * are not executed.
 * @param {goog.events.BrowserEvent} e The event object.
 * @return {string|undefined} The confirmMessage to display to the user, if any.
 * @private
 */
office.app.BrowserLifecycleManager.prototype.handleBeforeUnload_ = function(e) {
  if (this.isDisposed()) {
    // Not sure how this is possible, but it does occur occasionally. Should
    // be a no-op.
    return undefined;
  }

  // we don't need confirm messages.
  var confirmMessage = this.getBeforeUnloadConfirmMessage();
  if (confirmMessage) {
    goog.events.listen(this.win_, goog.events.EventType.UNLOAD,
        goog.bind(this.handleUnload, this));
    e.getBrowserEvent().returnValue = confirmMessage;
    // WebKit doesn't support setting returnValue.
    if (goog.userAgent.WEBKIT) {
      return confirmMessage;
    }
  } else {
    this.handleUnload();
  }
};


/** @override */
office.app.BrowserLifecycleManager.prototype.sessionDisconnect = function() {
  // The server URI to notification of disconnection.
  office.app.UriUtil.sendLeaveUri(this.merlotNetService_, this.docId_);
  this.dispose();

//  if (leaveUri) {
//
//    this.merlotNetService_.newRequestBuilder(leaveUri).setContent("{}").buildAndSend();

    // In some browsers (Chrome), async XHRs are not reliably sent in the
    // window.onunload handler. And sync XHRs are problematic for for many
    // reasons. Images are better, although still potentially unreliable. See
    // http://stackoverflow.com/a/7714576
//    var pingbackSender = new office.net.ImagePingSender();
//    try {
//      pingbackSender.sendImage(leaveUri);
//    } catch (error) {
      // This error may have occurred because the application was offline, and
      // in any case this is a 'best effort' request with no hope of proper
      // handling. Ignore.
//    }
//  }
};


/** @override */
office.app.BrowserLifecycleManager.prototype.disposeInternal = function() {
  goog.dispose(this.merlotNetService_);
  delete this.merlotNetService_;

  goog.base(this, 'disposeInternal');
};


/**
 * Constructs and registers the LifecycleManager in the appContext.
 * @param {!fava.AppContext} appContext The app context.
 * @param {!Window} win The window object.
 * @param {office.net.NetService} netService The net service for sending XHRs to
 *     the server.
 * @param {string} docId The document id.
 * @return {!office.app.BrowserLifecycleManager} The LifecycleManager.
 */
office.app.BrowserLifecycleManager.register = function(
    appContext, win, netService, docId) {
  var lifecycleManager = new office.app.BrowserLifecycleManager(
      win, netService, docId);
  appContext.registerService(
      office.app.ServiceId.LIFECYCLE_MANAGER, lifecycleManager);
  return lifecycleManager;
};


/**
 * @param {!fava.AppContext} appContext The app context.
 * @return {!office.app.BrowserLifecycleManager} The lifecycle manager in the app
 *     context.
 */
office.app.BrowserLifecycleManager.get = function(appContext) {
  return /** @type {!office.app.BrowserLifecycleManager} */ (
      appContext.get(office.app.ServiceId.LIFECYCLE_MANAGER));
};
