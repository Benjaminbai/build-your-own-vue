import { reactive, proxyRefs } from "@my-vue/reactivity";
import { hasOwn, isFunction, ShapeFlags } from "@my-vue/shared";

export function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode,
    subTree: null,
    isMounted: false,
    update: null,
    props: {},
    attrs: {},
    slots: {},
    propsOptions: vnode.type?.props,
    component: null,
    proxy: null,
    setupState: {},
    exposed: null,
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
  $slots: (instance) => instance.slots,
};

const handler = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    }

    const getter = publicProperties[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      // props[key] = value;
      console.warn(`Set reactive property is not allowed.`);
      return false;
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
    }
    return true;
  },
};

export function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
}

export function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);

  instance.proxy = new Proxy(instance, handler);
  const { data = () => {}, render, setup } = vnode.type;
  if (setup) {
    const setupContext = {
      slots: instance.slots,
      attrs: instance.attrs,
      emit(event, ...args) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler = instance.vnode.props[eventName];
        if (handler) {
          handler(...args);
        }
      },
      expose(value) {
        instance.exposed = value;
      },
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext);
    unsetCurrentInstance();
    if (setupResult) {
      if (isFunction(setupResult)) {
        instance.render = setupResult;
      } else {
        instance.setupState = proxyRefs(setupResult);
      }
    }
  }

  if (!isFunction(data)) {
    return console.warn(`data must be a function.`);
  } else {
    instance.data = reactive(data.call(instance.proxy));
  }

  if (!instance.render) {
    instance.render = render;
  }
}

export let currentInstance = null;

export function getCurrentInstance() {
  return currentInstance;
}

export function setCurrentInstance(instance) {
  currentInstance = instance;
}

export function unsetCurrentInstance() {
  currentInstance = null;
}
