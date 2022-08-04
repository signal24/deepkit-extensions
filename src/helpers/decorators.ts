export const PassthroughClassDecoratorResult = (target: any) => target;

export function PassthroughClassDecorator() {
    return PassthroughClassDecoratorResult;
}

export const PassthroughPropertyDecoratorResult = function (_target: any, _propertyKey: string | symbol) {};

export function PassthroughPropertyDecorator(): PropertyDecorator {
    return PassthroughPropertyDecoratorResult;
}

export function createSymbolAttachmentClassDecorator(aSymbol: symbol) {
    return (): ClassDecorator => {
        return (target: any) => {
            target[aSymbol] = aSymbol;
            return target;
        };
    };
}
