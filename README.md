# @jylups/flowable-bpmn-js-behaviors

bpmn-js modeling behaviors for the Flowable BPMN extensions.

> Work in progress. This package is being built in Phase 3 of the Flowable BPMN editor ([jylups/bpmn-js-env#33](https://github.com/jylups/bpmn-js-env/issues/33)). It is not published yet.

## Usage

```js
import Modeler from 'bpmn-js/lib/Modeler';
import { FlowableBehaviorsModule } from '@jylups/flowable-bpmn-js-behaviors';
import flowableDescriptor from '@jylups/flowable-bpmn-moddle';

const modeler = new Modeler({
  container: '#canvas',
  additionalModules: [ FlowableBehaviorsModule ],
  moddleExtensions: { flowable: flowableDescriptor }
});
```

bpmn-js and the Flowable moddle descriptor are peer dependencies. The behaviors work with or without the [Flowable properties panel](https://github.com/jylups/bpmn-js-properties-panel-flowable).

## Behaviors

| Behavior | What it does |
| --- | --- |
| `AllowedExtensionElementsBehavior` | Copies a Flowable extension element, when bpmn-js replaces or pastes an element, only to an owner the descriptor's `allowedIn` lists; a user task's task listeners don't move to the service task that replaces it. |
| `CleanUpReplacedElementBehavior` | After a replace, removes what the new element can't use where the descriptor doesn't tell: event registry and variable listener settings unless it is a catch event without an event definition, a signal's async option unless it throws, error variable options unless it catches, and a send task type other than mail, camel or dmn (with its fields). Part of the replace, so one undo restores the old element. |
| `TidyExtensionElementsBehavior` | Attaches a new `bpmn:ExtensionElements` once it gets values, removes one that is left empty, and sets missing `$parent` links of containers and their values. |

## Helpers

`addExtensionElements(element, businessObject, values, bpmnFactory, commandStack)` and `removeExtensionElements(element, businessObject, values, commandStack)` change extension elements in one command (one undo step); the container is created or removed by the behaviors. `getExtensionElementsList(element, type?)` and `getExtensionElement(element, type)` read them.

## Development

Work in the [bpmn-js-env](https://github.com/jylups/bpmn-js-env) workspace, which links this package with the others and with the playground. Issues for this package are tracked there.

```sh
npm install
npm run lint
npm test
```

Tests create a modeler with `createModeler(xml)` from `test/helper.js` and check each change, its undo and its redo with `expectUndoRedo(commandStack, { before, after })`.

The tests run in headless Chromium through Playwright. Either install Playwright's Chromium once with `npx playwright install chromium`, or use an installed Google Chrome with `TEST_BROWSER_CHANNEL=chrome npm test`.

## License

MIT
