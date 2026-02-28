export function hasObject(key) {
	return localStorage.getItem(key) !== null
}

export function getObject(key, defaultValue = null) {
	const value = localStorage.getItem(key)
	if (value === null) {
		return defaultValue
	}
	try {
		return JSON.parse(value)
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.error(`Invalid JSON:\n\n${value}`)
			return defaultValue
		} else {
			throw error
		}
	}
}

export function setObject(key, value) {
	if (value === undefined) {
		deleteObject(key)
	} else {
		localStorage.setItem(key, JSON.stringify(value))
	}
}

export function deleteObject(key) {
	localStorage.removeItem(key)
}

export function getKeys() {
	const keys = []
	let i = 0
	while (i < localStorage.length) {
		keys.push(localStorage.key(i))
		i++
	}
	return keys
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#feature-detecting_localstorage
export function isQuotaExceededError(error) {
	// `DOMException` is not available on server side.
	if (typeof DOMException === 'undefined') {
		return false
	}
	if (error instanceof DOMException) {
		if (
			// Everything except Firefox.
			error.code === 22 ||
			// Firefox.
			error.code === 1014 ||
			// Test the `name` field too, because code might not be present.
			// Everything except Firefox.
			error.name === 'QuotaExceededError' ||
			// Firefox.
			error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
		) {
			return true
			// if (localStorage.length === 0) {
			// 	return ... no local storage is available in this browsing mode ...
			// }
		}
	}
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
export function isAvailable() {
	// `localStorage` is not available on server side.
	if (typeof window === 'undefined') {
		return false
	}
  let storage
  try {
    storage = window.localStorage
    const key = '__storage_test__'
    storage.setItem(key, '"[web-browser-storage] Test `localStorage` availability"')
    storage.removeItem(key)
    return true
  }
  catch(error) {
  	// "For example, for a document viewed in a browser's private browsing mode,
  	//  some browsers might give us an empty localStorage object with a quota of zero,
  	//  effectively making it unusable".
  	if (isQuotaExceededError(error)) {
  		if (storage.length > 0) {
  			return true
  		}
  	}
  	return false
  }
}