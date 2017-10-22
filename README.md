# Polymod-SQLite

A library to support SQLite data sources in [Polymod](https://github.com/dstreet/polymod).

## License

[MIT License](LICENSE)

## Documentation

This library implements the specifications for Sources in Polymod.
Additional information about using Sources in Polymod can be found in the [Polymod documentation](https://github.com/dstreet/polymod#sources).

### SqliteSource

```js
const { SqliteSource, SqliteStore } = require('polymod-sqlite')

const store = new SqliteStore()
const source = new SqliteSource(store, 'posts')
```

### SqliteStore

By default the `SqliteStore` constructor will create an anonymous in-memory SQLite database.
Additionally, an anonymous disk-based database can be created by passing an empty string to the constructor.
A filename can be specified to create a database that is persisted to a file.

```js
const { SqliteStore } = require('polymod-sqlite')

const inMemoryStore = new SqliteStore()
const anonymousStore = new SqliteStore('')
const fileStore = new SqliteStore('foo.sqlite')
```

The [node-sqlite](https://github.com/kriasoft/node-sqlite) instance used by the SqliteStore is exposed as the `db` property on instances of the store.
This allows SQL statements to be executed directly on the database if needed.

```js
const data = await store.db.all('SELECT * FROM [posts]')
```
