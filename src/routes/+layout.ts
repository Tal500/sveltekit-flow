import { loadStartWrapper, type SimplifyLoadEvent } from '$lib';

import type { LayoutLoadEvent } from './$types';

export const load = loadStartWrapper((event: SimplifyLoadEvent<LayoutLoadEvent>) => {event;});