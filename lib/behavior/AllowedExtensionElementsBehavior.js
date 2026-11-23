import { is } from 'bpmn-js/lib/util/ModelUtil';


/**
 * Copies a Flowable extension element only to an owner its type is allowed
 * in, as the descriptor's meta.allowedIn lists them. bpmn-js copies business
 * objects when an element is replaced or pasted; without this, a user task's
 * <flowable:taskListener> would move to the service task that replaces it.
 *
 * The owner is the element whose extensionElements hold the copy, or the
 * element that holds it directly (such as the <flowable:field> of a
 * listener).
 */
export default class AllowedExtensionElementsBehavior {

  constructor(eventBus) {
    eventBus.on('moddleCopy.canCopyProperty', ({ parent, property }) => {
      if (!isAllowed(property, parent)) {
        return false;
      }
    });
  }
}

AllowedExtensionElementsBehavior.$inject = [ 'eventBus' ];


/**
 * Whether an element may be copied into a parent.
 *
 * @param {any} property
 * @param {ModdleElement} parent
 *
 * @return {boolean}
 */
export function isAllowed(property, parent) {
  const allowedIn = getAllowedIn(property);

  if (!allowedIn || allowedIn.includes('*')) {
    return true;
  }

  const owner = is(parent, 'bpmn:ExtensionElements') ? parent.$parent : parent;

  if (!owner) {
    return true;
  }

  return allowedIn.some(type => is(owner, type));
}

function getAllowedIn(property) {
  if (!property || typeof property !== 'object' || !property.$type || !property.$model) {
    return null;
  }

  const descriptor = property.$model.getTypeDescriptor(property.$type);

  return (descriptor && descriptor.meta && descriptor.meta.allowedIn) || null;
}
