import { getTraceId } from '@/lib/logger/utils';

export function attachTraceId(): MethodDecorator & PropertyDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor?: PropertyDescriptor,
  ) {
    const wrapFunction = (fn: Function) => {
      return function (this: any, ...args: any[]) {
        if (args.length > 0 && args[0] && typeof args[0] === 'object') {
          const params = args[0];
          if ('logger' in params && params.logger) {
            let { logger } = params;

            if (typeof logger.metadata.traceId === 'undefined') {
              logger = logger.attachMetadata({ traceId: getTraceId() });
              args[0] = { ...params, logger };
            }
          }
        }

        return fn.apply(this, args);
      };
    };

    if (descriptor) {
      // Для методов
      const originalMethod = descriptor.value;
      descriptor.value = wrapFunction(originalMethod);
      return descriptor;
    } else {
      // Для свойств/функций
      const originalValue = target[propertyKey];
      if (typeof originalValue === 'function') {
        target[propertyKey] = wrapFunction(originalValue);
      }
      return target;
    }
  };
}
