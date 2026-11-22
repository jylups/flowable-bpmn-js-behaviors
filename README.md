# @jylups/flowable-bpmn-js-behaviors

bpmn-js modeling behaviors for the Flowable BPMN extensions.

> Work in progress. This package is being built in Phase 3 of the Flowable BPMN editor ([jylups/bpmn-js-env#33](https://github.com/jylups/bpmn-js-env/issues/33)). It is not published yet.

## Development

Work in the [bpmn-js-env](https://github.com/jylups/bpmn-js-env) workspace, which links this package with the others and with the playground. Issues for this package are tracked there.

```sh
npm install
npm run lint
npm test
```

The tests run in headless Chromium through Playwright. Either install Playwright's Chromium once with `npx playwright install chromium`, or use an installed Google Chrome with `TEST_BROWSER_CHANNEL=chrome npm test`.

## License

MIT
