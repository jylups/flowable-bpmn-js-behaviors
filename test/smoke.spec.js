import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import Modeler from 'bpmn-js/lib/Modeler';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:flowable="http://flowable.org/bpmn"
             targetNamespace="http://flowable.org/bpmn"
             id="Definitions_1">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

describe('@jylups/flowable-bpmn-js-behaviors', function() {

  let container, modeler;

  beforeEach(function() {
    container = document.createElement('div');
    container.style.cssText = 'width: 800px; height: 600px;';
    document.body.appendChild(container);
  });

  afterEach(function() {
    modeler?.destroy();
    container.remove();
  });


  it('runs bpmn-js in the test browser', async function() {

    // given
    modeler = new Modeler({ container });

    // when
    const { warnings } = await modeler.importXML(XML);

    // then
    expect(warnings).toEqual([]);
    expect(modeler.get('elementRegistry').get('StartEvent_1')).toBeDefined();
  });

});
