goog.provide('office.net.CatchupDiagnostics');

goog.require('goog.asserts');




office.net.CatchupDiagnostics = function(errorReporter, startRevision,
    expectedRevisionCount, expectedTransformCount, pendingCommandCount,
    pendingCatchupCount) {

  this.errorReporter_ = errorReporter;


  this.hasSentReportDuringTransformation_ = false;


  this.processingStartTime_ = -1;


  this.pendingCatchupCount_ = pendingCatchupCount;


  this.isMessageProcessingEnabled_ = true;


  this.pendingMessageCount_ = -1;


  this.startRevision_ = startRevision;


  this.endRevision_ = -1;


  this.pendingCommandCount_ = pendingCommandCount;


  this.expectedRevisionCount_ = expectedRevisionCount;


  this.expectedTransformCount_ = expectedTransformCount;


  this.transformCount_ = 0;
};



office.net.CatchupDiagnostics.CATCHUP_REPORTING_THRESHOLD_MS_ = 10 * 1000;



office.net.CatchupDiagnostics.prototype.recordCatchupEndRevision = function(
    revision) {
  this.endRevision_ = revision;
};



office.net.CatchupDiagnostics.prototype.recordProcessingStart = function(
    isMessageProcessingEnabled, pendingMessageCount) {
  this.isMessageProcessingEnabled_ = isMessageProcessingEnabled;
  this.pendingMessageCount_ = pendingMessageCount;
  goog.asserts.assert(
      this.processingStartTime_ == -1, 'Start time already set');
  this.processingStartTime_ = goog.now();
};



office.net.CatchupDiagnostics.prototype.recordProcessingEnd = function() {
  goog.asserts.assert(this.processingStartTime_ >= 0, 'Start time not set');
  if (goog.now() - this.processingStartTime_ >=
      office.net.CatchupDiagnostics.CATCHUP_REPORTING_THRESHOLD_MS_) {
    this.sendReport_('');
  }
};



office.net.CatchupDiagnostics.prototype.recordTransformation = function(
    serverRevisionCount, clientCommandCount) {
  goog.asserts.assert(this.processingStartTime_ >= 0, 'Start time not set');
  this.transformCount_ += serverRevisionCount * clientCommandCount;
  if (!this.hasSentReportDuringTransformation_ &&
      goog.now() - this.processingStartTime_ >=
          office.net.CatchupDiagnostics.CATCHUP_REPORTING_THRESHOLD_MS_) {
    this.sendReport_('');
    this.hasSentReportDuringTransformation_ = true;
  }
};



office.net.CatchupDiagnostics.prototype.sendReport_ = function(message) {
  var context = {};


















  this.errorReporter_.info(Error(message), context);
};
