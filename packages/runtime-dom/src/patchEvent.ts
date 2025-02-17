function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}

export function patchEvent(el, name, nextValue) {
  const invokers = el._vei || (el._vei = {});
  const eventName = name.slice(2).toLowerCase();
  const existingInvoker = invokers[name];
  if (nextValue && existingInvoker) {
    return (existingInvoker.value = nextValue);
  }
  if (nextValue) {
    const invoker = (invokers[name] = createInvoker(nextValue));
    return el.addEventListener(eventName, invoker);
  }
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokers[name] = undefined;
  }
}
