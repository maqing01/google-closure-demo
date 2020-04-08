goog.provide('apps.action.Topic');



/**
 * NOTE: If you are adding a new Topic related to a property make sure
 * you also update {@code apps.action.Action.#getPropertyTopic_()}.
 *
 * @enum {string}
 */
apps.action.Topic = {
  /** Topic used on changes in the visible state. */
  VISIBILITY: 'visibility',

  /** Topic used on changes in the selection state. */
  SELECTION: 'selection',

  /** Topic used on changes in the value. */
  VALUE: 'value',

  /** Topic used on changes in the enabled state. */
  ENABLED: 'enabled',

  /** Topic used when the action is triggered. */
  ACTION: 'action',

  /** Topic used on change to any of the properties. */
  CHANGE: 'change'
};
