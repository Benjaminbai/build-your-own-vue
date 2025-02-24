import { isString, ShapeFlags, isObject } from "@my-vue/shared";

export function isVnode(value) {
  return value?.__v_isVnode;
}

export function isSameVnode(a, b) {
  return a.type === b.type && a.key === b.key;
}

export function createVnode(type, props, children?) {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    el: null,
    shapeFlag,
  };
  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }else if(isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
      
    } else {
      children = String(children);
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }

  return vnode;
}

export const Text = Symbol("Text");

export const Fragment = Symbol("Fragment");
