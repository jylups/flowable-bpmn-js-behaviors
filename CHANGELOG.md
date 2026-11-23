# Changelog

All notable changes to this package are documented here.

## Unreleased

## 0.1.0

First stable release, with the features of 0.1.0-next.0 and:

* `FEAT`: export `createMissingDefinitions` from `@jylups/flowable-bpmn-js-behaviors/missing-definitions`, which works without bpmn-js, in plain Node too ([jylups/bpmn-js-env#38](https://github.com/jylups/bpmn-js-env/issues/38))

## 0.1.0-next.0

First prerelease: modeling behaviors that keep Flowable extension data consistent, independent of the properties panel.

* `FEAT`: create the error, message, signal and escalation definitions that references by code or name stand for, on import and as `createMissingDefinitions` ([jylups/bpmn-js-env#67](https://github.com/jylups/bpmn-js-env/issues/67))
* `FEAT`: keep the ID registry in step when `element.updateModdleProperties` changes an ID, and keep unknown attributes on copy and paste ([jylups/bpmn-js-env#37](https://github.com/jylups/bpmn-js-env/issues/37))
* `FEAT`: clean up Flowable properties when an element is replaced: copy extension elements only where they are allowed, and drop event registry, variable listener, signal, error and send task settings the new element can't use ([jylups/bpmn-js-env#35](https://github.com/jylups/bpmn-js-env/issues/35))
* `FEAT`: keep `bpmn:ExtensionElements` tidy: attach new containers, remove empty ones, set missing parents; add extension element helpers ([jylups/bpmn-js-env#36](https://github.com/jylups/bpmn-js-env/issues/36))
* `FEAT`: add the `FlowableBehaviorsModule` and a test harness with undo and redo checks ([jylups/bpmn-js-env#34](https://github.com/jylups/bpmn-js-env/issues/34))
* `CHORE`: add the package scaffold: ESM package, lint and Vitest setup ([jylups/bpmn-js-env#3](https://github.com/jylups/bpmn-js-env/issues/3))
