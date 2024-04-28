# `web-browser-storage`

A wrapper around `localStorage` for better API interface and features like:

* Working with JSON values rather than strings.
* Caching.

## Install

```
npm install web-browser-storage --save
```

## Use

### Storage

A `Storage` interface provides the following methods:

* `get(key) => value`
* `set(key, value)`
* `has(key) => boolean`
* `delete(key)`
* `keys() => string[]`
* `onExternalChange(handlerFunction: ({ key, value, prevValue }) => {}) => stopListeningFunction`
  * `value` and `prevValue` are one of:
    * `null` — When absent.
    * `any` — When present. If stringified, then it is parsed from string.
    * `undefined` — When present and stringified and can't be parsed from string.

### Browser

```js
import { LocalStorage } from 'web-browser-storage'

const storage = new LocalStorage()

storage.set('key', { a: 'b' })
storage.get('key') === { a: 'b' }
storage.has('key') === true
storage.delete('key')
storage.getRecordSize('key') === 24 // in bytes
storage.keys() === ['key']

const unlistenExternalChanges = storage.onExternalChange(({ key, value, prevValue }) => {
  console.log(key, value)
})
```

Checking `localStorage` [availability](http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors):

```js
import { LocalStorage } from 'web-browser-storage'

if (!LocalStorage.isAvailable()) {
  alert('You seem to have disabled `localStorage`')
}
```

Available `LocalStorage` constructor options:

* `onFull({ error })` — Gets called on [`QuotaExceeded`](http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors) errors.

### Stub

`MemoryStorage` could be used in place of `LocalStorage` in tests.

```js
import { MemoryStorage } from 'web-browser-storage'

const storage = new MemoryStorage()

storage.set('key', { a: 'b' })
storage.get('key') === { a: 'b' }

storage.getData() === { key: { a: 'b' } }
storage.setData({ key2: 'value2' })
storage.getData() === { key2: 'value2' }
```

Creating several `MemoryStorage` instances that share the same data:

```js
import { MemoryStorage } from 'web-browser-storage'

const sourceStorage = new MemoryStorage()

const storage1 = storageSource.createSharedInstance('1')
const storage2 = storageSource.createSharedInstance('2')

const unlistenExternalChanges1 = storage1.onExternalChange(
  () => console.log('External change detected in storage 1')
)

const unlistenExternalChanges2 = storage2.onExternalChange(
  () => console.log('External change detected in storage 2')
)

// Will print "External change detected in storage 2".
storage1.set('key', 'value')
```

Available `MemoryStorage` constructor options:

* `stringifyStoredValues: boolean` — By default, `MemoryStorage` performs forced data serialization/deserialization on write/read. That is to emulate `localStorage`'s behavior which "serializes" everything to string on write. For example, by default, when writing `Date` objects, `MemoryStorage` (as well as `localStorage`) writes `Date` objects to ISO strings, and when reading those back they'll become strings rather than `Date` objects. To disable such forced stringification for whatever reason, pass `stringifyStoredValues: false` option, and such `Date` objects will stay `Date` objects when re-reading them from storage.

### Cache

`CachedStorage` is a wrapper around a storage that makes it "cache" the changes in memory and only "flush" them to disk after a delay or [when the browser tab loses focus](https://golb.hplar.ch/2019/07/page-visibility-api.html).

`CachedStorage` implements the standard `Storage` interface.

`CachedStorage` could be used in cases when there're a lot of frequent writes to `localStorage`.

```js
import { CachedStorage } from 'web-browser-storage/cache'
import { LocalStorage } from 'web-browser-storage'

const localStorage = new LocalStorage()

const storage = new CachedStorage({
  storage: localStorage,
  flushDelay: 30 * 1000 // in milliseconds
})

storage.start()

// All keys matching pattern "key*" will be cached.
// But only when the tab is in foreground.
// When a tab is in background, cache is disabled.
storage.cacheKey('key*')

storage.set('key', { a: 'b' })
storage.get('key') === { a: 'b' }

localStorage.get('key') === null

storage.stop()

localStorage.get('key') === { a: 'b' }

// One could also call `.flush()` manually, if required:
// storage.flush()
```

Available constructor parameters:

* `storage` — An underlying storage. Tests could use a `MemoryStorage` instance.

* `tabStatusWatcher: TabStatusWatcher` — An instance of [`TabStatusWatcher`](https://npmjs.com/package/web-browser-tab). Tests could use a `TestTabStatusWatcher` instance.

* `timer: Timer` — An instance of [`Timer`](https://npmjs.com/package/web-browser-timer). Tests could use a `TestTimer` instance.

* `flushDelay: number` — Flush delay, in milliseconds. This is the time `CachedStorage` waits until flushing the changes to disk. It will also flush if the tab becomes "inactive" (loses focus or goes into background, etc).

* `log: (...args) => {}` — A logging function. For example, one could pass `console.log` as the `log` parameter.

* `merge: (key, cachedValue, newValue) => mergedValue` — If storage data has been changed "externally" for a currently cached key, the `merge()` function will be used to resolve the conflict by merging the currently cached value and the externally updated value. If `merge()` function is not specified, the cached value gets discarded and overwritten by the externally updated one.

## Test

```
npm test
```

## GitHub Ban

On March 9th, 2020, GitHub, Inc. silently [banned](https://medium.com/@catamphetamine/how-github-blocked-me-and-all-my-libraries-c32c61f061d3) my account (erasing all my repos, issues and comments) without any notice or explanation. Because of that, all source codes had to be promptly moved to GitLab. The [GitHub repo](https://github.com/catamphetamine/web-browser-storage) is now only used as a backup (you can star the repo there too), and the primary repo is now the [GitLab one](https://gitlab.com/catamphetamine/web-browser-storage). Issues can be reported in any repo.

## License

[MIT](LICENSE)