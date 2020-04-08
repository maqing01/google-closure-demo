goog.provide('office.net.NetService');

goog.require('office.debug.ErrorReporter');
goog.require('office.net.BrowserChannelService');
goog.require('office.net.BrowserChannelStateChangedEvent');
goog.require('office.net.NetEvent');
goog.require('office.net.RateLimitedQueue');
goog.require('office.net.RequestBuilderService');
goog.require('office.net.RequestInternal');
goog.require('office.net.RequestSender');
goog.require('office.net.RequestUrlState');
goog.require('office.net.ResponseReceivedEvent');
goog.require('office.net.Status');
goog.require('office.net.XsrfTokenProvider');
goog.require('office.net.constants');
goog.require('office.net.constants.RestartInstruction');
goog.require('office.util.CallOnceTracker');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.string');
goog.require('proto.fava.request.ErrorResponse');
goog.require('office.apiFlagUtil');



office.net.NetService = function (requestBuilderFactory, opt_window,
                                  opt_errorReporter, opt_status, opt_infoParameters, opt_limiter,
                                  opt_includeXsrfHeader, opt_sessionData) {
  goog.base(this);


  this.requestBuilderFactory_ = requestBuilderFactory;


  this.requestUrlState_ = new office.net.RequestUrlState(
      opt_window, opt_infoParameters, opt_includeXsrfHeader);


  this.browserChannelService_ =
      new office.net.BrowserChannelService(this.requestUrlState_);


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.errorReporter_ = opt_errorReporter || null;


  if (opt_errorReporter) {
    this.eventHandler_.listen(opt_errorReporter,
        office.debug.ErrorReporter.EventType.FATAL_ERROR,
        this.handleFatalError_);
  }


  this.status_ = opt_status || new office.net.Status();


  this.sessionData_ = opt_sessionData || null;


  this.callOnceTracker_ = new office.util.CallOnceTracker();


  this.pendingRequests_ = [];


  this.suspendedRequests_ = [];


  this.rateLimitedQueue_ = new office.net.RateLimitedQueue(
      goog.bind(this.sendWithoutLimitCheck_, this), opt_limiter);


  this.logger_ = goog.log.getLogger('office.net.NetService');


  this.offlineObserver_ = null;

  this.eventHandler_.listen(this.browserChannelService_,
      office.net.BrowserChannelStateChangedEvent.TYPE,
      this.handleBrowserChannelStateChange_);
};
goog.inherits(office.net.NetService, goog.events.EventTarget);



office.net.NetService.prototype.registerBrowserChannel = function (browserChannel) {
  this.browserChannelService_.registerBrowserChannel(browserChannel);
};


office.net.NetService.prototype.setHeaders = function (headers) {
  this.requestUrlState_.setHeaders(headers);
};

office.net.NetService.prototype.removeHeader = function (key) {
  this.requestUrlState_.removeHeader(key);
};

office.net.NetService.prototype.setReleaseIdentifier = function (releaseId) {
  this.requestUrlState_.setReleaseIdentifier(releaseId);
};



office.net.NetService.prototype.newRequestBuilder = function (path) {
  goog.asserts.assert(goog.string.startsWith(path, '/'));
  var token = goog.uri.utils.getParamValue(window.location.href,
      'API-SESSION-TOKEN');
  if (!!token) {
    path = goog.uri.utils.appendParam(path, 'API-SESSION-TOKEN', token);
  }

  path = office.apiFlagUtil.getUrl(path);

  var requestBuilder = this.newNonPrefixedRequestBuilder(path);
  requestBuilder.setUrlPrefix(this.requestUrlState_.getUrlPrefix());
  return requestBuilder;
};



office.net.NetService.prototype.newNonPrefixedRequestBuilder = function (url) {
  return this.requestBuilderFactory_.createRequestBuilder(
      this /* requestSender */, url, this /* xsrfTokenProvider */,
      this.sessionData_ /* sessionData */);
};



office.net.NetService.prototype.setOfflineObserver = function (observer) {
  this.offlineObserver_ = observer;
};



office.net.NetService.prototype.send = function (request) {
  if (request.isDisposed()) {
    goog.log.fine(
        this.logger_, 'Trying to send a disposed request. Ignoring...');
    return;
  }

  var requestInternal = /** @type {!office.net.RequestInternal} */ (request);



  goog.array.insert(this.pendingRequests_, requestInternal);

  this.rateLimitedQueue_.enqueue(requestInternal);

  this.eventHandler_.listenOnce(requestInternal,
      office.net.RequestInternal.EventType.COMPLETE, this.handleRequestComplete_);
};



office.net.NetService.prototype.sendWithoutLimitCheck_ = function (request) {
  if (this.status_.getState().isUnrecoverable()) {
    return;
  }

  if (this.status_.getState() == office.net.Status.State.IDLE) {

    this.status_.setState(office.net.Status.State.BUSY);
  }

  if (this.offlineObserver_) {
    this.offlineObserver_.notifyNetworkRequest();
  }

  this.eventHandler_.listenOnce(
 (request),
      office.net.ResponseReceivedEvent.TYPE,
      this.handleResponseReceived_);
  request.send(this.requestUrlState_);
};



office.net.NetService.prototype.handleResponseReceived_ = function (event) {
  var request = /** @type {!office.net.RequestInternal} */ (event.target);
  var response = event.response;

  this.detectRestartSoonInstruction_(response);

  this.reportMissingContentForSuccessfulResponse_(request, response);

  var netEvent = response.createNetEvent();
  if (!netEvent) {
    return;
  }
  this.notifyObserverOfRequestCompletion_(request,(netEvent.type));
  var shouldDispatch = true;
  if (netEvent.type == office.net.NetEvent.Type.SUCCESS) {
    try {
      goog.log.fine(this.logger_, 'A request succeeded.');
      request.handleSuccess(response);
      this.onRequestDone_(request);
    } catch (error) {
      console.log(error);
      throw error;
      netEvent = new office.net.NetEvent(office.net.NetEvent.Type.CLIENT_ERROR,
          netEvent.errorCode, netEvent.httpStatus);
      netEvent.cause = error;
      netEvent.originalType = office.net.NetEvent.Type.SUCCESS;
      this.onRequestDone_(request, office.net.Status.State.CLIENT_ERROR);
    }
    request.dispose();
  } else if (netEvent.type == office.net.NetEvent.Type.NETWORK_WARNING ||
      netEvent.type == office.net.NetEvent.Type.SERVER_WARNING) {

    switch (this.onRequestTransientFailure_(netEvent, request, response)) {
      case office.net.NetService.TransientFailureDisposition_.BECOME_ERROR:
        netEvent.originalType =
 (netEvent.type);
        netEvent.type = office.net.NetEvent.Type.ERROR;
        break;
      case office.net.NetService.TransientFailureDisposition_.IGNORE:
        shouldDispatch = false;
        break;
      case office.net.NetService.TransientFailureDisposition_.WARN:
        this.maybeLogServerError_(netEvent);
        break;
    }
  } else if (netEvent.type == office.net.NetEvent.Type.RESTART_NOW) {
    if (this.errorReporter_) {
      this.errorReporter_.info(Error('Incompatible server'));
    }
    this.onRequestDone_(request, office.net.Status.State.INCOMPATIBLE_SERVER);
    shouldDispatch = false;
  }
  if (netEvent.type == office.net.NetEvent.Type.ERROR) {
    goog.log.fine(this.logger_, 'A request failed, abandoning it.');
    this.maybeLogServerError_(netEvent);
    try {
      if (request.handleError(netEvent) == false) {
        shouldDispatch = false;
      }
      if (request.isExternalServerRequest()) {

        this.onRequestDone_(request);
      } else {
        var status = request.calculateErrorNetStatus(netEvent) ||
            this.getOfflineStateFromHttpStatus_(netEvent.httpStatus);

        this.onRequestDone_(request, status);
      }
    } catch (error) {
      throw error;
      netEvent = new office.net.NetEvent(office.net.NetEvent.Type.CLIENT_ERROR,
          netEvent.errorCode, netEvent.httpStatus);
      netEvent.cause = error;
      netEvent.originalType = office.net.NetEvent.Type.ERROR;
      this.onRequestDone_(request, office.net.Status.State.CLIENT_ERROR);
    }
    request.dispose();
  }

  if (shouldDispatch) {
    netEvent.debugString = request.getUri();
    this.dispatchEvent(netEvent);
  }
};



office.net.NetService.prototype.reportMissingContentForSuccessfulResponse_ =
    function (request, response) {
      if (this.errorReporter_ && response.isSuccessfulWithMissingContent()) {
        if (request.shouldLogFailure()) {


          this.errorReporter_.log(
              Error('blank JSON response'), response.getLogContext());
        }
      }
    };



office.net.NetService.prototype.maybeLogServerError_ = function (netEvent) {
  if (netEvent.appData instanceof proto.fava.request.ErrorResponse) {
    var message = netEvent.appData.getErrorMessage();
    if (message) {
      goog.log.error(this.logger_, 'Server response sent error: ' + message);
    }
  }
};



office.net.NetService.prototype.notifyObserverOfRequestCompletion_ =
    function (request, eventType) {
      if (!this.offlineObserver_) {
        return;
      }

      var isWarning = eventType == office.net.NetEvent.Type.NETWORK_WARNING;
      if (isWarning && request.isExpectFlaky()) {
        this.offlineObserver_.notifyPotentialStateChange();
      } else {
        this.offlineObserver_.notifyNetworkResult(!isWarning /* wasSuccess */);
      }
    };



office.net.NetService.prototype.handleRequestComplete_ = function (e) {
  var request = /** @type {!office.net.RequestInternal} */ (e.target);
  if (this.rateLimitedQueue_.contains(request)) {

    this.rateLimitedQueue_.remove(request);
  } else if (goog.array.contains(this.pendingRequests_, request)) {


    this.eventHandler_.unlisten(
 (request),
        office.net.ResponseReceivedEvent.TYPE,
        this.handleResponseReceived_);

    this.onRequestDone_(request);
  }
  goog.array.remove(this.pendingRequests_, request);
  goog.array.remove(this.suspendedRequests_, request);
};



office.net.NetService.prototype.onRequestDone_ = function (request,
                                                           opt_offlineState) {
  var state = this.status_.getState();
  var newState = state;
  var offlineState = opt_offlineState || office.net.Status.State.OFFLINE;
  var success = !opt_offlineState;

  goog.array.remove(this.pendingRequests_, request);
  goog.array.remove(this.suspendedRequests_, request);

  goog.asserts.assert(!this.rateLimitedQueue_.contains(request),
      'Request completed while in rate limited queue.');
  goog.asserts.assert(state != office.net.Status.State.IDLE,
      'Request completed with NetService in IDLE state - illegal');
  goog.asserts.assert(offlineState.isOffline(), 'Must be an offline state');


  if (state.isUnrecoverable()) {
    return;
  } else if (offlineState.isUnrecoverable()) {
    this.status_.setState(offlineState);
    return;
  }


  var canGoOffline = this.browserChannelService_.hasBrowserChannel() ||
      goog.array.some(
          this.pendingRequests_,
          function (request) {
            return request.isGuaranteedDelivery();
          });

  if (state == office.net.Status.State.BUSY) {
    if (success || !canGoOffline) {
      if (this.pendingRequests_.length == 0) {
        newState = office.net.Status.State.IDLE;
      }
    } else {
      this.maybeRecycleBC_();
      newState = offlineState;
    }
  } else {
    goog.asserts.assert(request.isGuaranteedDelivery() || canGoOffline,
        'Offline without either a browser channel or a guaranteed delivery ' +
        'request - illegal.');

    if (success) {
      if (this.pendingRequests_.length > 0) {
        newState = office.net.Status.State.RECOVERING;
        this.wakeSuspendedRequest_();
      } else {
        if (!this.browserChannelService_.hasBrowserChannel() ||
            this.browserChannelService_.isBrowserChannelOk()) {
          newState = office.net.Status.State.IDLE;
        }
      }
    } else {
      newState = offlineState;
    }
  }
  this.status_.setState(newState);
};



office.net.NetService.TransientFailureDisposition_ = {

  BECOME_ERROR: 1,

  WARN: 2,

  IGNORE: 3
};



office.net.NetService.prototype.onRequestTransientFailure_ = function (netEvent, request, response) {
  var causedByXsrf = false;
  if (netEvent.httpStatus == 409) {
    var error = response.parseErrorResponseProto();
    if (error) {
        this.setXsrfToken(error.getData().substr(1, error.getData().length - 2));
        causedByXsrf = true;
    }
  }

  var stateIsUnrecoverable = this.status_.getState().isUnrecoverable();
  var serverWarning = netEvent.type == office.net.NetEvent.Type.SERVER_WARNING;

  if (!stateIsUnrecoverable && (causedByXsrf || request.hasRetries())) {
    this.scheduleRetry_(request, false /* no backoff */);
    return office.net.NetService.TransientFailureDisposition_.IGNORE;
  } else {
    if (!request.isGuaranteedDelivery()) {
      return office.net.NetService.TransientFailureDisposition_.BECOME_ERROR;
    } else if (stateIsUnrecoverable) {
      return office.net.NetService.TransientFailureDisposition_.WARN;
    } else if (this.browserChannelService_.hasBrowserChannel() && !serverWarning) {
      this.suspendedRequests_.push(request);
    } else {


      this.scheduleRetry_(request, true /* exponential backoff */);
    }
    this.maybeRecycleBC_();
    this.status_.setState(
        this.getOfflineStateFromHttpStatus_(netEvent.httpStatus));
    return office.net.NetService.TransientFailureDisposition_.WARN;
  }
};



office.net.NetService.prototype.maybeRecycleBC_ = function () {
  if (this.browserChannelService_.hasBrowserChannel() &&
      this.status_.getState().isOk()) {

    this.browserChannelService_.recycleBrowserChannel();
  }
};



office.net.NetService.prototype.getStatus = function () {
  return this.status_;
};



office.net.NetService.prototype.scheduleRetry_ = function (request, backoff) {
  var delay = request.calculateDelayToNextRetry(backoff);


  this.callOnceTracker_.callOnce(goog.bind(this.send, this, request), delay);
};



office.net.NetService.prototype.handleBrowserChannelStateChange_ =
    function (event) {
      var state = this.status_.getState();

      if (state.isUnrecoverable()) {
        return;
      }

      if (!event.isHealthy) {
        this.status_.setState(
            this.getOfflineStateFromHttpStatus_(event.lastHttpStatusCode));
      } else if (state.isError()) {
        if (this.pendingRequests_.length > 0) {
          this.status_.setState(office.net.Status.State.RECOVERING);
          this.wakeSuspendedRequest_();
        } else {
          this.status_.setState(office.net.Status.State.IDLE);
        }
      }
    };



office.net.NetService.prototype.detectRestartSoonInstruction_ =
    function (response) {
      if (response.getHeader(
              office.net.constants.RESTART_INSTRUCTION_HEADER_NAME) ==
          office.net.constants.RestartInstruction.SOON) {
        this.status_.dispatchRestartSoonEvent();
      }
    };



office.net.NetService.prototype.wakeSuspendedRequest_ = function () {
  goog.log.fine(this.logger_, 'restartSuspendedRequest_()');
  var request = this.suspendedRequests_.shift();
  if (request) {
    this.send(request);
  }
};



office.net.NetService.prototype.getUrlPrefix = function () {
  return this.requestUrlState_.getUrlPrefix();
};



office.net.NetService.prototype.setUrlPrefix = function (urlPrefix) {
  this.requestUrlState_.setUrlPrefix(urlPrefix);
};



office.net.NetService.prototype.getOfflineStateFromHttpStatus_ = function (httpStatus) {
  if (httpStatus == 404) {
    return office.net.Status.State.OFFLINE;
  } else if (httpStatus == 401) {
    return office.net.Status.State.AUTH_REQUIRED;
  } else if (httpStatus == 502) {
    return office.net.Status.State.OFFLINE;
  } else if (httpStatus == 456) {
    return office.net.Status.State.TOO_MANY_SESSION;
  } else if (httpStatus == 403) {
    return office.net.Status.State.FORBIDDEN;
  } else if (httpStatus == 202 || httpStatus == 405 || httpStatus == 409 ||
      httpStatus == 429 || httpStatus >= 500 && httpStatus <= 599 &&
      httpStatus != office.net.constants.NON_RETRYABLE_HTTP_STATUS_CODE) {
    return office.net.Status.State.SERVER_DOWN;
  } else if (httpStatus >= 400 && httpStatus <= 499 ||
      httpStatus == office.net.constants.NON_RETRYABLE_HTTP_STATUS_CODE) {
    return office.net.Status.State.CLIENT_ERROR;
  } else {
    return office.net.Status.State.OFFLINE;
  }
};



office.net.NetService.prototype.setInfoParam = function (key, value) {
  this.requestUrlState_.setInfoParam(key, value);
  return this;
};



office.net.NetService.prototype.setXsrfToken = function (xsrfToken) {
  this.requestUrlState_.setXsrfToken(xsrfToken);
};



office.net.NetService.prototype.getXsrfToken = function () {
  return this.requestUrlState_.getXsrfToken();
};



office.net.NetService.prototype.getDeferredXsrfToken = function () {
  return this.requestUrlState_.getDeferredXsrfToken();
};



office.net.NetService.prototype.setAuthKey = function (authKey) {
  this.requestUrlState_.setAuthKey(authKey);
};



office.net.NetService.prototype.getInfoParams = function () {
  return this.requestUrlState_.getInfoParams();
};



office.net.NetService.prototype.handleFatalError_ = function () {
  this.status_.setState(office.net.Status.State.CLIENT_ERROR);
};



office.net.NetService.prototype.disposeInternal = function () {






  goog.disposeAll(this.pendingRequests_);
  goog.dispose(this.browserChannelService_);
  goog.dispose(this.requestUrlState_);
  goog.dispose(this.callOnceTracker_);
  goog.dispose(this.rateLimitedQueue_);
  goog.dispose(this.eventHandler_);
  goog.base(this, 'disposeInternal');
};
