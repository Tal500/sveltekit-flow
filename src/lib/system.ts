import type { Load, LoadEvent } from "@sveltejs/kit";

type ServiceStarter<T, Params extends []> = (...args: Params) => {
    instance: T;
    reload?: (...args: Params) => void;
    stop?: (instance: T) => void;
};

export const startDecorator = <T, Params extends []>(value: ServiceStarter<T, Params>) => value;

export class ToyService {
    static start = startDecorator(() => {
        const instance = new ToyService();
        
        return {
            instance,
            reload: () => undefined,
            stop: () => undefined,
        }
    });
}

type MaybePromise<T> = T | Promise<T>;

type Normalize<T> = T extends void ? Record<string, unknown> : T;

interface LoadContext {
    extra: Record<string, unknown>;
};

interface ModifiedOutput<OutputData extends Record<string, unknown>> extends Record<string, unknown> {
    
    __loadPromise: Promise<OutputData>
};

export type OriginalData<ModifiedData extends { __loadPromise: Promise<unknown> }> = Awaited<ModifiedData['__loadPromise']>;

export interface LoadExtended<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	InputData extends Record<string, unknown> | null = Record<string, any> | null,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ParentData extends Record<string, unknown> = Record<string, any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	OutputData extends Record<string, unknown> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> {
	(event: LoadEvent<Params, InputData, ParentData, RouteId>, context: LoadContext): MaybePromise<OutputData>;
}

type LoadLayoutWrapper = <
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>
    (load: LoadExtendedActual) => Load<Params, InputData, ParentData, ModifiedOutput<ParentData & Normalize<OutputData>>, RouteId>;

type LoadPageWrapper = <
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>
    (load: LoadExtendedActual) => Load<Params, InputData, ParentData, ParentData & Normalize<OutputData>, RouteId>;

export type ExtractLayoutData<
    LayoutLoad extends (event: LoadEvent<Partial<Record<string, string>>, Partial<Record<string, unknown>>, Partial<{__loadPromise: Promise<Record<string, unknown>>} & Record<string, unknown>>, string | null>) => MaybePromise<Record<string, unknown>>
    > = Awaited<Awaited<ReturnType<LayoutLoad>>['__loadPromise']>;

const promisifyIfNot = <T>(maybePromise: MaybePromise<T>) =>
    (maybePromise instanceof Promise) ? maybePromise : Promise.resolve(maybePromise);

function createContext() {
    const context = {
        firstPass: true,
        services: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            set: (service: unknown) => {
                if (!context.firstPass) {
                    throw "Cannot set services after the function awaits!";
                }
                // otherwise

                // TODO: complete
            },
        },
        extra: {},
    };

    return context;
}

async function sharedInvoke<
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>
    (load: LoadExtendedActual, event: LoadEvent<Params, InputData, ModifiedOutput<ParentData>, RouteId>): Promise<ModifiedOutput<ParentData & Normalize<OutputData>>> {

    const previous = await event.parent();

    const parent = () => previous.__loadPromise;

    const modifiedEvent = { ...event, parent };

    const context = createContext();

    const currentLoadPromise = load(modifiedEvent, context);
    context.firstPass = false;

    return {
        __loadPromise: Promise.all([previous.__loadPromise, promisifyIfNot(currentLoadPromise)]).then(
            ([prev, cur]) => ({ ...prev, ...(cur ?? {}) } as ParentData & Normalize<OutputData>)),
    }
}

export function loadMainLayoutWrapper<
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>(load: LoadExtendedActual) {
    
    return (event: LoadEvent<Params, InputData, ParentData, RouteId>) => {
        const context = createContext();
        
        const currentLoadPromise = load(event, context);
        context.firstPass = false;
    
        return {
            __loadPromise: Promise.all([event.parent(), promisifyIfNot(currentLoadPromise)]).then(
                ([prev, cur]) => ({ ...prev, ...(cur ?? {}) } as ParentData & Normalize<OutputData>)),
        }
    }
}

export const loadLayoutWrapper = (<
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>
    (load: LoadExtendedActual) => (event: LoadEvent<Params, InputData, ModifiedOutput<ParentData>, RouteId>) =>
        sharedInvoke<Params, InputData, ParentData, OutputData, RouteId, LoadExtendedActual>(load, event)
) as LoadLayoutWrapper;

export const loadPageWrapper = (<
    Params extends Partial<Record<string, string>>,
    InputData extends Record<string, unknown> | null,
    ParentData extends Record<string, unknown>,
    OutputData extends Record<string, unknown> | void,
    RouteId extends string | null,
    LoadExtendedActual extends LoadExtended<Params, InputData, ParentData, OutputData, RouteId>>
    (load: LoadExtendedActual) => (event: LoadEvent<Params, InputData, ModifiedOutput<ParentData>, RouteId>) =>
    sharedInvoke(load, event).then((result) => result.__loadPromise)
) as LoadPageWrapper;


// type ModifiedEvent<LoadExtendedActual extends LoadExtended<
//     Partial<Record<string, string>>,
//     Record<string, unknown> | null,
//     Record<string, unknown>,
//     Record<string, unknown> | void,
//     string | null>> = Exclude<Parameters<LoadExtendedActual>[0], 'parent'> &
//         { parent: () => Promise<ModifiedOutput<Awaited<ReturnType<Parameters<LoadExtendedActual>[0]['parent']>>>> };

// export const loadLayoutWrapper = (<
//     LoadExtendedActual extends LoadExtended<
//         Partial<Record<string, string>>,
//         Record<string, unknown> | null,
//         Record<string, unknown>,
//         Record<string, unknown> | void,
//         string | null>>
//     (load: LoadExtendedActual) => (event: ModifiedEvent<LoadExtendedActual> ) =>
//         sharedInvoke(load, event)
// );

// export const loadPageWrapper = (<
//     LoadExtendedActual extends LoadExtended<
//         Partial<Record<string, string>>,
//         Record<string, unknown> | null,
//         Record<string, unknown>,
//         Record<string, unknown> | void,
//         string | null>>
//     (load: LoadExtendedActual) => (event: ModifiedEvent<LoadExtendedActual> ) =>
//     sharedInvoke(load, event).then((result) => result.__loadPromise)
// );