// resolver
// if (context.route.action.type === 'controller') {
//     const methodName = context.route.action.methodName;
//     const controllerType = resolveRuntimeType(context.route.action.controller) as TypeClass;
//     const methodType = controllerType.types.find(
//         t => t.kind === ReflectionKind.method && t.name === methodName
//     ) as TypeMethod;
//     const parameterType = methodType.parameters.find(p => p.name === context.name);
//     console.log('type', parameterType);
// }
