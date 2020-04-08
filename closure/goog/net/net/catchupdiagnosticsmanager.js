goog.provide('office.net.CatchupDiagnosticsManager');

goog.require('office.net.CatchupDiagnostics');
goog.require('goog.object');




office.net.CatchupDiagnosticsManager = function(errorReporter) {

  this.errorReporter_ = errorReporter;


  this.highestSeenServerRevision_ = -1;


  this.nextId_ = 1;


  this.diagnosticsMap_ = {};
};



office.net.CatchupDiagnosticsManager.prototype.recordServerRevision = function(
    revision) {
  if (this.highestSeenServerRevision_ < revision) {
    this.highestSeenServerRevision_ = revision;
  }
};



office.net.CatchupDiagnosticsManager.prototype.startCatchup = function(
    startRevision, ackRanges, pendingCommandCount) {



  var expectedRevisionCount = this.highestSeenServerRevision_ >= startRevision ?
      this.highestSeenServerRevision_ - startRevision + 1 :
      0;

  var ackRevisionCount = 0;
  if (ackRanges.length) {
    for (var i = 0; i < ackRanges.length; i++) {
      var range = ackRanges[i];
      ackRevisionCount += range.end - range.start + 1;
    }
  }
  var expectedTransformCount =
      (expectedRevisionCount - ackRevisionCount) * pendingCommandCount;

  var diagnostics = new office.net.CatchupDiagnostics(this.errorReporter_,
      startRevision, expectedRevisionCount, expectedTransformCount,
      pendingCommandCount,
      goog.object.getCount(this.diagnosticsMap_) /* pendingCatchupCount */);
  var diagnosticsId = this.nextId_++;
  this.diagnosticsMap_[diagnosticsId] = diagnostics;
  return diagnosticsId;
};



office.net.CatchupDiagnosticsManager.prototype.recordCatchupEndRevision =
    function(diagnosticsId, revision) {
  this.recordServerRevision(revision);
  this.getDiagnostics_(diagnosticsId).recordCatchupEndRevision(revision);
};



office.net.CatchupDiagnosticsManager.prototype.recordProcessingStart = function(
    diagnosticsId, isMessageProcessingEnabled, pendingMessageCount) {
  this.getDiagnostics_(diagnosticsId).recordProcessingStart(
      isMessageProcessingEnabled, pendingMessageCount);
};



office.net.CatchupDiagnosticsManager.prototype.recordProcessingEnd = function(
    diagnosticsId) {
  this.getDiagnostics_(diagnosticsId).recordProcessingEnd();
  delete this.diagnosticsMap_[diagnosticsId];
};



office.net.CatchupDiagnosticsManager.prototype.recordTransformation = function(
    diagnosticsId, serverRevisionCount, clientCommandCount) {
  this.getDiagnostics_(diagnosticsId).recordTransformation(
      serverRevisionCount, clientCommandCount);
};



office.net.CatchupDiagnosticsManager.prototype.getDiagnostics_ = function(
    diagnosticsId) {
  var diagnostics = this.diagnosticsMap_[diagnosticsId];
  if (!diagnostics) {
    throw Error('Unknown catchup diagnostics ID');
  }
  return diagnostics;
};
