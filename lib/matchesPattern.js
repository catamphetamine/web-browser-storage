/**
 * Tests whether a string matches the pattern.
 * @param  {string} string
 * @param  {string} pattern — Pattern. Can contain an asterisk ("*"), but only at the end.
 * @return {boolean}
 */
export default function matchesPattern(string, pattern) {
	const asteriskIndex = pattern.indexOf('*')
	if (asteriskIndex >= 0) {
		if (asteriskIndex !== pattern.length - 1) {
			throw new Error(`A match pattern can only contain an asterisk ("*") at the end: ${pattern}`)
		}
		return string.indexOf(pattern.slice(0, asteriskIndex)) === 0
	}
	return string === pattern
}