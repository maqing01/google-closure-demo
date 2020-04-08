goog.provide('office.localstore.idb.StoreName');


/**
 * @enum {string}
 */
office.localstore.idb.StoreName = {
  //APPLICATION_METADATA: 'ApplicationMetadata',
  COMMENTS: 'd',
  DOCUMENT_COMMANDS: 'c',
  DOCUMENT_COMMANDS_METADATA: 'm',
  DOCUMENT_COMMANDS_METADATA_STAGING: 'mp',
  DOCUMENT_COMMANDS_STAGING: 'cp',
  //DOCUMENT_ENTITIES: 'DocumentEntities',
  DOCUMENT_LOCKS: 'l',
  DOCUMENTS: 'mainstore',
  //FILE_ENTITIES: 'FileEntities',
  //FONT_METADATA: 'FontMetadata',
  //IMPRESSIONS: 'Impressions',
  //NEW_DOCUMENT_IDS: 'ni',
  PENDING_QUEUE_COMMANDS: 'qc',
  PENDING_QUEUES: 'q',
  //PROFILE_DATA: 'ProfileData',
  //SYNC_OBJECTS: 'SyncObjects',
  USERS: 'u'
};
