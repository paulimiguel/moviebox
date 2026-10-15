// Express 4 no captura las promesas rechazadas de los handlers async: la solicitud quedaba
// sin respuesta. Este parche reenvía esos errores a next() para que los atienda el middleware de errores.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layer = require('express/lib/router/layer');

type Handler = (req: unknown, res: unknown, next: (error?: unknown) => void) => unknown;

const originalHandleRequest = Layer.prototype.handle_request as (this: { handle: Handler }, req: unknown, res: unknown, next: (error?: unknown) => void) => void;

Layer.prototype.handle_request = function patchedHandleRequest(this: { handle: Handler }, req: unknown, res: unknown, next: (error?: unknown) => void) {
  const handler = this.handle;
  // Los middlewares de errores (4 argumentos) y los que no son función siguen el camino original.
  if (typeof handler !== 'function' || handler.length > 3) return originalHandleRequest.call(this, req, res, next);
  try {
    const result = handler(req, res, next);
    if (result && typeof (result as Promise<unknown>).catch === 'function') (result as Promise<unknown>).catch(next);
  } catch (error) {
    next(error);
  }
  return undefined;
};

export {};
