import { afterEach, describe, expect, it } from 'vitest';

import { createModeler, destroyModeler, expectUndoRedo } from './helper.js';

import { createMissingDefinitions } from '../index.js';

import xml from './fixtures/missing-definitions.bpmn?raw';


function getDefinition(element, index = 0) {
  return element.businessObject.get('eventDefinitions')[index];
}

function rootElements(get) {
  return get('canvas').getRootElement().businessObject.$parent.get('rootElements');
}


describe('CreateMissingDefinitionsBehavior', function() {

  afterEach(destroyModeler);


  it('fixes the unresolved references', async function() {

    // when
    const { warnings } = await createModeler(xml);

    // then
    expect(warnings).toEqual([]);
  });


  it('creates an error per error code', async function() {

    // when
    const { element } = await createModeler(xml);

    // then
    const notFound = getDefinition(element('NotFoundBoundary')).get('errorRef');

    expect(notFound.$type).toBe('bpmn:Error');
    expect(notFound.get('id')).toBe('notFound');
    expect(notFound.get('errorCode')).toBe('notFound');

    expect(getDefinition(element('NotFoundEnd')).get('errorRef')).toBe(notFound);
  });


  it('generates an ID when the code is not a valid ID', async function() {

    // when
    const { element } = await createModeler(xml);

    // then
    const serverError = getDefinition(element('ServerErrorBoundary')).get('errorRef');

    expect(serverError.get('id')).toBe('Error_500');
    expect(serverError.get('errorCode')).toBe('500');
  });


  it('generates an ID when the value is taken', async function() {

    // when
    const { element } = await createModeler(xml);

    // then the error took notFound first
    const message = getDefinition(element('OrderCatch')).get('messageRef');

    expect(message.$type).toBe('bpmn:Message');
    expect(message.get('id')).toBe('Message_notFound');
    expect(message.get('name')).toBe('notFound');
  });


  it('creates signals and escalations', async function() {

    // when
    const { element } = await createModeler(xml);

    // then
    const signal = getDefinition(element('AlarmCatch')).get('signalRef');
    const escalation = getDefinition(element('LateEnd')).get('escalationRef');

    expect(signal.$type).toBe('bpmn:Signal');
    expect(signal.get('name')).toBe('alarm');
    expect(escalation.$type).toBe('bpmn:Escalation');
    expect(escalation.get('escalationCode')).toBe('late');
  });


  it('uses an existing definition with that name', async function() {

    // when
    const { element } = await createModeler(xml);

    // then
    expect(getDefinition(element('MessageStart')).get('messageRef').get('id')).toBe('Message_Existing');
  });


  it('resolves a name qualified with the target namespace', async function() {

    // when
    const { get, element, saveXML } = await createModeler(xml);

    // then
    expect(getDefinition(element('ReportCatch')).get('messageRef').get('id')).toBe('writeReport');
    expect(rootElements(get).filter(rootElement => rootElement.get('name') === 'tns:writeReport')).toEqual([]);
    expect(await saveXML()).toContain('messageRef="writeReport"');
  });


  it('leaves resolved references alone', async function() {

    // when
    const { get, element } = await createModeler(xml);

    // then
    expect(getDefinition(element('RealThrow')).get('signalRef').get('id')).toBe('Signal_Real');
    expect(rootElements(get).filter(rootElement => rootElement.$type === 'bpmn:Signal')).toHaveLength(2);
  });


  it('writes the references with the same meaning', async function() {

    // given
    const { saveXML } = await createModeler(xml);

    // when
    const saved = await saveXML();

    // then
    expect(saved).toContain('<error id="notFound" errorCode="notFound" />');
    expect(saved).toContain('<error id="Error_500" errorCode="500" />');
    expect(saved).toContain('<message id="Message_notFound" name="notFound" />');
    expect(saved).toContain('<signal id="alarm" name="alarm" />');
    expect(saved).toContain('<escalation id="late" escalationCode="late" />');

    expect(saved.match(/errorRef="notFound"/g)).toHaveLength(2);
    expect(saved).toContain('errorRef="Error_500"');
    expect(saved).toContain('messageRef="Message_notFound"');
    expect(saved).toContain('messageRef="Message_Existing"');
    expect(saved).toContain('signalRef="alarm"');
    expect(saved).toContain('escalationRef="late"');

    // definitions come before the process
    expect(saved.indexOf('<escalation')).toBeLessThan(saved.indexOf('<process'));
  });


  it('claims the created IDs', async function() {

    // when
    const { get, element } = await createModeler(xml);

    // then
    expect(get('moddle').ids.assigned('notFound')).toBe(getDefinition(element('NotFoundBoundary')).get('errorRef'));
    expect(get('moddle').ids.assigned('Error_500')).toBeTruthy();
  });


  it('is part of the import, not a change to undo', async function() {

    // when
    const { get } = await createModeler(xml);

    // then
    expect(get('commandStack').canUndo()).toBe(false);
  });


  describe('editing the references afterwards', function() {

    const cases = [
      [ 'errorRef', 'NotFoundBoundary', 'notFound' ],
      [ 'messageRef', 'OrderCatch', 'Message_notFound' ],
      [ 'signalRef', 'AlarmCatch', 'alarm' ],
      [ 'escalationRef', 'LateEnd', 'late' ]
    ];

    cases.forEach(([ property, id, definitionId ]) => {

      it(`undoes and redoes a change to ${ property }`, async function() {

        // given
        const { get, element } = await createModeler(xml);
        const definition = getDefinition(element(id));
        const created = definition.get(property);

        // when
        get('modeling').updateModdleProperties(element(id), definition, { [ property ]: undefined });

        // then
        await expectUndoRedo(get('commandStack'), {
          before: () => {
            expect(definition.get(property)).toBe(created);
            expect(created.get('id')).toBe(definitionId);
          },
          after: () => expect(definition.get(property)).toBeUndefined()
        });
      });

    });

  });


  it('leaves the warnings without the behaviors', async function() {

    // when
    const { warnings } = await createModeler(xml, { behaviors: false });

    // then
    expect(warnings).toHaveLength(8);
    expect(warnings.every(warning => warning.message.startsWith('unresolved reference'))).toBe(true);
  });

});


describe('createMissingDefinitions', function() {

  afterEach(destroyModeler);


  it('works on a plain moddle import', async function() {

    // given
    const { get } = await createModeler(xml, { behaviors: false });
    const moddle = get('moddle');
    const { rootElement: definitions, warnings, elementsById } = await moddle.fromXML(xml, 'bpmn:Definitions');

    // when
    const fixed = createMissingDefinitions(definitions, { warnings, elementsById });

    // then
    expect(warnings).toEqual([]);
    expect(fixed.map(({ property, value, definition }) => [ property, value, definition.get('id') ])).toEqual([
      [ 'bpmn:messageRef', 'existing', 'Message_Existing' ],
      [ 'bpmn:errorRef', 'notFound', 'notFound' ],
      [ 'bpmn:errorRef', '500', 'Error_500' ],
      [ 'bpmn:errorRef', 'notFound', 'notFound' ],
      [ 'bpmn:messageRef', 'notFound', 'Message_notFound' ],
      [ 'bpmn:signalRef', 'alarm', 'alarm' ],
      [ 'bpmn:messageRef', 'tns:writeReport', 'writeReport' ],
      [ 'bpmn:escalationRef', 'late', 'late' ]
    ]);

    const { xml: saved } = await moddle.toXML(definitions);

    expect(saved).toContain('<error id="notFound" errorCode="notFound" />');
  });


  it('keeps other warnings', async function() {

    // given
    const { get } = await createModeler(xml, { behaviors: false });
    const { rootElement: definitions, elementsById } = await get('moddle').fromXML(xml, 'bpmn:Definitions');
    const other = { message: 'unparsable content <foo> detected' };
    const warnings = [ other ];

    // when
    createMissingDefinitions(definitions, { warnings, elementsById });

    // then
    expect(warnings).toEqual([ other ]);
  });

});



describe('missing-definitions entry point', function() {

  it('imports nothing, so it loads without bpmn-js', async function() {

    // given
    const { default: source } = await import('../lib/util/MissingDefinitions.js?raw');
    const { default: pkg } = await import('../package.json');

    // then
    expect(pkg.exports['./missing-definitions']).toBe('./lib/util/MissingDefinitions.js');
    expect(source).not.toMatch(/^\s*import\s/m);
  });

});
