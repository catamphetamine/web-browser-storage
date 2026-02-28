import { describe, it } from 'mocha'
import { expect } from 'chai'

import matchesPattern from './matchesPattern.js'

describe('matchesPattern', function() {
	it('should match pattern', function() {
		expect(matchesPattern('ab', 'ab')).to.equal(true)
		expect(matchesPattern('abc', 'abc')).to.equal(true)
		expect(matchesPattern('abc', 'abcd')).to.equal(false)
		expect(matchesPattern('abcd', 'abc')).to.equal(false)

		expect(matchesPattern('ab', 'ab*')).to.equal(true)
		expect(matchesPattern('abc', 'ab*')).to.equal(true)
		expect(matchesPattern('abcd', 'ab*')).to.equal(true)
		expect(matchesPattern('abcd', 'abc*')).to.equal(true)
		expect(matchesPattern('abcd', 'abcd*')).to.equal(true)
		expect(matchesPattern('abcd', 'abcde*')).to.equal(false)
	})

	it('should only allow an asterisk at the end', function() {
		expect(() => matchesPattern('abc', '*abc')).to.throw('asterisk')
		expect(() => matchesPattern('abc', 'a*bc')).to.throw('asterisk')
	})
})