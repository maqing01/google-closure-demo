goog.provide('office.debug.ErrorReporter');
goog.provide('office.debug.ErrorReporter.EventType');
goog.provide('office.debug.ErrorReporter.Severity');



goog.require('office.debug.ErrorReporterApi');

goog.require('office.debug.MemoryErrorSender');
goog.require('office.debug.ServiceId');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.net.constants');

goog.require('goog.array');
goog.require('goog.debug.ErrorReporter');
goog.require('goog.debug.LogBuffer');
goog.require('goog.debug.TextFormatter');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.object');
goog.require('goog.uri.utils');




office.debug.ErrorReporter = function(opt_useVerboseErrorDialog, opt_baseKey,
    opt_maxErrorsStored, opt_ignoreDebugMode, opt_suppressDialog,
    opt_signalFatalErrorFn) {
  goog.events.EventTarget.call(this);


  this.dynamicContext_ = {};


  this.errorReporter_ = null;


  this.staticContext_ = {};


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.useVerboseErrorDialog_ = !!opt_useVerboseErrorDialog;


  this.suppressDialog_ = !!opt_suppressDialog;


  this.signalFatalErrorFn_ = opt_signalFatalErrorFn || null;





  this.errorSender_ = null;








    this.errorSender_ = new office.debug.MemoryErrorSender(opt_maxErrorsStored);


  var loggingUrl =
      office.flag.getInstance().getString(office.flag.Flags.SITE_URL_PREFIX);
  loggingUrl += office.net.constants.JS_ERROR_SERVLET_URL;







  if (opt_ignoreDebugMode || !goog.DEBUG) {
    if (office.debug.ErrorReporter.installed_) {
      throw Error('ErrorReporter already installed.');
    }
    office.debug.ErrorReporter.installed_ = true;

    this.errorReporter_ = goog.debug.ErrorReporter.install(
        loggingUrl, goog.bind(this.provideLogData_, this), false);
    var headers = {};
    headers[office.net.constants.XSRF_HEADER_NAME] =
        office.net.constants.XSRF_HEADER_VALUE;
    this.errorReporter_.setLoggingHeaders(headers);
    this.errorReporter_.setXhrSender(goog.bind(this.sendError_, this));



    this.eventHandler_.listen(this.errorReporter_,
        goog.debug.ErrorReporter.ExceptionEvent.TYPE,
        this.handleClosureErrorEvent_);
  }


  this.logger_ = goog.log.getLogger('office.debug.ErrorReporter');


  this.fatalSentToServer_ = false;


  this.shouldSendError_ = true;


  this.forceSendError_ = false;
};
goog.inherits(office.debug.ErrorReporter, goog.events.EventTarget);



office.debug.ErrorReporter.CONTEXT_PARAM_CLIENT_LOG = 'log';



office.debug.ErrorReporter.CONTEXT_PARAM_DOCID_ = 'did';



office.debug.ErrorReporter.CONTEXT_PARAM_SEVERITY = 'level';



office.debug.ErrorReporter.EventType = {

  FATAL_ERROR: goog.events.getUniqueId('fatal-error'),

  INCIDENT: goog.events.getUniqueId('incident')
};



office.debug.ErrorReporter.Severity = {

  FATAL_ERROR: 'f',

  INCIDENT: 'i',

  POST_FATAL_ERROR: 'p',

  POST_FATAL_INCIDENT: 'w',

  WARNING: 'warning'
};



office.debug.ErrorReporter.installed_ = false;



office.debug.ErrorReporter.prototype.setSignalFatalErrorFn = function(
    signalFatalErrorFn) {
  this.signalFatalErrorFn_ = signalFatalErrorFn;
};



office.debug.ErrorReporter.prototype.setShouldSuppressDialog = function(
    shouldSuppressDialog) {
  this.suppressDialog_ = shouldSuppressDialog;
};



office.debug.ErrorReporter.prototype.addDynamicContextEntry = function(name,
    valueFunction) {
  this.dynamicContext_[name] = valueFunction;
};



office.debug.ErrorReporter.prototype.addStaticContextEntry = function(name,
    value) {
  this.staticContext_[name] = value;
};



office.debug.ErrorReporter.prototype.fatalError = function(
    error, opt_context, opt_sendAfterFatal) {
  this.forceSendError_ = !!opt_sendAfterFatal;
  this.reportToServerOrThrow_(error, this.createContext_(
      office.debug.ErrorReporter.Severity.FATAL_ERROR, opt_context));
};



office.debug.ErrorReporter.prototype.warning = function(
    error, opt_context, opt_sendAfterFatal) {
  this.forceSendError_ = !!opt_sendAfterFatal;
  goog.log.warning(this.logger_, error.message);
  if (this.errorReporter_) {
    this.errorReporter_.handleException(error, this.createContext_(
        office.debug.ErrorReporter.Severity.WARNING, opt_context));
  }
};



office.debug.ErrorReporter.prototype.info = function(
    error, opt_context, opt_sendAfterFatal) {
  this.forceSendError_ = !!opt_sendAfterFatal;
  goog.log.warning(this.logger_, error.message);
  if (this.errorReporter_) {
    this.errorReporter_.handleException(error, this.createContext_(
        office.debug.ErrorReporter.Severity.INCIDENT, opt_context));
  }
};



office.debug.ErrorReporter.prototype.log = function(
    error, opt_context, opt_sendAfterFatal) {
  this.forceSendError_ = !!opt_sendAfterFatal;
  this.reportToServerOrThrow_(error, this.createContext_(
      office.debug.ErrorReporter.Severity.INCIDENT, opt_context));
};



office.debug.ErrorReporter.prototype.assert = function(condition, error) {
  if (!condition) {
    this.log(error);
  }
};



office.debug.ErrorReporter.prototype.assertCritical = function(condition, error) {
  if (!condition) {
    this.fatalError(error);
  }
};



office.debug.ErrorReporter.prototype.protectFunction = function(
    fn, selfObj, opt_rethrow) {
  return goog.bind(function(var_args) {
    return this.wrappedCall_(fn, selfObj, !!opt_rethrow, arguments);
  }, this);
};



office.debug.ErrorReporter.prototype.safeCall = function(fn, selfObj, var_args) {
  var args = goog.array.slice(arguments, 2);
  return this.wrappedCall_(fn, selfObj, false /* rethrow */, args);
};



office.debug.ErrorReporter.prototype.wrappedCall_ = function(
    fn, selfObj, rethrow, args) {
  if (!this.errorReporter_) {

    return fn.apply(selfObj, args);
  }

  rethrow = true;
  try {
    return fn.apply(selfObj, args);
  } catch (error) {
    this.fatalError(error);
    if (rethrow) {
      throw error;
    }
  }
};



office.debug.ErrorReporter.prototype.createContext_ = function(
    severity, opt_context) {
  var context = opt_context ? goog.object.clone(opt_context) : {};
  context[office.debug.ErrorReporter.CONTEXT_PARAM_SEVERITY] = severity;
  return context;
};



office.debug.ErrorReporter.prototype.handleClosureErrorEvent_ = function(event) {
  var severity = event.context[office.debug.ErrorReporter.CONTEXT_PARAM_SEVERITY];
  if (severity == office.debug.ErrorReporter.Severity.WARNING ||
      severity == office.debug.ErrorReporter.Severity.INCIDENT ||
      severity == office.debug.ErrorReporter.Severity.POST_FATAL_INCIDENT) {
    this.dispatchEvent(office.debug.ErrorReporter.EventType.INCIDENT);
  } else {
    var errorObj = goog.object.clone(event.error);
    if (!event.error.propertyIsEnumerable('message')) {



      errorObj.message = event.error.message;
    }
    goog.object.extend(errorObj, event.context);
    if (!this.suppressDialog_) {
      if (this.useVerboseErrorDialog_) {
        this.signalFatalError_(goog.json.serialize(errorObj));
      } else {
        this.signalFatalError_();
      }
    }

  }
};



office.debug.ErrorReporter.prototype.signalFatalError_ = function(opt_debugText) {
  if (this.signalFatalErrorFn_) {
    this.signalFatalErrorFn_(opt_debugText);
  } else {
    var MSG_ERRORREPORTER_RELOAD = goog.getMsg(
        'reload.');






  }
};



office.debug.ErrorReporter.prototype.reportToServerOrThrow_ = function(error,
    context) {
  goog.log.warning(this.logger_, error.message);


  if (!this.errorReporter_) {
    throw error;
  }

  this.errorReporter_.handleException(error, context);
};



office.debug.ErrorReporter.prototype.provideLogData_ = function(error, context) {

  for (var name in this.dynamicContext_) {
    try {
      context[name] = this.dynamicContext_[name]();
    } catch (e) {

    }
  }


  goog.object.extend(context, this.staticContext_);

  if (goog.debug.LogBuffer.isBufferingEnabled()) {

    var formatter = new goog.debug.TextFormatter();
    var logBuffer = '';
    var append = function(logRecord) {
      logBuffer += formatter.formatRecord(logRecord);
    };
    goog.debug.LogBuffer.getInstance().forEachRecord(append);

    context[office.debug.ErrorReporter.CONTEXT_PARAM_CLIENT_LOG] = logBuffer;
  }




  var severity = context[office.debug.ErrorReporter.CONTEXT_PARAM_SEVERITY] ||
      office.debug.ErrorReporter.Severity.FATAL_ERROR;





  if (this.fatalSentToServer_) {
    this.shouldSendError_ = this.forceSendError_ ||
        !office.flag.getInstance().getBoolean(
            office.flag.Flags.SUPPRESS_POST_FATAL_ERRORS);
    if (severity == office.debug.ErrorReporter.Severity.FATAL_ERROR) {
      severity = office.debug.ErrorReporter.Severity.POST_FATAL_ERROR;
    } else if (severity == office.debug.ErrorReporter.Severity.INCIDENT) {
      severity = office.debug.ErrorReporter.Severity.POST_FATAL_INCIDENT;
    }
  } else if (severity == office.debug.ErrorReporter.Severity.FATAL_ERROR) {
    this.fatalSentToServer_ = true;
  }

  this.forceSendError_ = false;

  context[office.debug.ErrorReporter.CONTEXT_PARAM_SEVERITY] = severity;
};



office.debug.ErrorReporter.prototype.sendError_ = function(uri, method, content,
    opt_headers) {
  if (this.shouldSendError_) {
    this.errorSender_.send(uri, method, content, opt_headers);
  }
};



office.debug.ErrorReporter.prototype.disposeInternal = function() {
  office.debug.ErrorReporter.installed_ = false;
  goog.disposeAll(
      this.eventHandler_,
      this.errorReporter_,
      this.errorSender_);
  goog.base(this, 'disposeInternal');
};



office.debug.ErrorReporter.register = function(appContext,
    opt_useVerboseErrorDialog, opt_baseKey, opt_maxErrorsStored,
    opt_ignoreDebugMode, opt_suppressDialog, opt_signalFatalErrorFn) {

  var errorReporter = new office.debug.ErrorReporter(
      opt_useVerboseErrorDialog, opt_baseKey, opt_maxErrorsStored,
      opt_ignoreDebugMode, opt_suppressDialog, opt_signalFatalErrorFn);

  appContext.registerService(
      office.debug.ServiceId.ERROR_REPORTER, errorReporter);
  return errorReporter;
};



office.debug.ErrorReporter.get = function(appContext) {
  return /** @type {!office.debug.ErrorReporter} */ (
      appContext.get(office.debug.ServiceId.ERROR_REPORTER));
};





office.debug.ErrorReporter.createForEditor = function(
    docId, opt_useVerboseErrorDialog, opt_basekey, opt_ignoreDebugMode,
    opt_signalFatalErrorFn) {
  var errorReporter = new office.debug.ErrorReporter(
      opt_useVerboseErrorDialog,
      opt_basekey,
      undefined /* opt_maxErrorsStored */,
      opt_ignoreDebugMode,
      undefined /* opt_suppressDialog */,
      opt_signalFatalErrorFn);
  office.debug.ErrorReporter.addDocumentContext(errorReporter, docId);
  return errorReporter;
};



office.debug.ErrorReporter.addDocumentContext = function(errorReporter, docId) {
  errorReporter.addStaticContextEntry(
      office.debug.ErrorReporter.CONTEXT_PARAM_DOCID_, docId);
};
