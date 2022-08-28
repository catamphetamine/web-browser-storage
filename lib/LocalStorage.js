// https://developer.mozilla.org/en-US/docs/Web/API/Storage

import {
	hasObject,
	getObject,
	setObject,
	deleteObject,
	getKeys,
	isAvailable,
	isQuotaExceededError
} from './LocalStorage.helpers.js'

export default class LocalStorage {
	constructor({
		onFull,
		log = () => {}
	} = {}) {
		this.onFull = onFull
		this.log = log
	}

	has(key) {
		return hasObject(key)
	}

	get(key) {
		this.log('read', { key })
		return getObject(key)
	}

	set(key, value) {
		this.log('write', { key, value })
		try {
			setObject(key, value)
		} catch (error) {
			if (isQuotaExceededError(error)) {
				if (this.onFull) {
					this.onFull({ error })
				} else {
					throw error
				}
			} else {
				throw error
			}
		}
	}

	delete(key) {
		this.log('delete', { key })
		deleteObject(key)
	}

	keys() {
		return getKeys()
	}

	getRecordSize(key) {
		if (!this.has(key)) {
			return 0
		}
		let size = key.length
		const value = localStorage.getItem(key)
		if (value !== null) {
			size += value.length
		}
		// `localStorage` stores characters in UTF-16 encoding (2 bytes per character).
		// https://stackoverflow.com/questions/4391575/how-to-find-the-size-of-localstorage
		return size * 2
	}

	// Listens for "external" changes to `localStorage`.
	// "External" changes originate from other tabs or browser windows.
	// https://developer.mozilla.org/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Responding_to_storage_changes_with_the_StorageEvent
	// https://developer.mozilla.org/docs/Web/API/StorageEvent
	onExternalChange(listener) {
		const _listener = (event) => {
			// `event.storageArea` could be:
			// * `localStorage`
			// * `sessionStorage`
			if (event.storageArea === localStorage) {
				listener({
					key: event.key,
					value: parseValue(event.newValue),
					prevValue: parseValue(event.oldValue)
				})
			}
		}
		window.addEventListener('storage', _listener)
		return () => {
			window.removeEventListener('storage', _listener)
		}
	}
}

LocalStorage.isAvailable = isAvailable

function parseValue(value) {
	if (value === null) {
		return null
	}
	try {
		return JSON.parse(value)
	} catch (error) {
		// Return `undefined`
	}
}