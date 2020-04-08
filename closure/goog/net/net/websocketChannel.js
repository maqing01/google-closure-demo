goog.provide('office.net.WebSocketChannel');

goog.require('office.net.ClientProperties');
goog.require('office.net.OfflineObserverApi');
goog.require('office.net.RtcTopic');
goog.require('goog.Disposable');
goog.require('goog.uri.utils');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.pubsub.PubSub');
goog.require('goog.net.WebSocket');
goog.require('goog.net.WebSocket.EventType');
goog.require("fe.Logger");
goog.require('goog.string');

var RETRY_TIME_ARR = [
    1000,
    3000,
    5000,
    10000,
];

office.net.WebSocketChannel = function (opt_offlineObserver, opt_accessLevel) {

    this.errorStatusCallback_ = goog.nullFunction;


    this.channelOpenedCallback_ = goog.nullFunction;


    this.eventHandler_ = new goog.events.EventHandler(this);

    this.accessLevel_ = opt_accessLevel;

    this.docId_ = undefined;

    this.sid_ = undefined;

    this.docType_ = undefined;

    this.translator_ =  office.net.WebSocketChannel.translateDefaultJson_;


    this.pubsub_ = new goog.pubsub.PubSub();

    this.offlineObserver_ = opt_offlineObserver || null;

    this.isNetOnline_ = this.offlineObserver_ && this.offlineObserver_.isOnline();

    if (this.offlineObserver_) {
        this.eventHandler_.listen(this.offlineObserver_,
            [office.net.OfflineObserverApi.EventType.ONLINE,
                office.net.OfflineObserverApi.EventType.OFFLINE],
            this.onNetStatusChange_);
    }


    this.currentError_ = null;


    this.subscribe(
        office.net.RtcTopic.GAIA_SESSION_ID_UPDATE,
        this.handleGaiaSessionIdUpdate_,
        this);

    this.webSocketInst_ = this.createWebSocketInst_();

};
goog.inherits(office.net.WebSocketChannel, goog.Disposable);

office.net.WebSocketChannel.prototype.logger_ =
    goog.log.getLogger('office.net.WebSocketChannel');

// office.net.WebSocketChannel.prototype.lastStatusCode_ = null;

office.net.WebSocketChannel.prototype.subscribe = function (topic, fn, opt_context) {
    this.pubsub_ && this.pubsub_.subscribe(topic, fn, opt_context);
};


office.net.WebSocketChannel.prototype.unsubscribe = function (
    topic, fn, opt_context) {
    return this.pubsub_ && this.pubsub_.unsubscribe(topic, fn, opt_context);
};


office.net.WebSocketChannel.translateDefaultJson_ = function (array) {
    if (array['yiqixie']) {
        var actualPayload = goog.crypt.obfuscation.deobfuscate(array['yiqixie']);
        var result = /** @type {Array} */ (goog.json.unsafeParse(actualPayload));
        return {
            type: /** @type {number} */ (result[0]),
            sequence: /** @type {number} */ (result[1]),
            data: /** @type {Object} */ (result[2]),
            tfe: /** @type {?string} */ (result[3] || null)
        };
    } else {
        if (array.length == 1 && goog.isString(array[0])) {
            var msg = array[0];

            array = /** @type {Array} */ (goog.json.unsafeParse(msg));

        }
        return {
            type: /** @type {number} */ (array[0]),
            sequence: /** @type {number} */ (array[1]),
            data: /** @type {Object} */ (array[2]),
            tfe: /** @type {?string} */ (array[3] || null)
        };
    }
};


office.net.WebSocketChannel.prototype.publishRtcEvent_ = function (eventType, data) {

    this.pubsub_.publish(eventType, data);
};


office.net.WebSocketChannel.prototype.connectIfNeeded = function (
    opt_docId,opt_Sid,opt_urlPrefix) {

    // 离线模式不连接
    if(window._office_off_line_mode_){
        return;
    }
        

    this.docId_ = opt_docId || this.docId_;
    this.sid_ = opt_Sid || this.sid_;
    this.docType_ =  opt_urlPrefix && opt_urlPrefix.replace(/\//,'') || '';
    this.isCloseManual = false;
    this.connect_();
};


office.net.WebSocketChannel.prototype.connect_ = function () {
    // 离线模式不连接
    if(window._office_off_line_mode_){
        return;
    }
    goog.asserts.assert(!!this.docId_, 'browser channel ID must be defined');
    goog.asserts.assert(!!this.docType_, 'docType must be defined');

    if (!this.webSocketInst_.isOpen()) {
        var host = (goog.uri.utils.getHost(goog.global.location.href).replace(/^http/,'ws')) + '/docs/ws-channel/' + this.docId_;
        var docType = this.docType_ || goog.global.location.pathname.split('/')[1];
        var traceId = Math.random().toString(36).slice(2);
        this.webSocketInst_.open(goog.uri.utils.appendParams(host,'doctype',docType,'sid',this.sid_,'traceid',traceId));
    }
};


office.net.WebSocketChannel.prototype.createWebSocketInst_ = function () {
    // 离线模式不连接
    if(window._office_off_line_mode_){
        return;
    }
    if (this.webSocketInst_) {
        return this.webSocketInst_;
    }

    var webSocketInst = new goog.net.WebSocket({
        autoReconnect: true,
        getNextReconnect: function (attempt) {
            return RETRY_TIME_ARR[attempt] || (Math.max(attempt, 6) * 10000)
        }
    });

    webSocketInst.registerDisposable(this);

    this.eventHandler_.listen(webSocketInst, goog.net.WebSocket.EventType.OPENED, this.handleSocketOpened_)
        .listen(webSocketInst, goog.net.WebSocket.EventType.CLOSED, this.handleSocketClosed_)
        .listen(webSocketInst, goog.net.WebSocket.EventType.ERROR, this.handleSocketError_)
        .listen(webSocketInst, goog.net.WebSocket.EventType.MESSAGE, this.handleSocketMessage_);


    return webSocketInst;
};

office.net.WebSocketChannel.prototype.pingTimer_ = null;

office.net.WebSocketChannel.prototype.startPingTimer_ = function(){
    this.endPingTimer_();
    var that = this;
    var ping = 'ping';
    if (goog.string.startsWith(window.location.pathname, '/d/home') || goog.string.startsWith(window.location.pathname, '/s/home')) {
        ping = this.accessLevel_;

        // word 和 excel 立即发送权限类型
        this.webSocketInst_ && this.webSocketInst_.send(ping);
    } 
    
    this.pingTimer_ = window['setInterval'](function(){
        that.webSocketInst_ && that.webSocketInst_.send(ping);
    },10 * 1000);
};

office.net.WebSocketChannel.prototype.endPingTimer_ = function(){
    this.pingTimer_ && window['clearTimeout'](this.pingTimer_);
    this.pingTimer_ = null;
};


office.net.WebSocketChannel.prototype.handleSocketOpened_ = function (event) {
    goog.log.fine(this.logger_, 'Underlying channel opened.');

    this.startPingTimer_();
    this.maybeUpdateError_(goog.net.BrowserChannel.Error.OK);
    this.channelOpenedCallback_();
};


office.net.WebSocketChannel.prototype.handleSocketClosed_ = function (event) {
    goog.log.fine(this.logger_, 'Underlying channel closed.');
    this.endPingTimer_()
};

office.net.WebSocketChannel.prototype.handleSocketError_ = function (event) {
    this.currentError_ = goog.net.BrowserChannel.Error.NETWORK;
    this.maybeUpdateError_(this.currentError_);
};


office.net.WebSocketChannel.prototype.handleSocketMessage_ = function (e) {
    if (e.message == 'ping') {
        return;
    }
    var array;
    try {
        array = JSON.parse(e.message);
    } catch (err) {
        return;
    }


    var event = this.translator_(array);

    goog.asserts.assert(goog.isNumber(event.type),
        'Event type must be a number: ' + event.type);
    goog.asserts.assert(event.type >= 0,
        'Event type should be non-negative: ' + event.type);
    goog.asserts.assert(goog.isNumber(event.sequence),
        'Event sequence number must be a number: ' + event.sequence);
    goog.asserts.assert(goog.isObject(event.data),
        'Event data must be of type object: ' + event.data);
    goog.asserts.assert(goog.isString(event.tfe) || goog.isNull(event.tfe),
        'Event tfe param must be of type string or null: ' + event.tfe);


    // this.lastSequenceNumber_ = event.sequence;

    this.publishRtcEvent_(String(event.type), event.data);

};


office.net.WebSocketChannel.prototype.disconnectIfNeeded = function () {
    this.currentError_ = null;
    this.isCloseManual = true;
    this.webSocketInst_  && this.webSocketInst_ .close();
};

//是否手动触发断开，手动触发的场景下不响应断线重连立即重连ws
office.net.WebSocketChannel.prototype.isCloseManual = false;

office.net.WebSocketChannel.prototype.isNetOnline_ = false;


office.net.WebSocketChannel.prototype.onNetStatusChange_ = function (){
    var that = this;
    fe.Logger.log(function(){
        return {
            'type':'push-channel-netst-change',
            'isWs':true,
            'is-ws-open':that.webSocketInst_ ? that.webSocketInst_.isOpen() : 'no-ws',
            'is-ob-online': that.offlineObserver_ ? that.offlineObserver_.isOnline() : 'no-ob',
        }
    });
    if(this.offlineObserver_) {
        //断线重连立即重连ws
        if(!this.isCloseManual && !this.isNetOnline_ && this.offlineObserver_.isOnline() && this.webSocketInst_ && !this.webSocketInst_.isOpen()) {
            this.connect_();
        }
        this.isNetOnline_ = this.offlineObserver_.isOnline();
    }


    this.maybeUpdateError_();
};

office.net.WebSocketChannel.prototype.maybeUpdateError_ =
    function (opt_channelError) {
        var error;
        if (this.offlineObserver_ && !this.offlineObserver_.isOnline()) {
            error = goog.net.BrowserChannel.Error.NETWORK;
        } else if (opt_channelError != null) {
            error = opt_channelError;
        } else {
            error = goog.net.BrowserChannel.Error.OK;
        }

        if (error != this.currentError_) {
            goog.log.fine(this.logger_, 'Reporting error state: ' + error);
            this.currentError_ = error;
            this.errorStatusCallback_.call(goog.global, error);
        }
    };


office.net.WebSocketChannel.prototype.getErrorStatus = function () {
    return this.currentError_ == null ? goog.net.BrowserChannel.Error.OK :
        this.currentError_;
};


office.net.WebSocketChannel.prototype.getLastStatusCode = function () {
    // 目前只有断开一个状态
    return 404;

    // return this.lastStatusCode_ ? this.lastStatusCode_ : -1;
};


office.net.WebSocketChannel.prototype.registerErrorStatusCallback =
    function (errorStatusCallback) {
        goog.asserts.assert(this.errorStatusCallback_ == goog.nullFunction,
            'Illegal to register two Error Status Callbacks');
        this.errorStatusCallback_ = errorStatusCallback;
        if (this.currentError_ != null) {
            this.errorStatusCallback_(this.currentError_);
        }
    };


office.net.WebSocketChannel.prototype.unregisterErrorStatusCallback =
    function () {
        this.errorStatusCallback_ = goog.nullFunction;
    };


office.net.WebSocketChannel.prototype.registerChannelOpenedCallback =
    function (channelOpenedCallback) {
        goog.asserts.assert(this.channelOpenedCallback_ == goog.nullFunction,
            'Illegal to register two channel-opened callbacks');
        this.channelOpenedCallback_ = channelOpenedCallback;
    };


office.net.WebSocketChannel.prototype.unregisterChannelOpenedCallback =
    function () {
        this.channelOpenedCallback_ = goog.nullFunction;
    };


office.net.WebSocketChannel.prototype.handleGaiaSessionIdUpdate_ =
    function (event) {
        var gaiaSessionIdentifier = event['gai'];
        if (gaiaSessionIdentifier) {
            office.net.ClientProperties.getInstance().setGaiaSessionIdProperty(gaiaSessionIdentifier);
        } else {
            throw Error('GAIA session id should be a valid string. Received - ' +
                gaiaSessionIdentifier);
        }
    };

// 跟browserChannel的api对齐
// 在browserchannelservice.js中使用
office.net.WebSocketChannel.prototype.setInfoParams = goog.nullFunction;
// 在crossdomainbcfactory.js中使用
office.net.WebSocketChannel.prototype.registerQpsLimiter = goog.nullFunction;
office.net.WebSocketChannel.prototype.setAllowHostPrefix = goog.nullFunction;
// 在communicationsManager.js 和 iofactory 中使用
office.net.WebSocketChannel.prototype.setUserId = goog.nullFunction;
office.net.WebSocketChannel.prototype.setExpectWriteAccess = goog.nullFunction;
office.net.WebSocketChannel.prototype.setExpectCommentAccess = goog.nullFunction;

office.net.WebSocketChannel.prototype.disposeInternal = function () {


    this.unregisterChannelOpenedCallback();
    this.unregisterErrorStatusCallback();
    this.webSocketInst_ && this.webSocketInst_.removeAllListeners();
    this.endPingTimer_();
    this.disconnectIfNeeded();

    goog.dispose(this.webSocketInst_);
    goog.dispose(this.eventHandler_);
    goog.dispose(this.pubsub_);

    delete this.webSocketInst_;
    delete this.eventHandler_;
    delete this.offlineObserver_;
    delete this.pubsub_;
    goog.base(this, 'disposeInternal');
};

