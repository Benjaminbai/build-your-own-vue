export * from "@my-vue/reactivity";

import { nodeOps } from "./nodeOps";
import patchProp from "./patchProp";

const renderOptions = Object.assign({ patchProp }, nodeOps);

function createRenderer() {}

export { renderOptions, createRenderer };
