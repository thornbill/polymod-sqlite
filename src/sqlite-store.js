const Database = require('sqlite')
const debug = require('debug')('sb:sqlite-store')
const uuid = require('uuid/v4')

class SqliteStore {
	constructor(databaseFile=SqliteStore.IN_MEMORY_NAME) {
		this.databaseFile = databaseFile
	}

	async create(source, data) {
		await this._waitForConnection()

		const createData = [].concat(data).map(item => ({
			id: uuid(),
			...item
		}))

		// ensure the `source` table exists
		debug('create table')
		await this.db.run(`CREATE TABLE IF NOT EXISTS [${source}] (store TEXT)`)

		const inserts = createData.map(item => {
			return this.db.run(`INSERT INTO [${source}] (store) VALUES ($data)`, { $data: JSON.stringify(item) })
		})
		await Promise.all(inserts)

		return createData
	}

	async read(source, selector={}) {
		const baseQuery = `SELECT DISTINCT json(store) AS store FROM [${source}], json_tree([${source}].store)`

		const clause = Object.keys(selector)
			.map(() => 'json_tree.key=? AND json_tree.value=?')
			.join(' AND ')

		const query = clause ? `${baseQuery} WHERE ${clause}` : baseQuery

		// flatten the selector key, value pairs to a one-dimensional array
		const selectors = Object.entries(selector)
			.reduce((a, b) => a.concat(b), [])

		const response = await this.db.all(query, selectors)
		return response.map(item => JSON.parse(item.store))
	}

	async update(source, selector, data) {
		await this._waitForConnection()

		const currentData = await this.read(source, selector)

		const updateData = currentData.map(doc => {
			return Object.keys(data).reduce((acc, key) => {
				if (key === '$push') {
					return Object.keys(data.$push).reduce((pAcc, pKey) => ({
						...pAcc,
						[pKey]: Array.isArray(pAcc[pKey]) ? pAcc[pKey].concat(data.$push[pKey]) : [data.$push[pKey]]
					}), { ...acc })
				} else {
					return {
						...acc,
						[key]: data[key]
					}
				}
			}, doc)
		})

		const updates = currentData.map((item, i) => {
			return this.db.run(`UPDATE [${source}] SET store=$updateData WHERE store=$data`, {
				$data: JSON.stringify(item),
				$updateData: JSON.stringify(updateData[i])
			})
		})
		await Promise.all(updates)

		return updateData
	}

	async del(source, selector={}) {
		await this._waitForConnection()

		const toDelete = await this.read(source, selector)

		const deletes = toDelete.map(item => this.db.run(`DELETE FROM [${source}] WHERE store=$data`, { $data: JSON.stringify(item) }))
		await Promise.all(deletes)

		return toDelete
	}

	// convenience method for determining if the database is empty
	async _isEmpty() {
		await this._waitForConnection()

		const tables = await this.db.get('SELECT count(*) AS count FROM sqlite_master WHERE type=\'table\'')
		return tables.count === 0
	}

	async _waitForConnection() {
		return this.db ? this.db : Database.open(this.databaseFile, { Promise })
			.then((db) => {
				this.db = db
				return this.db
			})
	}
}

SqliteStore.IN_MEMORY_NAME = ':memory:'

module.exports = SqliteStore
