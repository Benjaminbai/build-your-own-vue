import { ReactiveEffect } from "./effect";
import { isObject } from "@my-vue/shared";

function traverse(source, depth, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) {
    return source;
  }

  if (depth) {
    if (currentDepth >= depth) {
      return source;
    }
    currentDepth++;
  }

  if (seen.has(source)) {
    return source;
  }

  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen);
  }

  return source;
}

function doWatch(source, cb, { deep }) {
  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined);
  const getter = () => reactiveGetter(source);
  let oldValue;
  const job = () => {
    const newValue = effect.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  };
  const effect = new ReactiveEffect(getter, job);
  oldValue = effect.run();
}

export function watch(source, cb, options) {
  return doWatch(source, cb, options);
}
