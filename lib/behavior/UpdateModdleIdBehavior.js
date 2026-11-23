import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';


/**
 * Keeps the model's ID registry in step when element.updateModdleProperties
 * changes an ID, such as the ID of a participant's process, a signal, a
 * message or an error that #67 created. bpmn-js does this for
 * element.updateProperties only; without it the old ID stays taken and the
 * new one could be given to another element.
 *
 * References to the element are objects, so they are written with the new
 * ID.
 */
export default class UpdateModdleIdBehavior extends CommandInterceptor {

  constructor(eventBus, commandStack) {
    super(eventBus);

    this.preExecute('element.updateModdleProperties', context => {
      const { moddleElement, properties } = context;

      if (!properties || !('id' in properties) || !hasIdProperty(moddleElement)) {
        return;
      }

      const oldId = moddleElement.get('id');
      const newId = properties.id;

      if (oldId === newId) {
        return;
      }

      const ids = moddleElement.$model.ids;

      if (oldId && ids && ids.assigned(oldId) === moddleElement) {
        commandStack.execute('id.updateClaim', { id: oldId, element: moddleElement, claiming: false });
      }

      if (newId) {
        commandStack.execute('id.updateClaim', { id: newId, element: moddleElement, claiming: true });
      }
    }, true);
  }
}

UpdateModdleIdBehavior.$inject = [ 'eventBus', 'commandStack' ];


function hasIdProperty(moddleElement) {
  const descriptor = moddleElement && moddleElement.$descriptor;

  return !!(descriptor && descriptor.idProperty);
}
