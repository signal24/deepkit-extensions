import { App, AppModule, RootModuleDefinition } from '@deepkit/app';
import { ClassType } from '@deepkit/core';
import { FrameworkConfig, FrameworkModule, onServerMainBootstrapDone } from '@deepkit/framework';
import { HttpListener } from '@deepkit/http';
import { InjectorModule } from '@deepkit/injector';
import { OpenAPIModule } from 'deepkit-openapi';

import { createSymbolAttachmentClassDecorator } from '../helpers/decorators';
import { HttpWorkflowListener } from '../http';
import { Mail } from '../services';

const appState: { currentApp?: App<any> } = {};
const isDevelopment =
    (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') && (!process.env.APP_ENV || process.env.APP_ENV === 'development');
const envPort = process.env.PORT && /^\d+$/.test(process.env.PORT) ? parseInt(process.env.PORT) : 3000;

const instantiateAtStartupSymbol = Symbol('InstantiateAtStartup');
export const InstantiateAtStartup = createSymbolAttachmentClassDecorator(instantiateAtStartupSymbol);

type CreateAppOptions = RootModuleDefinition & { frameworkConfig?: FrameworkConfig };
export function createApp<T extends CreateAppOptions>(options: T) {
    const { frameworkConfig, ...appOptions } = options;
    const app = new App({
        ...appOptions,
        imports: [
            ...(appOptions.imports ?? []),
            new FrameworkModule({
                port: envPort,
                debug: isDevelopment,
                migrationDir: 'src/migrations',
                ...frameworkConfig
            }),
            ...(isDevelopment
                ? [
                      new OpenAPIModule({
                          prefix: '/_openapi/'
                      })
                  ]
                : [])
        ],
        providers: [HttpListener, Mail, ...(appOptions.providers ?? [])],
        listeners: [HttpWorkflowListener, ...(appOptions.listeners ?? [])]
    });
    app.listen(onServerMainBootstrapDone, () => {
        doModuleStartupInstantiations(app.appModule);
    });
    app.loadConfigFromEnv({
        prefix: '',
        envFilePath: `${process.cwd()}/.env`,
        namingStrategy: 'same'
    });
    appState.currentApp = app;
    return app;
}

async function doModuleStartupInstantiations(aModule: AppModule | InjectorModule) {
    const injector = aModule.injector;

    if (aModule.imports?.length) {
        for (const anImport of aModule.imports) {
            await doModuleStartupInstantiations(anImport);
        }
    }

    for (const provider of aModule.providers) {
        if ((provider as any)[instantiateAtStartupSymbol]) {
            injector?.get(provider);
        }
    }
}

export function getApp() {
    if (!appState.currentApp) throw new Error('no app initialized');
    return appState.currentApp;
}

export function getAppModule() {
    return getApp().appModule;
}

export function getAppConfig<T>(): T {
    return getAppModule().config;
}

const resolveCache = new WeakMap();
export function resolve<T>(type: ClassType<T>): T {
    const cached = resolveCache.get(type as any);
    if (cached) return cached;

    if (!appState.currentApp) throw new Error('no app initialized');
    const injector = appState.currentApp.appModule.injector;
    if (!injector) throw new Error('no injector available via app module');
    const resolved = injector.get<T>(type);
    resolveCache.set(type as any, resolved);
    return resolved as T;
}

export const r = resolve;
