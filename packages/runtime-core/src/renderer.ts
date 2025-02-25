import { ShapeFlags } from "@my-vue/shared";
import { isSameVnode, Text, Fragment } from "./createVnode";
import { getSequence } from "./seq";
import { ReactiveEffect, isRef } from "@my-vue/reactivity";
import { queueJob } from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArray } from "./apiLifeCycle";

export function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container);
    }
  };

  const mountElement = (vnode, container, anchor) => {
    const { type, children, props, shapeFlag } = vnode;
    const el = (vnode.el = hostCreateElement(type));

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }

    hostInsert(el, container, anchor);
  };

  function patchProps(oldProps, newProps, el) {
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }

    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child);
    }
  }

  function patchKeyedChildren(c1, c2, el) {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }

      e1--;
      e2--;
    }

    if (i > e1) {
      if (i <= e2) {
        let nextPos = e2 + 1;
        let anchor = c2[nextPos]?.el;
        while (i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i]);
          i++;
        }
      }
    } else {
      let s1 = i;
      let s2 = i;
      let keyToNewIndexMap = new Map();
      let toBePatched = e2 - s2 + 1;
      let newIndexToOldIndexMap = new Array(toBePatched).fill(0);

      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        const vnode = c1[i];
        const newIndex = keyToNewIndexMap.get(vnode.key);
        if (newIndex == undefined) {
          unmount(vnode);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          patch(vnode, c2[newIndex], el);
        }
      }
      let increasingSeq = getSequence(newIndexToOldIndexMap);
      let j = increasingSeq.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        let newIndex = s2 + i;
        let anchor = c2[newIndex + 1]?.el;
        let vnode = c2[newIndex];
        if (!vnode.el) {
          patch(null, vnode, el, anchor);
        } else {
          if (i === increasingSeq[j]) {
            j--;
          } else {
            hostInsert(vnode.el, el, anchor);
          }
        }
      }
    }
  }

  function patchChildren(oldVnode, newVnode, el) {
    const c1 = oldVnode.children;
    const c2 = newVnode.children;

    const prevShapeFlag = oldVnode.shapeFlag;
    const shapeFlag = newVnode.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }

      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, el);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
    }
  }

  function patchElement(oldVnode, newVnode, container) {
    let el = (newVnode.el = oldVnode.el);
    let oldProps = oldVnode.props || {};
    let newProps = newVnode.props || {};

    patchProps(oldProps, newProps, el);

    patchChildren(oldVnode, newVnode, el);
  }

  function processElement(oldVnode, newVnode, container, anchor) {
    if (oldVnode == null) {
      mountElement(newVnode, container, anchor);
    } else {
      patchElement(oldVnode, newVnode, container);
    }
  }

  function processText(oldVnode, newVnode, container) {
    if (oldVnode == null) {
      hostInsert((newVnode.el = hostCreateText(newVnode.children)), container);
    } else {
      const el = (newVnode.el = oldVnode.el);
      if (newVnode.children !== oldVnode.children) {
        hostSetText(el, newVnode.children);
      }
    }
  }

  function processFragment(oldVnode, newVnode, container) {
    if (oldVnode == null) {
      mountChildren(newVnode.children, container);
    } else {
      patchChildren(oldVnode, newVnode, container);
    }
  }

  function updateComponentPreRender(instance, nextVnode) {
    instance.next = null;
    instance.vnode = nextVnode;
    updateProps(instance, instance.props, nextVnode.props);
  }

  function renderComponent(instance) {
    const { render, vnode, proxy, props, attrs } = instance;
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy);
    } else {
      return vnode.type(attrs);
    }
  }

  function setupRenderEffect(instance, container, anchor) {
    const componentUpdateFn = () => {
      const { bm, m } = instance;
      if (!instance.isMounted) {
        if (bm) {
          invokeArray(bm);
        }

        const subTree = renderComponent(instance);
        patch(null, subTree, container, anchor);
        instance.isMounted = true;
        instance.subTree = subTree;
        if (m) {
          invokeArray(m);
        }
      } else {
        const { next, bu, u } = instance;
        if (next) {
          updateComponentPreRender(instance, next);
        }

        if (bu) {
          invokeArray(bu);
        }
        const subTree = renderComponent(instance);
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
        if (u) {
          invokeArray(u);
        }
      }
    };

    const efft = new ReactiveEffect(componentUpdateFn, () => queueJob(update));

    const update = (instance.update = () => {
      efft.run();
    });
    update();
  }

  function mountComponent(vnode, container, anchor) {
    const instance = (vnode.component = createComponentInstance(vnode));
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  }

  function hasPropsChanged(oldProps, newProps) {
    let nkeys = Object.keys(newProps);
    if (Object.keys(oldProps).length !== nkeys.length) {
      return true;
    }
    for (let i = 0; i < nkeys.length; i++) {
      const key = nkeys[i];
      if (oldProps[key] !== newProps[key]) {
        return true;
      }
    }

    return false;
  }

  function updateProps(instance, oldProps, newProps) {
    if (hasPropsChanged(oldProps, newProps)) {
      for (const key in newProps) {
        instance.props[key] = newProps[key];
      }
      for (const key in instance.props) {
        if (!(key in newProps)) {
          delete instance.props[key];
        }
      }
    }
  }

  function shouldComponentUpdate(oldVnode, newVnode) {
    const { props: prevProps, children: prevChildren } = oldVnode;
    const { props: nextProps, children: nextChildren } = newVnode;
    if (prevChildren || nextChildren) return true;
    if (prevProps === nextProps) return false;
    return hasPropsChanged(prevProps, nextProps);
  }

  function updateComponent(oldVnode, newVnode) {
    const instance = (newVnode.component = oldVnode.component);
    if (shouldComponentUpdate(oldVnode, newVnode)) {
      instance.next = newVnode;
      instance.update();
    } else {
    }
  }

  function processComponent(oldVnode, newVnode, container, anchor) {
    if (oldVnode == null) {
      mountComponent(newVnode, container, anchor);
    } else {
      updateComponent(oldVnode, newVnode);
    }
  }

  const patch = (oldVnode, newVnode, container, anchor = null) => {
    if (oldVnode === newVnode) {
      return;
    }

    if (oldVnode && !isSameVnode(oldVnode, newVnode)) {
      unmount(oldVnode);
      oldVnode = null;
    }
    const { type, shapeFlag, ref } = newVnode;
    switch (type) {
      case Text:
        processText(oldVnode, newVnode, container);
        break;
      case Fragment:
        processFragment(oldVnode, newVnode, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(oldVnode, newVnode, container, anchor);
        } else {
          processComponent(oldVnode, newVnode, container, anchor);
        }
        break;
    }

    if (ref !== null) {
      setRef(ref, newVnode);
    }
  };

  function setRef(rawRef, vnode) {
    let value =
      vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
        ? vnode.component.exposed || vnode.component.proxy
        : vnode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  }

  function unmount(vnode) {
    const { shapeFlag } = vnode;
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children);
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      unmount(vnode.component.subTree);
    } else {
      hostRemove(vnode.el);
    }
  }

  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };

  return {
    render,
  };
}
