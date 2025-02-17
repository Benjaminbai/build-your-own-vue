export function patchStyle(el, prevValue, nextValue) {
  let style = el.style;
  for (const key in nextValue) {
    style[key] = nextValue[key];
  }
  for (const key in prevValue) {
    if (nextValue[key] == null) {
      style[key] = null;
    }
  }
}
