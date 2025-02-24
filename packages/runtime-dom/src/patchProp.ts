import { patchClass } from "./patchClass";
import { patchStyle } from "./patchStyle";
import { patchEvent } from "./patchEvent";
import { patchAttr } from "./patchAttr";

export default function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  } else if (key === "style") {
    return patchStyle(el, prevValue, nextValue);
  } else if (/^on[A-Z]/.test(key)) {
    return patchEvent(el, key, nextValue);
  } else {
    return patchAttr(el, key, nextValue);
  }
}
