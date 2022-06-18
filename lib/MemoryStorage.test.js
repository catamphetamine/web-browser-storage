import MemoryStorage from './MemoryStorage.js'

describe('MemoryStorage', function() {
	it('should work', function() {
		const storage = new MemoryStorage()

		expect(storage.get('key')).to.be.null
		storage.has('key').should.equal(false)
		storage.getRecordSize('key').should.equal(0)
		storage.keys().should.deep.equal([])

		storage.set('key', { a: 'b' })
		storage.get('key').should.deep.equal({ a: 'b' })
		storage.has('key').should.equal(true)
		storage.getRecordSize('key').should.equal(24)
		storage.keys().should.deep.equal(['key'])

		storage.delete('key')
		expect(storage.get('key')).to.be.null
		storage.has('key').should.equal(false)
		storage.getRecordSize('key').should.equal(0)
		storage.keys().should.deep.equal([])
	})

	it('should serialize data to string when saving', function() {
		const storage = new MemoryStorage()

		storage.set('date', new Date(Date.UTC(2000, 0, 1)))
		storage.get('date').should.equal('2000-01-01T00:00:00.000Z')
	})

	it('should turn off to-string "serialization" when the flag is set', function() {
		const storage = new MemoryStorage({
			stringifyStoredValues: false
		})

		storage.set('date', new Date(Date.UTC(2000, 0, 1)))
		storage.get('date').getTime().should.equal(946684800000)
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

		sourceStorageExternalChangeTriggered.should.equal(false)
		storage1ExternalChangeTriggered.should.equal(false)
		storage2ExternalChangeTriggered.should.equal(false)

		// Trigger "external" change listeners.
		storage1.set('key', 'value')

		sourceStorageExternalChangeTriggered.should.equal(false)
		storage1ExternalChangeTriggered.should.equal(false)
		storage2ExternalChangeTriggered.should.equal(true)

		sourceStorageExternalChangeTriggered = false
		storage1ExternalChangeTriggered = false
		storage2ExternalChangeTriggered = false

		storage2.set('key2', 'value2')

		sourceStorageExternalChangeTriggered.should.equal(false)
		storage1ExternalChangeTriggered.should.equal(true)
		storage2ExternalChangeTriggered.should.equal(false)

		sourceStorageExternalChangeTriggered = false
		storage1ExternalChangeTriggered = false
		storage2ExternalChangeTriggered = false

		unlistenExternalChanges1()
		unlistenExternalChanges2()

		storage1.set('key3', 'value3')

		sourceStorageExternalChangeTriggered.should.equal(false)
		storage1ExternalChangeTriggered.should.equal(false)
		storage2ExternalChangeTriggered.should.equal(false)
	})
})