goog.provide('office.localstore.idb.PendingQueueStorageObject');


/**
 * Key names for the pending queue metadata persistence object.
 * @enum {string}
 */
office.localstore.idb.PendingQueueStorageObject.MetadataKey = {
  ACCESS_LEVEL: '11',
  COMMAND_BUNDLES: '12',
  DOC_ID: 'k13',
  DOC_TYPE: '14',
  REVISION: '15',
  UNDELIVERABLE: '16',
  UNSAVED_CHANGES: '17'
};


/**
 * Key names for the command bundle metadata persistence object.
 * @enum {string}
 */
office.localstore.idb.PendingQueueStorageObject.CommandBundleKey = {
  LAST_ENTRY_INDEX: 'l',
  SESSION_ID: 's',
  REQUEST_ID: 'r'
};


/**
 * Key names for the pending queue command storage object.
 * @enum {string}
 */
office.localstore.idb.PendingQueueStorageObject.CommandKey = {
  KEY: 'qpath',
  COMMANDS: 'c'
};


/**
 * Indices into the key array used by the command storage object.
 * @enum {number}
 */
office.localstore.idb.PendingQueueStorageObject.CommandKeyIndex = {
  DOC_ID: 0,
  COMMANDS_INDEX: 1
};
