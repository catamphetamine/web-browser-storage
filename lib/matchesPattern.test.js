import matchesPattern from './matchesPattern.js'

describe('matchesPattern', function() {
	it('should match pattern', function() {
		matchesPattern('ab', 'ab').should.equal(true)
		matchesPattern('abc', 'abc').should.equal(true)
		matchesPattern('abc', 'abcd').should.equal(false)
		matchesPattern('abcd', 'abc').should.equal(false)

		matchesPattern('ab', 'ab*').should.equal(true)
		matchesPattern('abc', 'ab*').should.equal(true)
		matchesPattern('abcd', 'ab*').should.equal(true)
		matchesPattern('abcd', 'abc*').should.equal(true)
		matchesPattern('abcd', 'abcd*').should.equal(true)
		matchesPattern('abcd', 'abcde*').should.equal(false)
	})

	it('should only allow an asterisk at the end', function() {
		expect(() => matchesPattern('abc', '*abc')).to.throw('asterisk')
		expect(() => matchesPattern('abc', 'a*bc')).to.throw('asterisk')
	})
})