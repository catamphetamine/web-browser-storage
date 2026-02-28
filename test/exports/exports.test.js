import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
	LocalStorage,
	MemoryStorage
} from 'web-browser-storage'

import {
	CachedStorage
} from 'web-browser-storage/cache'

describe('exports', function() {
	it('should export stuff', function() {
		expect(LocalStorage).to.be.a('function')
		expect(MemoryStorage).to.be.a('function')
		expect(CachedStorage).to.be.a('function')
	})
})