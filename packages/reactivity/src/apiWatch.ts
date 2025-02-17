import { ReactiveEffect } from "./effect";
import { isObject, isFunction } from "@my-vue/shared";
import { isReactive } from "./reactive";
import { isRef } from "./ref";

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

function doWatch(source, cb, { deep, immediate }) {
  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined);
  let getter;
  if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  }

  let oldValue;
  let clean;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = undefined;
    };
  };

  const job = () => {
    if (cb) {
      const newValue = effect.run();
      if (clean) {
        clean();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect.run();
    }
  };
  const effect: any = new ReactiveEffect(getter, job);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect.run();
    }
  } else {
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
  };

  return unwatch;
}

export function watch(source, cb, options = {}) {
  return doWatch(source, cb, options as any);
}

export function watchEffect(source, options = {}) {
  return doWatch(source, null, options as any);
}
