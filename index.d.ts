import type { Timer } from 'web-browser-timer'
import type { TabStatusWatcher } from 'web-browser-tab/status-watcher'

type OnChangeListener<Value> = (parameters: {
	key: string,
	value?: Value,
	prevValue?: Value
}) => void;

export class Storage<Value = any> {
	get(key: string): Value | undefined;
	set(key: string, value?: Value): void;
	has(key: string): boolean;
	delete(key: string): void;
	getRecordSize(key: string): number;
	keys(): string[];
	onExternalChange(onChangeListener: OnChangeListener<Value>): () => void;
}

export interface CachedStorageOptions<Value> {
	storage: Storage;
	tabStatusWatcher?: TabStatusWatcher;
	timer?: Timer;
	flushDelay: number;
	log?: (...args: any[]) => void;
	merge?: (newDataKey: string, existingDataKey: string, value: Value) => Value;
	matchesPattern?: (key: string, pattern: string) => boolean;
	cachedKeys?: string[];
}

export class CachedStorage<Value = any> extends Storage<Value> {
  constructor(options?: CachedStorageOptions<Value>);
	start(): void;
	stop(): void;
	flush(): void;
	cacheKey(pattern: string): void;
}

interface LocalStorageOptions {
	onFull?: ({ error: DOMException }) => void;
	log?: (...args: any[]) => void;
}

export class LocalStorage<Value> extends Storage<Value> {
  constructor(options?: LocalStorageOptions);
  static isAvailable(): boolean;
}

interface MemoryStorageOptions {
	emulateSerialize?: boolean;
}

export class MemoryStorage<Value = any> extends Storage<Value> {
  constructor(options?: MemoryStorageOptions);
  createSharedInstance(id: string): MemoryStorage<Value>;
  getData(): Record<string, Value>;
  setData(data: Record<string, Value>): void;
}