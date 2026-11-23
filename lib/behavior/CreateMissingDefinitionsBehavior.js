import { createMissingDefinitions } from '../util/MissingDefinitions.js';

/**
 * Runs before the modeler claims the imported IDs, so the created
 * definitions' IDs are claimed with them.
 */
const HIGH_PRIORITY = 1500;


/**
 * Creates the error, message, signal and escalation definitions that
 * unresolved references stand for when a model is imported (see
 * createMissingDefinitions). The fixed references no longer show as import
 * warnings.
 *
 * The definitions are part of the imported model, not a modeling change, so
 * there is nothing to undo after the import.
 */
export default class CreateMissingDefinitionsBehavior {

  constructor(eventBus) {
    eventBus.on('import.parse.complete', HIGH_PRIORITY, event => {
      const { error, definitions, warnings, elementsById } = event;

      if (error || !definitions) {
        return;
      }

      createMissingDefinitions(definitions, { warnings, elementsById });
    });
  }
}

CreateMissingDefinitionsBehavior.$inject = [ 'eventBus' ];
