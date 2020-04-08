goog.provide('office.net.constants');
goog.provide('office.net.constants.RestartInstruction');



office.net.constants.RELEASE_IDENTIFIER_HEADER_NAME = 'Y-Build-Id';



office.net.constants.RESTART_INSTRUCTION_HEADER_NAME = 'Y-Restart';



office.net.constants.JOBSET_URL_PARAM = 'js';



office.net.constants.JS_ERROR_SERVLET_URL = '/e/report';



office.net.constants.XSRF_HEADER_NAME = 'X-Same-Domain';



office.net.constants.XSRF_HEADER_VALUE = '1';



office.net.constants.INFO_PARAMS_FLAG_NAME = 'x_s_p';




office.net.constants.JSON_SAFETY_PREFIX = '';



office.net.constants.NON_RETRYABLE_HTTP_STATUS_CODE = 550;



office.net.constants.RestartInstruction = {

  SOON: 'SOON',

  NOW: 'NOW'
};
