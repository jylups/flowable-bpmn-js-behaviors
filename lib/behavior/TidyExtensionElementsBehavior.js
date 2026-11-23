import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500;

const LOW_PRIORITY = 250;

const UPDATE_COMMANDS = [ 'element.updateModdleProperties', 'element.updateProperties' ];


/**
 * Keeps bpmn:ExtensionElements tidy while properties are edited:
 *
 * - a container that gets values while it is not attached to its owner
 *   (its $parent) is attached, so callers can fill a new container in one
 *   command;
 * - a container that is left without values is removed from its owner;
 * - extension elements and containers set without a $parent get one.
 *
 * Moddle does not write empty lists, so containers are the only empty
 * elements to remove.
 */
export default class TidyExtensionElementsBehavior extends CommandInterceptor {

  constructor(eventBus, modeling) {
    super(eventBus);

    this.preExecute(UPDATE_COMMANDS, HIGH_PRIORITY, context => {
      const target = getTarget(context);
      const { properties } = context;

      if (!properties) {
        return;
      }

      if (is(target, 'bpmn:ExtensionElements')) {
        setMissingParents(properties.values, target);
      }

      const container = properties.extensionElements;

      if (is(container, 'bpmn:ExtensionElements')) {
        if (!container.$parent) {
          container.$parent = target;
        }

        setMissingParents(container.get('values'), container);
      }
    }, true);

    this.postExecuted(UPDATE_COMMANDS, LOW_PRIORITY, context => {
      const { element } = context;

      getContainers(context).forEach(container => {
        const owner = container.$parent;

        if (!owner) {
          return;
        }

        const empty = !(container.get('values') || []).length;
        const current = owner.get('extensionElements');

        if (empty && current === container) {
          modeling.updateModdleProperties(element, owner, { extensionElements: undefined });
        } else if (!empty && !current) {
          modeling.updateModdleProperties(element, owner, { extensionElements: container });
        }
      });
    }, true);
  }
}

TidyExtensionElementsBehavior.$inject = [ 'eventBus', 'modeling' ];


/**
 * The moddle element a command changes.
 */
function getTarget(context) {
  return context.moddleElement || context.element.businessObject;
}

/**
 * The containers a command changed: the one it edited, or the one it set as
 * a business object's extensionElements.
 */
function getContainers(context) {
  const target = getTarget(context);
  const containers = [];

  if (is(target, 'bpmn:ExtensionElements')) {
    containers.push(target);
  }

  if (context.properties && 'extensionElements' in context.properties) {
    const container = target.get('extensionElements');

    if (is(container, 'bpmn:ExtensionElements')) {
      containers.push(container);
    }
  }

  return containers;
}

function setMissingParents(values, parent) {
  (values || []).forEach(value => {
    if (value && value.$type && !value.$parent) {
      value.$parent = parent;
    }
  });
}
