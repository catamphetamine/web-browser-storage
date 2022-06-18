export default class MemoryStorage {
	// {boolean} `[options.stringifyStoredValues]` — Pass `false` to disable forced data serialization/deserialization on write/read. For example, `Date`s will be read as strings after writing.
	constructor({
		id,
		stringifyStoredValues,
		dataSource,
		getExternalChangeListeners,
		setExternalChangeListeners
	} = {}) {
		// `id` might be undefined, in which case "external" change listeners
		// added via `onExternalChange()` for this `MemoryStorage` will be ignored.
		this.id = id

		// Options.
		this.stringifyStoredValues = stringifyStoredValues

		if (dataSource) {
			this.data = dataSource
		} else {
			this._data = {}
			this.data = {
				getAll: () => this._data,
				setAll: (data) => { this._data = data },
				has: (key) => key in this._data,
				get: (key) => this._data[key],
				set: (key, value) => { this._data[key] = value },
				delete: (key) => { delete this._data[key] }
			}
		}

		if (getExternalChangeListeners) {
			this.getExternalChangeListeners = getExternalChangeListeners
			this.setExternalChangeListeners = setExternalChangeListeners
		} else {
			this.externalChangeListeners = []
			this.getExternalChangeListeners = () => this.externalChangeListeners,
			this.setExternalChangeListeners = (listeners) => this.externalChangeListeners = listeners
		}
	}

	createSharedInstance(id) {
		if (!id) {
			throw new Error('[web-browser-storage] `id` argument is required when creating a shared `MemoryStorage` instance')
		}

		return new MemoryStorage({
			id,
			stringifyStoredValues: this.stringifyStoredValues,
			dataSource: this.data,
			getExternalChangeListeners: this.getExternalChangeListeners,
			setExternalChangeListeners: this.setExternalChangeListeners
		})
	}

	triggerExternalChangeListeners({ key, value, prevValue }) {
		if (this.id !== undefined) {
			for (const { storageId, listener } of this.getExternalChangeListeners()) {
				if (storageId !== undefined) {
					if (storageId !== this.id) {
						listener({
							key,
							value,
							prevValue
						})
					}
				}
			}
		}
	}

	has(key) {
		return this.data.has(key)
	}

	get(key) {
		if (!this.has(key)) {
			return null
		}
		const item = this.data.get(key)
		if (this.stringifyStoredValues !== false) {
			if (item !== undefined) {
				return JSON.parse(JSON.stringify(item))
			}
		}
		return item
	}

	set(key, value) {
		// Get the previous value.
		const prevValue = this.get(key)

		// Update the value.
		this.data.set(key, value)

		// Trigger external change listeners.
		this.triggerExternalChangeListeners({
			key,
			value,
			prevValue
		})
	}

	delete(key) {
		// Get the previous value.
		const prevValue = this.get(key)

		// Clear the value.
		this.data.delete(key)

		// Trigger external change listeners.
		this.triggerExternalChangeListeners({
			key,
			value: null,
			prevValue
		})
	}

	// // Clears the storage data.
	// clear() {
	// 	// Clear the data.
	// 	this.data.setAll({})
	// }

	// // Clears the storage data.
	// clear() {
	// 	// Get the data.
	// 	const keys = this.keys()
	// 	const values = keys.map(key => this.get(key))
	//
	// 	// Clear the data.
	// 	this.clear()
	//
	// 	// Trigger external change listeners for each key.
	// 	let i = 0
	// 	while (i < keys.length) {
	// 		this.triggerExternalChangeListeners({
	// 			key: keys[i],
	// 			value: null,
	// 			prevValue: values[i]
	// 		})
	// 		i++
	// 	}
	// }

	keys() {
		return Object.keys(this.data.getAll())
	}

	getRecordSize(key) {
		if (!this.has(key)) {
			return 0
		}
		let size = key.length
		const value = this.data.get(key)
		if (value !== null && value !== undefined) {
			size += JSON.stringify(value).length
		}
		// They say javascript uses UTF-16 character encoding internally (2 bytes per character).
		// https://stackoverflow.com/questions/4391575/how-to-find-the-size-of-localstorage
		return size * 2
	}

	// Listens for "external" changes to the `storage`.
	// "External" changes originate from other tabs or browser windows.
	onExternalChange(listener) {
		// `id` might be undefined, in which case "external" change listeners
		// added via `onExternalChange()` for this `MemoryStorage` will be ignored.
		this.setExternalChangeListeners(
			this.getExternalChangeListeners().concat(
				{ storageId: this.id, listener }
			)
		)
		return () => {
			this.setExternalChangeListeners(
				this.getExternalChangeListeners().filter(_ => _.listener !== listener)
			)
		}
	}
}

MemoryStorage.isAvailable = () => true