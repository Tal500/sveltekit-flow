import { loadStartWrapper, type LoadContext } from '$lib';

import type { LayoutLoad, LayoutLoadEvent } from './$types';
 
//export const load = loadStartBlank<LayoutLoadEvent>();
//export const load = loadStartWrapper((() => undefined) as BaseLoadExtended<LayoutLoadEvent>);
//export const load = loadStartWrapper<(event: LayoutLoadEvent) => void>(() => undefined);
export const load = loadStartWrapper((event: LayoutLoadEvent) => {event;});