goog.provide('office.net.Flags');

goog.require('goog.events');



office.net.Flags = {

  USE_FORM_DATA_FOR_QUERY_ARRAYS: goog.events.getUniqueId('office-net-cbfd'),


  USE_SCOTTY_UPLOADS_FOR_LARGE_REQUESTS: goog.events.getUniqueId('office-net-usud'),


  MINIMUM_REQUEST_SIZE_FOR_SCOTTY_UPLOADS: goog.events.getUniqueId('office-net-udmi'),


  PROGRESS_EVENT_TIMEOUT_FOR_SCOTTY_UPLOADS: goog.events.getUniqueId('office-net-udpt'),


  SCOTTY_UPLOADER_URL: goog.events.getUniqueId('office-net-udur'),


  ENABLE_RESPONSE_NATIVE_JSON_PARSER: goog.events.getUniqueId('office-net-ernjp'),

  ANONYMOUS: 'u-a-m-s',
  PARTNER_ID: 'partner-id',
  PARTNER_SECRET: 'partner-secret',
  PARTNER_VALID: 'partner-valid',
  PARTNER_VALID_CHECK: 'partner-v-c',
  PARTNER_REQUIRE_NETWORK: 'partner-r-n',
  PARTNER_MAX_RETRY_COUNTS: 'partner-m-p-t',
  ENABLE_RESPONSE_NATIVE_JSON_PARSER: 'u-n-w-j',

  BASE_SERVER: 'base-server'
};
