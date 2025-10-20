// ws-decorators.ts
import 'reflect-metadata';
import { Server, Socket } from 'socket.io';
import type { SocketEventCallback, AckResponse } from '@/modules/socket/dto/socket-events.interface';

const META = {
  GATEWAY: Symbol('ws:gateway'),
  EVENTS: Symbol('ws:events'),
  MIDDLEWARES: Symbol('ws:mws'),
  PARAMS: Symbol('ws:params'),
};

type WsMiddleware = (socket: Socket, data: any) => Promise<void> | void;

type ParamType = 'socket' | 'server' | 'body' | 'ack';
interface ParamMeta { index: number; type: ParamType; }

function pushParam(target: any, key: string, index: number, type: ParamType) {
  const paramList: Record<string, ParamMeta[]> =
    Reflect.getMetadata(META.PARAMS, target.constructor) ?? {};
  const arr = paramList[key] ?? [];
  arr.push({ index, type });
  paramList[key] = arr;
  Reflect.defineMetadata(META.PARAMS, paramList, target.constructor);
}

export function Gateway(namespace = '/') {
  return (ctor: any) => {
    Reflect.defineMetadata(META.GATEWAY, { namespace }, ctor);
  };
}

export function On(event: string) {
  return (target: any, key: string) => {
    const list: Array<{ method: string; event: string }> =
      Reflect.getMetadata(META.EVENTS, target.constructor) ?? [];
    list.push({ method: key, event });
    Reflect.defineMetadata(META.EVENTS, list, target.constructor);
  };
}

export function UseMiddlewares(...mws: WsMiddleware[]) {
  return (target: any, key: string) => {
    const map: Record<string, WsMiddleware[]> =
      Reflect.getMetadata(META.MIDDLEWARES, target.constructor) ?? {};
    map[key] = [...(map[key] ?? []), ...mws];
    Reflect.defineMetadata(META.MIDDLEWARES, map, target.constructor);
  };
}

export const UseGuards = UseMiddlewares;

export function ConnectedSocket() {
  return (target: any, key: string, index: number) =>
    pushParam(target, key, index, 'socket');
}
export function ServerRef() {
  return (target: any, key: string, index: number) =>
    pushParam(target, key, index, 'server');
}
export function MessageBody() {
  return (target: any, key: string, index: number) =>
    pushParam(target, key, index, 'body');
}

// Typed ack param decorator; generic is TS-only (runtime stays 'ack')
export function Ack<T = unknown>() {
  return (target: any, key: string, index: number) =>
    pushParam(target, key, index, 'ack');
}

/** Binder with async/await & smart auto-ack */
export function registerGateway<C = unknown>(
  io: Server,
  GatewayClass: new (...args: any[]) => any,
  context?: C,
  ...constructorArgs: any[]
) {
  const gwMeta = Reflect.getMetadata(META.GATEWAY, GatewayClass) as { namespace: string } | undefined;
  const ns = gwMeta?.namespace ?? '/';
  const events = (Reflect.getMetadata(META.EVENTS, GatewayClass) as Array<{ method: string; event: string }>) ?? [];
  const mwsMap = (Reflect.getMetadata(META.MIDDLEWARES, GatewayClass) as Record<string, WsMiddleware[]>) ?? {};
  const paramsMap = (Reflect.getMetadata(META.PARAMS, GatewayClass) as Record<string, ParamMeta[]>) ?? {};

  const nsp = io.of(ns);
  const instance = new GatewayClass(...constructorArgs);

  if (context && typeof (instance as any).setContext === 'function') {
    (instance as any).setContext(context);
  }

  // Log registered events for debugging
  console.log(`[${ns}] Registering ${events.length} events:`, events.map(e => e.event).join(', '));

  nsp.on('connection', async (socket: Socket) => {
    // Basic connection logging - gateways handle their own connection logic
    console.log(`[${ns}] Socket connected: ${socket.id}`);

    for (const { method, event } of events) {
      socket.on(event, async (data: any, clientAck?: (res: AckResponse<any>) => void) => {
        try {
          // Validate method exists
          if (typeof (instance as any)[method] !== 'function') {
            const error = `Method '${method}' is not a function on gateway instance`;
            console.error(`[${ns}] ${error}. Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => typeof (instance as any)[m] === 'function'));
            throw new Error(error);
          }

          // 1) middlewares
          const mws = mwsMap[method] ?? [];
          for (const mw of mws) await mw(socket, data);

          // 2) resolve params
          const pmeta = paramsMap[method] ?? [];
          const args: any[] = [];
          const ackParamUsed = pmeta.some(pm => pm.type === 'ack');

          for (const pm of pmeta) {
            if (pm.type === 'socket') args[pm.index] = socket;
            else if (pm.type === 'server') args[pm.index] = io;
            else if (pm.type === 'ack') {
              // inject real ack if provided, otherwise a no-op
              const safeAck: SocketEventCallback<any> = clientAck ?? (() => { });
              args[pm.index] = safeAck;
            } else {
              args[pm.index] = data;
            }
          }

          // 3) call handler (can be async)
          const result = await (instance as any)[method](...args);

          // 4) auto-ack only if user did NOT ask for ack param
          if (!ackParamUsed && clientAck && result !== undefined) {
            clientAck({ ok: true, data: result });
          }
        } catch (e: any) {
          console.error(`[${ns}] Error handling event '${event}':`, e);
          if (clientAck) clientAck({ ok: false, error: e?.message ?? 'Error' });
          else socket.emit('error', { event, message: e?.message ?? 'Error' });
        }
      });
    }
  });

  return nsp;
}
