import { TestTabStatusWatcher } from 'web-browser-tab/status-watcher'
import { TestTimer } from 'web-browser-timer'

import CachedStorage from './CachedStorage.js';
import MemoryStorage from './MemoryStorage.js';

describe('CachedStorage', function() {
	it('should implement Storage interface', function() {
		const storage = new MemoryStorage()
		const tabStatusWatcher = new TestTabStatusWatcher()

		const cachedStorage = new CachedStorage({
			storage,
			tabStatusWatcher,
			flushDelay: 60 * 1000,
			timer: new TestTimer()
		})

		cachedStorage.start()

		tabStatusWatcher.setActive(true)

		cachedStorage.set('key', 'value')
		cachedStorage.has('key').should.equal(true)
		cachedStorage.get('key').should.equal('value')
		cachedStorage.getRecordSize('key').should.equal(20)
		cachedStorage.delete('key')
		cachedStorage.keys().should.deep.equal([])
		cachedStorage.onExternalChange(() => {})

		cachedStorage.stop()
	})

	it('should not cache keys when the tab is in background', function() {
		const storage = new MemoryStorage()
		const tabStatusWatcher = new TestTabStatusWatcher()

		storage.set('cached-key', 'One')
		storage.set('non-cached-key', 'One')

		const cachedStorage = new CachedStorage({
			storage,
			tabStatusWatcher,
			flushDelay: 60 * 1000,
			timer: new TestTimer()
		})

		cachedStorage.start()

		// tabStatusWatcher.setActive(false)

		cachedStorage.cacheKey('cached-*')
		cachedStorage.set('cached-key', 'Two')
		cachedStorage.set('non-cached-key', 'Two')

		expect(cachedStorage.get('cached-key')).to.equal('Two')
		expect(cachedStorage.get('non-cached-key')).to.equal('Two')

		expect(storage.get('cached-key')).to.equal('Two')
		expect(storage.get('non-cached-key')).to.equal('Two')

		cachedStorage.flush()

		expect(cachedStorage.get('cached-key')).to.equal('Two')
		expect(cachedStorage.get('non-cached-key')).to.equal('Two')

		expect(storage.get('cached-key')).to.equal('Two')
		expect(storage.get('non-cached-key')).to.equal('Two')

		cachedStorage.stop()
	})

	it('should cache keys when the tab is in foreground', function() {
		const storage = new MemoryStorage()
		const tabStatusWatcher = new TestTabStatusWatcher()

		storage.set('cached-key', 'One')
		storage.set('non-cached-key', 'One')

		const cachedStorage = new CachedStorage({
			storage,
			tabStatusWatcher,
			flushDelay: 60 * 1000,
			timer: new TestTimer()
		})

		cachedStorage.start()

		tabStatusWatcher.setActive(true)

		cachedStorage.cacheKey('cached-*')
		cachedStorage.set('cached-key', 'Two')
		cachedStorage.set('non-cached-key', 'Two')

		expect(cachedStorage.get('cached-key')).to.equal('Two')
		expect(cachedStorage.get('non-cached-key')).to.equal('Two')

		expect(storage.get('cached-key')).to.equal('One')
		expect(storage.get('non-cached-key')).to.equal('Two')

		cachedStorage.flush()

		expect(cachedStorage.get('cached-key')).to.equal('Two')
		expect(cachedStorage.get('non-cached-key')).to.equal('Two')

		expect(storage.get('cached-key')).to.equal('Two')
		expect(storage.get('non-cached-key')).to.equal('Two')

		cachedStorage.stop()
	})

	it('should detect external data writes', function() {
		const storage = new MemoryStorage()
		const tabStatusWatcher = new TestTabStatusWatcher()

		storage.set('cached-key', 'One')

		const cachedStorage = new CachedStorage({
			storage,
			tabStatusWatcher,
			flushDelay: 60 * 1000,
			timer: new TestTimer()
		})

		cachedStorage.start()

		tabStatusWatcher.setActive(true)

		cachedStorage.cacheKey('cached-*')
		expect(storage.get('cached-key')).to.equal('One')

		// External write.
		storage.set('cached-key', 'Two')

		// External write detected.
		expect(storage.get('cached-key')).to.equal('Two')

		cachedStorage.stop()
	})

	it('should detect external data writes (with a merging strategy)', function() {
		const baseStorage = new MemoryStorage()
		const tabStatusWatcher = new TestTabStatusWatcher()

		const storage = baseStorage.createSharedInstance('1')
		const storage2 = baseStorage.createSharedInstance('2')

		const cachedStorage = new CachedStorage({
			storage,
			tabStatusWatcher,
			flushDelay: 60 * 1000,
			timer: new TestTimer(),
			merge(key, prevValue, value) {
				if (key === 'cached-key') {
					return prevValue + value
				}
			}
		})

		cachedStorage.start()

		tabStatusWatcher.setActive(true)

		cachedStorage.cacheKey('cached-*')

		storage.set('cached-key', 'Zero')
		cachedStorage.set('cached-key', 'One')

		expect(storage.get('cached-key')).to.equal('Zero')
		expect(cachedStorage.get('cached-key')).to.equal('One')

		// External write.
		storage2.set('cached-key', 'Two')

		// External write detected and handled (merged).
		expect(storage.get('cached-key')).to.equal('OneTwo')
		expect(cachedStorage.get('cached-key')).to.equal('OneTwo')

		cachedStorage.stop()
	})
})