import { expect } from 'vitest';

import Modeler from 'bpmn-js/lib/Modeler';

import flowableDescriptor, { registerUnknownFlowableElements } from '@jylups/flowable-bpmn-moddle';

import { FlowableBehaviorsModule } from '../index.js';

let current = null;

/**
 * Runs several commands as one undo step, like the properties panel's
 * multi-command executor: execute('test.multi', [ { cmd, context }, … ]).
 */
class MultiCommandHandler {

  constructor(commandStack) {
    this._commandStack = commandStack;
  }

  preExecute(commands) {
    commands.forEach(({ cmd, context }) => this._commandStack.execute(cmd, context));
  }
}

MultiCommandHandler.$inject = [ 'commandStack' ];

const MultiCommandModule = {
  __init__: [ [ 'commandStack', commandStack => commandStack.registerHandler('test.multi', MultiCommandHandler) ] ]
};

/**
 * Creates a modeler with the Flowable moddle descriptor and the Flowable
 * behaviors, imports the XML and returns helpers for the tests.
 *
 * @param {string} xml
 * @param {Object} [options]
 * @param {Object[]} [options.modules] - more modules to add
 * @param {boolean} [options.behaviors=true] - false leaves the behaviors out,
 *   to compare with plain bpmn-js
 * @param {boolean} [options.registerUnknown=false] - register the XML's
 *   unknown flowable:* elements before the import, as apps do
 */
export async function createModeler(xml, options = {}) {
  await destroyModeler();

  const { modules = [], behaviors = true, registerUnknown = false } = options;

  const container = document.createElement('div');
  container.style.cssText = 'width: 800px; height: 500px;';

  document.body.appendChild(container);

  const modeler = new Modeler({
    container,
    additionalModules: [ ...(behaviors ? [ FlowableBehaviorsModule ] : []), MultiCommandModule, ...modules ],
    moddleExtensions: { flowable: flowableDescriptor }
  });

  if (registerUnknown) {
    registerUnknownFlowableElements(modeler.get('moddle'), xml);
  }

  const { warnings } = await modeler.importXML(xml);

  current = { modeler, container };

  return {
    modeler,
    warnings,
    get: name => modeler.get(name),
    element: id => modeler.get('elementRegistry').get(id),
    businessObject: id => modeler.get('elementRegistry').get(id).businessObject,
    saveXML: async () => (await modeler.saveXML({ format: true })).xml,

    /**
     * Copies elements and pastes them into the root element; returns the
     * pasted elements (without labels).
     */
    copyPaste: (elements, point = { x: 600, y: 400 }) => {
      const elementRegistry = modeler.get('elementRegistry');
      const copyPaste = modeler.get('copyPaste');

      copyPaste.copy(elements.map(element => typeof element === 'string' ? elementRegistry.get(element) : element));

      return paste(modeler, point);
    },

    /**
     * Pastes what was copied before, for example into another diagram.
     */
    paste: (point = { x: 600, y: 400 }) => paste(modeler, point)
  };
}

function paste(modeler, point) {
  const elementRegistry = modeler.get('elementRegistry');
  const before = new Set(elementRegistry.getAll());

  modeler.get('copyPaste').paste({ element: modeler.get('canvas').getRootElement(), point });

  return elementRegistry.getAll().filter(element => !before.has(element) && !element.labelTarget);
}

export async function destroyModeler() {
  if (!current) {
    return;
  }

  current.modeler.destroy();
  current.container.remove();
  current = null;
}

/**
 * Checks a change and its undo and redo: `after` runs now, again after redo,
 * and `before` after undo.
 *
 * @param {CommandStack} commandStack
 * @param {Object} checks
 * @param {Function} checks.before
 * @param {Function} checks.after
 */
export async function expectUndoRedo(commandStack, { before, after }) {
  await after();

  commandStack.undo();
  await before();

  commandStack.redo();
  await after();

  expect(commandStack.canRedo()).toBe(false);
}
