type OnChangeListener = (key: string, value?: any, prevValue?: any) => void;

export interface Storage {
	get(key: string): any | undefined;
	set(key: string, value?: any): void;
	has(key: string): boolean;
	delete(key: string): void;
	getRecordSize(key: string): number;
	keys(): string[];
	onExternalChange(onChangeListener: OnChangeListener): () => void;
}

interface LocalStorage extends Storage {}

interface LocalStorageOptions {
	onFull?: ({ error: DOMException }) => void;
	log?: (...args: any[]) => void;
}

export class LocalStorage {
  constructor(options?: LocalStorageOptions);
  static isAvailable(): boolean;
}

interface MemoryStorage extends Storage {}

interface MemoryStorageOptions {
	emulateSerialize?: boolean;
}

export class MemoryStorage {
  constructor(options?: MemoryStorageOptions);
  createSharedInstance(id: string): MemoryStorage;
  getData(): object;
  setData(data: object): void;
}