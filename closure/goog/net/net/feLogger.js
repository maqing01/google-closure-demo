goog.provide("fe.Logger");

fe.Logger = (function() {
  var MAX_LOCAL_LOG_LEN = 3000;

  function doSend(url, data) {
    if (goog.DEBUG) {
        console.info('[Logger]',data);
    }else{
        $.ajax({
            url: url,
            type: "POST",
            data: data,
            timeout: 2000
            // TODO: 失败重试，批量上报等feature
          });
    }
  }

  function doLog(logData) {
    // TODO: 更改接口
    doSend("/merlot/api/gray/fe-websocket-log", {
      data: JSON.stringify(logData)
    });
  }

  function doStatistic(type, event, value) {
    if(!event){
      throw new Error('没有指定event');
    }
    var data = { event: event };
    if (type === "COUNTER") {
      data['type'] = "COUNTER";
    } else if (type === "GAUGE") {
      data['type'] = "GAUGE";
      data['value'] = value;
    } else {
      return;
    }

    doSend("/merlot/api/prometheus/statistic", data);
  }

  /**
   * @param metaData
   * {
   *    u:uid,
   *    ua:?
   *    
   * }
   */
  function Logger(metaData) {
    this.metaData = metaData || {};
    this.metaData['ssid'] = Math.random().toString(36).slice(2);
    this.localLogArr_ = [];
  }


  Logger.prototype.addLocalLog = function(logData){
    if(this.localLogArr_.length > MAX_LOCAL_LOG_LEN){
      this.localLogArr_ = this.localLogArr_.slice(MAX_LOCAL_LOG_LEN/2)
    }

    this.localLogArr_.push(logData);
  }

  Logger.prototype.getLocalLog = function(){
    return this.localLogArr_;
  }

  Logger.prototype.log = function(data) {
    var logData = {
      'm': this.metaData
    };
    if (typeof data === "function") {
      try {
        data = data();
      } catch (error) {
        console.error("get log data Error", error);
        return;
      }
    }

    logData['d'] = data;
    logData['t'] = new Date().getTime();
    doLog(logData);
    this.addLocalLog(logData);
  };

  Logger.prototype.count = function(event) {
    doStatistic("COUNTER", event);
  };

  Logger.prototype.statistic = function(event, value) {
    doStatistic("GAUGE", event, value);
  };

  Logger.prototype.timeCost = function(event) {
    if(window['performance']){
      var value = new Date().getTime() - window['performance']['timing']['navigationStart']
      doStatistic("GAUGE", event, value);
    }
  };

  Logger.prototype.init = function(uid) {
    this.metaData['uid'] = uid;

    this.log({
      'type':'init',
      'uid':uid
    });
  };

  var loggerInst = new Logger();
  window['getLocalLog'] = loggerInst.getLocalLog.bind(loggerInst);

  //性能统计
  function performanceStatistics(){
    if(window['performance']){
      var itemArr = [
        'responseStart',
        'domContentLoadedEventStart',
        'loadEventStart',
      ]
      var timing = window['performance']['timing'];
      var start = timing['navigationStart'];
      goog.array.forEach(itemArr,function(item){
        loggerInst.statistic('fe.'+item,timing[item] - start);
      });
    }
  }

  window.addEventListener('load',function(){
      performanceStatistics()
  });

  return loggerInst;
})();
