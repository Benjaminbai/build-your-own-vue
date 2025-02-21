export const isObject = (value) => typeof value === "object" && value !== null;

export const isFunction = (value) => typeof value === "function";

export const isString = (value) => typeof value === "string";

const hasOwnPrototype = Object.prototype.hasOwnProperty;
export const hasOwn = (value, key) => {
  return hasOwnPrototype.call(value, key);
};

export * from "./shapeFlags";
