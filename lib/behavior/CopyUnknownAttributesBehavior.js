/**
 * Runs before bpmn-js's own listener, which returns the sorted property
 * names and so ends the event.
 */
const HIGH_PRIORITY = 1500;

/**
 * Copies attributes the descriptor does not know (moddle keeps them in
 * $attrs) when bpmn-js copies an element to one of the same type, as copy
 * and paste do. bpmn-js copies only described properties, so a pasted
 * element would lose them, for example the attributes of a flowable:*
 * element registered with registerUnknownFlowableElements.
 *
 * A replace changes the element's type, so its unknown attributes are left
 * out there; the extension elements inside keep their type and keep theirs.
 */
export default class CopyUnknownAttributesBehavior {

  constructor(eventBus) {
    eventBus.on('moddleCopy.canCopyProperties', HIGH_PRIORITY, ({ sourceElement, targetElement }) => {
      if (!sourceElement || !targetElement || sourceElement.$type !== targetElement.$type) {
        return;
      }

      const attrs = sourceElement.$attrs || {};

      Object.keys(attrs).forEach(name => {
        if (!(name in targetElement.$attrs)) {
          targetElement.$attrs[name] = attrs[name];
        }
      });
    });
  }
}

CopyUnknownAttributesBehavior.$inject = [ 'eventBus' ];
