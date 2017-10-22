class SqliteSource {
	constructor(store, source) {
		if (!store) {
			throw new Error('"store" cannot be undefined')
		}

		this.store = store
		this.source = source
	}

	async fetch(operation, selector) {
		switch (operation) {
			case 'read':
				return (await this.store.read(this.source, selector))[0]
			case 'readMany':
				return this.store.read(this.source, selector)
			default:
				throw new Error(`Operation "${operation}" not supported`)
		}
	}

	async mutate(operations) {
		const results = []

		for (const operation of operations) {
			results.push(await this._doOperation(operation.name, operation.selector, operation.data))
		}

		return results
	}

	async _doOperation(operation, selector, data) {
		let res

		switch (operation) {
			case 'create':
				res = [await this.store.create(this.source, data)]
				break
			case 'remove':
				res = await this.store.del(this.source, selector)
				break
			default:
				res = await this.store[operation](this.source, selector, data)
				break
		}

		return res[0]
	}
}

module.exports = SqliteSource
