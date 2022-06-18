import { ITabStatusWatcher } from 'web-browser-tab/status-watcher'
import { ITimer } from 'web-browser-timer'

import { Storage } from './index'

// interface TabStatusWatcher {
// 	start(): void;
// 	stop(): void;
// }

interface CachedStorageOptions {
	flushDelay: number;
	storage: Storage;
	timer?: ITimer;
	tabStatusWatcher?: TabStatusWatcher;
	log?: (...args: any[]) => void;
	merge?: (key: string, cachedValue?: any, newValue?: any) => any;
}

interface CachedStorage extends Storage {}

export class CachedStorage {
	constructor(options: CachedStorageOptions);
	start(): void;
	stop(): void;
	cacheKey(pattern: string): void;
}