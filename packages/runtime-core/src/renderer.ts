import { ShapeFlags } from "@my-vue/shared";
import { isSameVnode } from "./createVnode";

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

  const mountElement = (vnode, container) => {
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

    hostInsert(el, container);
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

  function processElement(oldVnode, newVnode, container) {
    if (oldVnode == null) {
      mountElement(newVnode, container);
    } else {
      patchElement(oldVnode, newVnode, container);
    }
  }

  const patch = (oldVnode, newVnode, container) => {
    if (oldVnode === newVnode) {
      return;
    }

    if (oldVnode && !isSameVnode(oldVnode, newVnode)) {
      unmount(oldVnode);
      oldVnode = null;
    }
    processElement(oldVnode, newVnode, container);
  };

  function unmount(vnode) {
    hostRemove(vnode.el);
  }

  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    }
    patch(container._vnode || null, vnode, container);

    container._vnode = vnode;
  };

  return {
    render,
  };
}
