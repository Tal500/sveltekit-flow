import { loadEndWrapper, type SimplifyLoadEvent } from '$lib';

import type { PageLoadEvent } from './$types';

export const load = loadEndWrapper((event: SimplifyLoadEvent<PageLoadEvent>) => {event;});