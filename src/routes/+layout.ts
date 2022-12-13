import { loadStartWrapper } from '$lib';

import type { LayoutLoadEvent } from './$types';

export const load = loadStartWrapper((event: LayoutLoadEvent) => {event;});