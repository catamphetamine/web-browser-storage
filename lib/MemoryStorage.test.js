import { describe, it } from 'mocha'
import { expect } from 'chai'

import MemoryStorage from './MemoryStorage.js'

describe('MemoryStorage', function() {
	it('should work', function() {
		const storage = new MemoryStorage()

		expect(storage.get('key')).to.be.null
		expect(storage.has('key')).to.equal(false)
		expect(storage.getRecordSize('key')).to.equal(0)
		expect(storage.keys()).to.deep.equal([])

		storage.set('key', { a: 'b' })
		expect(storage.get('key')).to.deep.equal({ a: 'b' })
		expect(storage.has('key')).to.equal(true)
		expect(storage.getRecordSize('key')).to.equal(24)
		expect(storage.keys()).to.deep.equal(['key'])

		storage.delete('key')
		expect(storage.get('key')).to.be.null
		expect(storage.has('key')).to.equal(false)
		expect(storage.getRecordSize('key')).to.equal(0)
		expect(storage.keys()).to.deep.equal([])
	})

	it('should serialize data to string when saving', function() {
		const storage = new MemoryStorage()

		storage.set('date', new Date(Date.UTC(2000, 0, 1)))
		expect(storage.get('date')).to.equal('2000-01-01T00:00:00.000Z')
	})

	it('should turn off to-string "serialization" when the flag is set', function() {
		const storage = new MemoryStorage({
			stringifyStoredValues: false
		})

		storage.set('date', new Date(Date.UTC(2000, 0, 1)))
		expect(storage.get('date').getTime()).to.equal(946684800000)
	})

	it('should detect external changes', function() {
		const sourceStorage = new MemoryStorage()

		// "External" change listeners are ignored when storage ID isn't specified.
		let sourceStorageExternalChangeTriggered = false
		sourceStorage.onExternalChange(
			() => sourceStorageExternalChangeTriggered = true
		)

		const storage1 = sourceStorage.createSharedInstance('1')
		const storage2 = sourceStorage.createSharedInstance('2')

		let storage1ExternalChangeTriggered = false
		const unlistenExternalChanges1 = storage1.onExternalChange(
			() => storage1ExternalChangeTriggered = true
		)

		let storage2ExternalChangeTriggered = false
		const unlistenExternalChanges2 = storage2.onExternalChange(
			() => storage2ExternalChangeTriggered = true
		)

		expect(sourceStorageExternalChangeTriggered).to.equal(false)
		expect(storage1ExternalChangeTriggered).to.equal(false)
		expect(storage2ExternalChangeTriggered).to.equal(false)

		// Trigger "external" change listeners.
		storage1.set('key', 'value')

		expect(sourceStorageExternalChangeTriggered).to.equal(false)
		expect(storage1ExternalChangeTriggered).to.equal(false)
		expect(storage2ExternalChangeTriggered).to.equal(true)

		sourceStorageExternalChangeTriggered = false
		storage1ExternalChangeTriggered = false
		storage2ExternalChangeTriggered = false

		storage2.set('key2', 'value2')

		expect(sourceStorageExternalChangeTriggered).to.equal(false)
		expect(storage1ExternalChangeTriggered).to.equal(true)
		expect(storage2ExternalChangeTriggered).to.equal(false)

		sourceStorageExternalChangeTriggered = false
		storage1ExternalChangeTriggered = false
		storage2ExternalChangeTriggered = false

		unlistenExternalChanges1()
		unlistenExternalChanges2()

		storage1.set('key3', 'value3')

		expect(sourceStorageExternalChangeTriggered).to.equal(false)
		expect(storage1ExternalChangeTriggered).to.equal(false)
		expect(storage2ExternalChangeTriggered).to.equal(false)
	})
})