import AllowedExtensionElementsBehavior from './behavior/AllowedExtensionElementsBehavior.js';
import CleanUpReplacedElementBehavior from './behavior/CleanUpReplacedElementBehavior.js';
import CopyUnknownAttributesBehavior from './behavior/CopyUnknownAttributesBehavior.js';
import TidyExtensionElementsBehavior from './behavior/TidyExtensionElementsBehavior.js';
import UpdateModdleIdBehavior from './behavior/UpdateModdleIdBehavior.js';

/**
 * The Flowable behaviors. Each behavior hooks into bpmn-js modeling commands
 * and keeps Flowable extension data consistent with the model.
 */
export default {
  __init__: [
    'allowedExtensionElementsBehavior',
    'cleanUpReplacedElementBehavior',
    'copyUnknownAttributesBehavior',
    'tidyExtensionElementsBehavior',
    'updateModdleIdBehavior'
  ],
  allowedExtensionElementsBehavior: [ 'type', AllowedExtensionElementsBehavior ],
  cleanUpReplacedElementBehavior: [ 'type', CleanUpReplacedElementBehavior ],
  copyUnknownAttributesBehavior: [ 'type', CopyUnknownAttributesBehavior ],
  tidyExtensionElementsBehavior: [ 'type', TidyExtensionElementsBehavior ],
  updateModdleIdBehavior: [ 'type', UpdateModdleIdBehavior ]
};
