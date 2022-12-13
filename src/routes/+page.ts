import { loadEndWrapper } from '$lib';

import type { PageLoadEvent } from './$types';

export const load = loadEndWrapper((event: PageLoadEvent) => {event;});