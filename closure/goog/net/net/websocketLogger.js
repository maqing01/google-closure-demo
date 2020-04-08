/**
* @author: houmingjie
* @file: description
* @Date: 2019-12-07 12:27:54
* @LastEditors: houmingjie
* @LastEditTime: 2019-12-07 17:35:41
 */
goog.provide("office.net.WebsocketLogger");

goog.require("fe.Logger");

office.net.WebsocketLogger = {
  _log: function(type, event) {
    try {
        event = event || {};
        var logData = {
            'type':'ws-' + type,
            'code':event['code'],
            'reason':event['reason'],
            'wasClean':event['wasClean'],
        };

        if(event.target){
            logData['url'] = event.target.url || '';
            logData['readyState'] = event.target.readyState
        }
        fe.Logger.log(logData);
    } catch (error) {
        console.error(error);
    }
  },
  onClose: function(event) {
    office.net.WebsocketLogger._log("close", event);
  },
  onError: function(event) {
    office.net.WebsocketLogger._log("error", event);
  }
};
