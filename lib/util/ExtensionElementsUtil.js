import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';


/**
 * The extension elements of an element or business object, optionally only
 * those of one type.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {string} [type] - e.g. 'flowable:TaskListener'
 *
 * @return {ModdleElement[]}
 */
export function getExtensionElementsList(element, type) {
  const extensionElements = getBusinessObject(element).get('extensionElements');
  const values = (extensionElements && extensionElements.get('values')) || [];

  return type ? values.filter(value => is(value, type)) : values;
}

/**
 * The first extension element of a type, if any.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {string} type
 *
 * @return {ModdleElement|undefined}
 */
export function getExtensionElement(element, type) {
  return getExtensionElementsList(element, type)[0];
}

/**
 * Adds extension elements to a business object in one command. A missing
 * bpmn:ExtensionElements is created, and attached by the
 * TidyExtensionElementsBehavior once it holds the values.
 *
 * @param {djs.model.Base} element - the diagram element that changes
 * @param {ModdleElement} businessObject - the owner of the extension elements
 * @param {ModdleElement|ModdleElement[]} extensionElements - to add
 * @param {BpmnFactory} bpmnFactory
 * @param {CommandStack} commandStack
 */
export function addExtensionElements(element, businessObject, extensionElements, bpmnFactory, commandStack) {
  let container = businessObject.get('extensionElements');

  if (!container) {
    container = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    container.$parent = businessObject;
  }

  const added = toArray(extensionElements);

  added.forEach(value => {
    value.$parent = container;
  });

  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: container,
    properties: { values: [ ...container.get('values'), ...added ] }
  });
}

/**
 * Removes extension elements from a business object in one command. The
 * TidyExtensionElementsBehavior removes the bpmn:ExtensionElements once it
 * is empty.
 *
 * @param {djs.model.Base} element - the diagram element that changes
 * @param {ModdleElement} businessObject - the owner of the extension elements
 * @param {ModdleElement|ModdleElement[]} extensionElements - to remove
 * @param {CommandStack} commandStack
 */
export function removeExtensionElements(element, businessObject, extensionElements, commandStack) {
  const container = businessObject.get('extensionElements');

  if (!container) {
    return;
  }

  const removed = toArray(extensionElements);

  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: container,
    properties: { values: container.get('values').filter(value => !removed.includes(value)) }
  });
}

function toArray(value) {
  return Array.isArray(value) ? value : [ value ];
}
