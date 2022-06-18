import {
	LocalStorage,
	MemoryStorage
} from 'web-browser-storage'

import {
	CachedStorage
} from 'web-browser-storage/cache'

describe('exports', function() {
	it('should export stuff', function() {
		LocalStorage.should.be.a('function')
		MemoryStorage.should.be.a('function')
		CachedStorage.should.be.a('function')
	})
})