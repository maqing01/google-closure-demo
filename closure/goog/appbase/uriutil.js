goog.provide('office.app.UriUtil');

goog.require('office.net.Param');


/**
 * @param {office.net.NetService} netService
 * @param {string} docId
 * @return {?string}
 */
office.app.UriUtil.sendLeaveUri = function(netService, docId) {
  return netService && netService.newRequestBuilder('/end')
      // .withParams('id', docId, office.net.Param.XSRF, netService.getXsrfToken())
          .withParams('id', docId/*, office.net.Param.XSRF, netService.getXsrfToken()*/)
      .withSessionData()
      .setContent('{}')
      .buildAndSend();
};
