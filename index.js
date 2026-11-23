/**
 * @jylups/flowable-bpmn-js-behaviors
 *
 * bpmn-js modeling behaviors for the Flowable BPMN extensions. Use the module
 * together with the Flowable moddle descriptor (@jylups/flowable-bpmn-moddle):
 *
 *   import { FlowableBehaviorsModule } from '@jylups/flowable-bpmn-js-behaviors';
 *   import flowableDescriptor from '@jylups/flowable-bpmn-moddle';
 *
 *   new Modeler({
 *     additionalModules: [ FlowableBehaviorsModule ],
 *     moddleExtensions: { flowable: flowableDescriptor }
 *   });
 */
export { default as FlowableBehaviorsModule } from './lib/index.js';
