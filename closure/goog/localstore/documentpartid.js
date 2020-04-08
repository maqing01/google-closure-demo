

/**
 * @fileoverview Type definition.

 */

goog.provide('office.localstore.DocumentPartId');


/**
 * Type representing the id of a document part (e.g., a Taco chunk).
 * @typedef {(string|number)}
 */
office.localstore.DocumentPartId = {};


/**
 * The default part id to use for the single part of document types that don't
 * use multiple parts.
 * @type {!office.localstore.DocumentPartId}
 */
office.localstore.DocumentPartId.DEFAULT_PART_ID = 0;
