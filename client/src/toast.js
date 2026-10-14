let handler = () => {};
export const setToastHandler = (fn) => (handler = fn);
export const toast = (msg) => handler(msg);
