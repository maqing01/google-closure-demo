goog.provide('office.app.UndeliverableQueueResolver');

goog.require('office.chrome.page');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.ui.ButterManager');
goog.require('office.ui.SimpleLinkButter');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');
goog.require('controls.ButterBar');



/**
 * @param {!office.storage.PendingCommandQueue} pendingCommandQueue The pending
 *     command queue.
 * @param {?number} initialRevision The initial model revision. Only used for
 *     debugging.
 * @param {!office.debug.ErrorReporter} errorReporter The error reporter.
 * @param {string=} opt_coldStartUrl The cold start url. If the pending queue
 *     is undeliverable and anachronistic, the editor will load in cold-start,
 *     so the user can see their anachronistic changes. If not set, the editor
 *     will enter an error state under these conditions.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.app.UndeliverableQueueResolver = function(
    pendingCommandQueue, initialRevision, errorReporter, opt_coldStartUrl) {
  goog.base(this);

  /**
   * @type {!office.storage.PendingCommandQueue}
   * @private
   */
  this.pendingCommandQueue_ = pendingCommandQueue;

  /**
   * @type {!goog.events.EventHandler.<!office.app.UndeliverableQueueResolver>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.listen(pendingCommandQueue,
      office.storage.PendingCommandQueueEventType.COMMANDS_UNDELIVERABLE,
      this.showAbandonChangesButter_);

  /**
   * @type {!office.debug.ErrorReporter}
   * @private
   */
  this.errorReporter_ = errorReporter;

  if (pendingCommandQueue.isUndeliverable()) {
    this.showAbandonChangesButter_();
    // if (pendingCommandQueue.isAnachronistic()) {
    //   var isColdStartOffline = office.flag.getInstance().getBoolean(
    //       office.flag.Flags.IS_COLD_START_OFFLINE);
    //   if (isColdStartOffline) {
    //     // If the local database ever becomes anachronistic, give the user a
    //     // chance to blow away the pending queue to recover the document.
    //     this.showAbandonChangesButter_();
    //     errorReporter.log(
    //         Error(''), {
    //           'mr': initialRevision,
    //           'qr': pendingCommandQueue.getQueueVersion()
    //         });
    //   } else if (opt_coldStartUrl) {
    //     // Redirect to the cold start editor.
    //     goog.global.location = opt_coldStartUrl;
    //   } else {
    //     errorReporter.fatalError(
    //         Error(''));
    //   }
    // } else {
    //   this.showAbandonChangesButter_();
    // }
  }
};
goog.inherits(office.app.UndeliverableQueueResolver, goog.Disposable);


/**
 * @type {office.ui.ButterManager.Item}
 * @private
 */
office.app.UndeliverableQueueResolver.prototype.butterManagerItem_ = null;


/**
 * @private
 */
office.app.UndeliverableQueueResolver.prototype.showAbandonChangesButter_ =
    function() {
  if (!this.pendingCommandQueue_.isInitialized()) {
    this.errorReporter_.fatalError(
        Error(''));
    return;
  }

  if (!this.butterManagerItem_) {
    /**
     * @desc Message shown in a banner when the user's changes cannot be saved
     * to the server. The user should copy the changes before clicking on the
     * link to revert to an earlier revision of the document.
     */
    //var MSG_UNDELIVERABLE_QUEUE_BUTTER = goog.getMsg(
    //    'Can\'t save your changes. Copy any recent changes, then ' +
    //        '{$beginLink}revert to an earlier revision{$endLink}.',
    //    {
    //      beginLink:
    //          '<span class="' + office.ui.SimpleLinkButter.LINK_CLASS_NAME + '">',
    //      endLink: '</span>'
    //    });

    var msg = '您的离线内容改动无法保存到服务, 请手动备份你的文档。<span class="'
        + office.ui.SimpleLinkButter.LINK_CLASS_NAME + '"/>'
        + '点击此处将文档恢复至正常状态' + '</span>';

    var butter = new office.ui.SimpleLinkButter(
        //MSG_UNDELIVERABLE_QUEUE_BUTTER,
        msg,
        goog.bind(this.handleReset_, this));
    this.registerDisposable(butter);
    butter.render();

    this.butterManagerItem_ = office.ui.ButterManager.createItem(
        butter.getElement(), controls.ButterBar.Type.WARNING);

    // Suppress all dialogs from the error reporter so that only this butter is
    // shown.
    this.errorReporter_.setShouldSuppressDialog(true);
  }
  office.ui.ButterManager.getInstance().postMessage(this.butterManagerItem_);
};


/**
 * Handles the click in the butter span by resetting the pending queue.
 * @private
 */
office.app.UndeliverableQueueResolver.prototype.handleReset_ = function() {
  //this.errorReporter_.log(Error(''), {
  //  'qr': this.pendingCommandQueue_.getQueueVersion(),
  //  'ql': this.pendingCommandQueue_.getCommands().length
  //});
  this.pendingCommandQueue_.clearAndReset('').
      addCallback(this.reload_);
  office.ui.ButterManager.getInstance().clearMessage(
      this.butterManagerItem_.getId());
};


/**
 * Reloads the editor.
 * @private
 */
office.app.UndeliverableQueueResolver.prototype.reload_ = function() {
  office.chrome.page.forceReload(window);
};


/** @override */
office.app.UndeliverableQueueResolver.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  goog.base(this, 'disposeInternal');
};
