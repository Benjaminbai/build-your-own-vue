import { reactive } from "@my-vue/reactivity";
import { hasOwn, isFunction } from "@my-vue/shared";

export function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode,
    subTree: null,
    isMounted: false,
    update: null,
    props: {},
    attrs: {},
    propsOptions: vnode.type.props,
    component: null,
    proxy: null,
  };
  return instance;
}

function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {};
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key];
      if (key in propsOptions) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
}

const publicProperties = {
  $attrs: (instance) => instance.attrs,
};

const handler = {
  get(target, key) {
    const { data, props } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }

    const getter = publicProperties[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      // props[key] = value;
      console.warn(`Set reactive property is not allowed.`);
      return false;
    }
    return true;
  },
};

export function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);

  instance.proxy = new Proxy(instance, handler);
  const { data, render } = vnode.type;
  if (!isFunction(data)) {
    return console.warn(`data must be a function.`);
  }
  instance.data = reactive(data.call(instance.proxy));
  instance.render = render;
}
