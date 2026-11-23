import { expect } from 'vitest';

import Modeler from 'bpmn-js/lib/Modeler';

import flowableDescriptor from '@jylups/flowable-bpmn-moddle';

import { FlowableBehaviorsModule } from '../index.js';

let current = null;

/**
 * Creates a modeler with the Flowable moddle descriptor and the Flowable
 * behaviors, imports the XML and returns helpers for the tests.
 *
 * @param {string} xml
 * @param {Object} [options]
 * @param {Object[]} [options.modules] - more modules to add
 * @param {boolean} [options.behaviors=true] - false leaves the behaviors out,
 *   to compare with plain bpmn-js
 */
export async function createModeler(xml, options = {}) {
  await destroyModeler();

  const { modules = [], behaviors = true } = options;

  const container = document.createElement('div');
  container.style.cssText = 'width: 800px; height: 500px;';

  document.body.appendChild(container);

  const modeler = new Modeler({
    container,
    additionalModules: [ ...(behaviors ? [ FlowableBehaviorsModule ] : []), ...modules ],
    moddleExtensions: { flowable: flowableDescriptor }
  });

  const { warnings } = await modeler.importXML(xml);

  current = { modeler, container };

  return {
    modeler,
    warnings,
    get: name => modeler.get(name),
    element: id => modeler.get('elementRegistry').get(id),
    businessObject: id => modeler.get('elementRegistry').get(id).businessObject,
    saveXML: async () => (await modeler.saveXML({ format: true })).xml
  };
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
