/**
 * @author: houmingjie
 * @file: 部分接口请求灰度需要添加参数，这里搞个工具封装逻辑
 * @Date: 2019-12-23 10:17:46
* @LastEditors: houmingjie
 */

goog.provide("office.apiFlagUtil");

goog.require("goog.uri.utils");

office.apiFlagUtil.FLAGKEY_ = "wordGray";

office.apiFlagUtil.getUrl = function(url) {
  var isInWordGray = window['_isInGrayList_'];

  if (isInWordGray && !goog.uri.utils.hasParam(url, office.apiFlagUtil.FLAGKEY_ )) {
    return goog.uri.utils.appendParam(url, office.apiFlagUtil.FLAGKEY_ , true);
  } else {
    return url;
  }
};
