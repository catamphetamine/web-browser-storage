import { Timer } from 'web-browser-timer'
import { TabStatusWatcher } from 'web-browser-tab/status-watcher'

import defaultMatchesPattern from './matchesPattern.js'

// The "cached" local storage uses an in-memory cache
// to avoid constantly parsing and stringifying JSON
// and also constantly writing it all to disk.
//
// The rationales are:
//
// * JSON parsing and stringifying could get expensive on large datasets.
//   https://github.com/GoogleChromeLabs/json-parse-benchmark
//   Even on smaller datasets, there's no need to perform it
//   needlessly in "rapid succession".
//   By using a cache, the data JSON doesn't need to be parsed
//   every time data is read. And, the data JSON doesn't need to be
//   strigified on every update because updates aren't written to disk
//   until flushed.
//
// * SSDs are known to have some theoretical write cycle limits.
//   Such write cycle limits though are almost impossible to reach
//   with the modern SSDs even though the OS and various programs
//   constantly write something to the disk at high rates.
//   Even though that seems to be true, if we can reliably cache stuff,
//   why abuse the disk drive? We can do smarter than that.
//
// Operating Systems usually employ their own file write cache:
//
// * Windows: NTFS filesystem runs a "lazy writer" every second.
//   https://docs.microsoft.com/en-us/windows/win32/fileio/file-caching
//
// * Linux: etx4 filesystem has a 5-second journal write interval.
//   https://superuser.com/questions/479379/how-long-can-file-system-writes-be-cached-with-ext4
//
// Still, `fsync()` is used by some software to bypass OS caching.
// For example, Chromium uses `fsync()` when writing stuff to disk.
// https://bugs.chromium.org/p/chromium/issues/detail?id=176727#c203
//
// Chromium itself seems to also employ a 5-sec-interval `localStorage` write-limiting strategy:
// https://bugs.chromium.org/p/chromium/issues/detail?id=52663#c161
// https://chromium.googlesource.com/chromium/src/+/770daec923bb61392afbf9ca16ee0dad147e154f
// It's not guaranteed though that other browsers do something like that.
//
// Chromium uses SQLite for storing `localStorage` data.
// Except writing to `localStorage`, Chromium also writes a lot of other stuff:
// visited links history, static files cache for every web page, and maybe some other things.
//
// Some related links:
// https://bugs.chromium.org/p/chromium/issues/detail?id=176727#c194
// https://bugs.chromium.org/p/chromium/issues/detail?id=176727#c211
//
// To monitor disk writes on Windows, one could use the "Resource Monitor" app.
// For example, when idle, chrome writes about 200 KB per second of data,
// that would be about 17 GB of data per day. That's a lot.
// Operating system also writes about 200 KB per second or so.

/**
 * `CachedStorage` is periodically saved ("flushed").
 * This presumably prevents too much SSD/HDD writes of `localStorage`.
 * The data is "flushed" not less than the configured period of time,
 * and also when the page becomes not "visible".
 * Visibility API: https://golb.hplar.ch/2019/07/page-visibility-api.html
 *
 * It's not specified, how a web browser manages saving to `localStorage`:
 * does it save it to disk every time when `.setItem()` is called?
 * Or does it somehow cache it and the "flush" to the disk later?
 * If yes, then how often does it "flush"?
 * A modern user-land SSD could sustain, for example, about 1000 write cycles:
 * https://www.enterprisestorageforum.com/storage-hardware/ssd-lifespan.html
 * Web browsers do write to disk quite often (for example, to history
 * on every navigation, or to cache), and the Operating System itself does
 * (for example, swap file, log files, etc).
 * Maybe such optimization isn't required at all and it's normal
 * to write to `localStorage` every second or so.
 *
 * Usage example: `captchan` calls `.set()` on each "read" comment,
 * which could be a lot of `.set()`s over a short period of time
 * when a user scrolls through a thread.
 *
 * In order for the "caching" mechanism to work, the `cache: true`
 * option should be passed when calling `.set(key, value)`.
 * Otherwise, the storage will act as a regular local storage.
 *
 * `cache: true` option can only be passed in cases when a tab has
 * an exclusive lock for writing to the `key`. Otherwise, if some
 * other tab writes a `value` to the same `key` while the current tab
 * has some cached `value` which hasn't been written yet, then, when
 * the cache is flushed, the more recent `value` that has been written
 * by the other tab gets overwritten by the current page's cached `value`.
 *
 * `captchan` uses `cache: true` option when writing `latestReadComments`
 * because only the current tab can do that by design.
 */

export default class CachedStorage {
	constructor({
		storage,
		tabStatusWatcher = new TabStatusWatcher(),
		timer = new Timer(),
		flushDelay,
		log = () => {},
		merge,
		matchesPattern = defaultMatchesPattern,
		...options
	}) {
		this.storage = storage

		this.tabStatusWatcher = tabStatusWatcher
		this.tabStatusWatcher.onInactive(this.flush)

		this.timer = timer
		this.log = log
		this.merge = merge
		this.matchesPattern = matchesPattern

		if (flushDelay === undefined) {
			throw new Error('[CachedStorage] `flushDelay` parameter is required')
		}

		this.options = {
			leadingWrite: false,
			flushDelay,
			...options
		}

		this.cache = {}
		this.previouslyFlushedAt = 0
	}

	start() {
		if (this._isStarted) {
			throw new Error('[web-browser-storage] Can\'t start a `CachedStorage` that has already been started')
		}

		this._isStarted = true

		this.log('start')

		this.tabStatusWatcher.start()

		// Listen for `this.storage` changes from other tabs.
		this.stopListeningToExternalChanges = this.onExternalChange(({ key, value }) => {
			// If the data that has been changed is cached,
			// then discard the cached data.
			// Normally this shouldn't happen:
			// normally the cache is flushed as soon as the user switches the tab,
			// so only one tab t a time should be caching writes.
			// Still, it could happen when multiple windows are open
			// because in that case both of them would be visible.
			if (Object.keys(this.cache).includes(key)) {
				if (value === null) {
					this.log('external delete', { key })
					delete this.cache[key]
				} else {
					// Actually, there won't be a recursion
					// because it checks if there's something in the cache
					// and there can only be something cached when a page is visible.
					//
					// // Don't merge external updates, otherwise it might lead to
					// // a recursive loop:
					// // * Tab A is in background
					// // * Tab B is in foreground
					// // * Tab B writes
					// // * Tab A sees the write, merges data and writes
					// // * Tab B sees the write, does the same
					// // * Tab A sees the write, does the same
					// // * ...
					// //
					this.log('merge external update', { key, value })
					if (this.merge) {
						// Merge the external changes with the cached changes.
						this.cache[key] = this.merge(key, this.cache[key], value)
						// Write the result of the merge.
						this.flush()
					} else {
						this.log(`The data in storage under key "${key}" got updated externally. No merging algorithm has been defined for that data key. Discard the cached data.`)
						delete this.cache[key]
					}
				}
			}
		})
	}

	stop() {
		if (!this._isStarted) {
			throw new Error('[web-browser-storage] Can\'t stop a `CachedStorage` that hasn\'t been started')
		}

		this._isStarted = false

		this.log('stop')

		// Flush any cached changes.
		this.flush()

		this.tabStatusWatcher.stop()
		this.stopListeningToExternalChanges()
	}

	keys() {
		return this.storage.keys()
	}

	onExternalChange(listener) {
		return this.storage.onExternalChange(listener)
	}

	getRecordSize(key) {
		if (this.cache.hasOwnProperty(key)) {
			return JSON.stringify(this.cache[key]).length
		}
		return this.storage.getRecordSize(key)
	}

	has(key) {
		return this.cache.hasOwnProperty(key) || this.storage.has(key)
	}

	get(key, defaultValue) {
		// Because a browser tab flushes its cache
		// when a user switches to another tab,
		// a background tab will always skip this `if` block
		// and will read directly from `this.storage`.
		if (this.cache.hasOwnProperty(key)) {
			this.log('read (cache)', { key })
			// this.log(`[storage] get value from cache for key "${key}"`, this.cache[key])
			return this.cache[key]
		}
		return this.storage.get(key, defaultValue)
	}

	set(key, value) { // , { cache } = {}) {
		if (value === undefined) {
			return this.storage.delete(key)
		}
		// if (cache !== false && this.shouldCache(key)) {
		if (this.shouldCache(key)) {
			this.log('write (cache)', { key })
			// this.log(`[storage] cache value for key "${key}"`, value)
			// if (this.cache.hasOwnProperty(key) && this.cache[key] === value) {
			// 	// The value didn't change.
			// } else {
				this.cache[key] = value
				this.scheduleFlush()
			// }
		} else {
			this.storage.set(key, value)
		}
	}

	delete(key) {
		if (this.cache.hasOwnProperty(key)) {
			delete this.cache[key]
		}
		this.storage.delete(key)
	}

	flush = () => {
		// this.log('flush')
		for (const key of Object.keys(this.cache)) {
			this.log('flush', { key })
			this.storage.set(key, this.cache[key])
		}
		this.cache = {}
		this.previouslyFlushedAt = this.timer.now()
		if (this.flushTimer) {
			this.timer.cancel(this.flushTimer)
			this.flushTimer = undefined
		}
	}

	/**
	 * Marks a key pattern as cached.
	 * @param  {string} pattern — A key matching pattern. An asterisk ("*") at the end matches "anything else".
	 */
	cacheKey(pattern) {
		this.options.cachedKeys = (this.options.cachedKeys || []).concat(pattern)
	}

	/**
	 * Checks if a `key` should be cached.
	 * @param  {string} key
	 * @return {boolean}
	 */
	shouldCache(key) {
		// Only cache writes when the page is in foreground.
		if (!this.tabStatusWatcher.isActive()) {
			return false
		}
		// Only cache the keys that have explicitly opted in.
		if (!this.shouldCacheKey(key)) {
			return false
		}
		return true
	}

	shouldCacheKey(key) {
		if (this.options.cachedKeys) {
			for (const pattern of this.options.cachedKeys) {
				if (this.matchesPattern(key, pattern)) {
					return true
				}
			}
		}
	}

	scheduleFlush() {
		if (!this.flushTimer) {
			this.flushTimer = this.timer.schedule(this.flush, this.options.flushDelay)
		}
	}
}