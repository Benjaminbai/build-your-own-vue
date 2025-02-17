import { DirtyLevels } from "./constants";

export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();

  if (options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
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
export class ReactiveEffect {
  _trackId = 0;
  _depsLength = 0;
  _running = 0;
  _dirtyLevel = DirtyLevels.Dirty;

  deps = [];

  public active = true;
  constructor(public fn, public scheduler) {}

  public get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty;
  }

  public set dirty(value) {
    this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty;
  }

  run() {
    this._dirtyLevel = DirtyLevels.NoDirty;
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffects(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffects(this);
      activeEffect = lastEffect;
    }
  }

  stop() {
    if (this.active) {
      this.active = false;
      preCleanEffects(this);
      postCleanEffects(this);
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
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty;
    }
    if (!effect._running) {
      if (effect.scheduler) {
        effect.scheduler();
      }
    }
  }
}
