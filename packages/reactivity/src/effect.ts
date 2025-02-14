export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();

  return _effect;
}

function preCleanEffects(effect) {
  effect._depsLength = 0;
  effect._trackId++;
}

function postCleanEffects(effect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = 0; i < effect.deps.length; i++) {
      cleanDepEffect(effect.deps[i], effect);
    }
    effect.deps.length = effect._depsLength;
  }
}

export let activeEffect;
class ReactiveEffect {
  _trackId = 0;
  deps = [];
  _depsLength = 0;
  public active = true;
  constructor(public fn, public scheduler) {}

  run() {
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffects(this);
      return this.fn();
    } finally {
      postCleanEffects(this);
      activeEffect = lastEffect;
    }
  }
}

function cleanDepEffect(dep, effect) {
  dep.delete(effect);
  if (dep.size === 0) {
    dep.cleanup();
  }
}

export function trackEffect(effect, dep) {
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId);
    let oldDep = effect.deps[effect._depsLength];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect);
      }
      effect.deps[effect._depsLength++] = dep;
    } else {
      effect._depsLength++;
    }
  }
}

export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler();
    }
  }
}
