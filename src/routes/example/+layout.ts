import { loadInterWrapper, type SimplifyLoadEvent } from '$lib';

import type { LayoutLoadEvent } from './$types';

export const load = loadInterWrapper((event: SimplifyLoadEvent<LayoutLoadEvent>) => { event; });