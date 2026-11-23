# @jylups/flowable-bpmn-js-behaviors

bpmn-js modeling behaviors for the Flowable BPMN extensions.

## Install

> Prerelease. Built in Phase 3 of the Flowable BPMN editor ([jylups/bpmn-js-env#33](https://github.com/jylups/bpmn-js-env/issues/33)).

```sh
npm install @jylups/flowable-bpmn-js-behaviors@next @jylups/flowable-bpmn-moddle bpmn-js
```

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
| `CopyUnknownAttributesBehavior` | Copies attributes the descriptor doesn't know (`$attrs`) when an element is copied to one of the same type, as on paste, including those of `flowable:*` elements registered with `registerUnknownFlowableElements`. A replace leaves them out. |
| `CreateMissingDefinitionsBehavior` | On import, gives `errorRef`, `messageRef`, `signalRef` and `escalationRef` values without a matching element the definition Flowable reads them as (see below), and removes their unresolved-reference warnings. |
| `TidyExtensionElementsBehavior` | Attaches a new `bpmn:ExtensionElements` once it gets values, removes one that is left empty, and sets missing `$parent` links of containers and their values. |
| `UpdateModdleIdBehavior` | Keeps the model's ID registry in step when `element.updateModdleProperties` changes an ID (a participant's process, a signal, message or error), so the old ID is free again and the new one can't be given twice. References are objects and are written with the new ID. |

Copy and paste keep Flowable properties: bpmn-js copies the business object, extension elements included, and brings referenced signals, messages, errors and escalations into another diagram; these behaviors add the allowed-in check, unknown attributes and the ID registry.

## References by code or name

Flowable resolves an `errorRef`, `messageRef`, `signalRef` or `escalationRef` without a matching element by code or name: `errorRef="notFound"` catches the error code `notFound`. bpmn-moddle reports such a reference as unresolved and drops it on save. `createMissingDefinitions` points it at the definition Flowable would use:

| Reference | Definition |
| --- | --- |
| `errorRef="notFound"` | `<error id="notFound" errorCode="notFound" />` |
| `messageRef="order"` | `<message id="order" name="order" />` |
| `signalRef="alarm"` | `<signal id="alarm" name="alarm" />` |
| `escalationRef="late"` | `<escalation id="late" escalationCode="late" />` |

- A name qualified with the target namespace (`messageRef="tns:writeReport"`) points at the element with that ID, as Flowable reads it.
- An existing definition with the code or name is used before a new one is created, and one definition is created per distinct value.
- The value becomes the ID when it is a valid, unused ID, so the reference is written as before; otherwise an ID is generated (`Error_500`).

The behavior runs it on every import. It needs only moddle, so it also runs on a plain import result. Import it from its own entry point, which loads nothing from bpmn-js and so also works in plain Node:

```js
import { createMissingDefinitions } from '@jylups/flowable-bpmn-js-behaviors/missing-definitions';

const { rootElement, warnings, elementsById } = await moddle.fromXML(xml, 'bpmn:Definitions');

createMissingDefinitions(rootElement, { warnings, elementsById });
```

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
