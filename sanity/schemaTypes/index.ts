import { elementorTypes } from "./elementor";
import { documentTypes, singletonTypes } from "./documents";

export const schemaTypes = [...elementorTypes, ...documentTypes];
export { singletonTypes };
