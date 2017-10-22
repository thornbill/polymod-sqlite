/* eslint-env jest */
const fs = require('fs')
const SqliteStore = require('./sqlite-store')

const testCreateDatabase = async function(store) {
	expect(await store._isEmpty()).toBe(true)

	const data = await store.create('tests', {
		foo: 'bar'
	})

	expect(await store._isEmpty()).toBe(false)
	expect(data).toHaveLength(1)
	expect(data[0]).toHaveProperty('foo', 'bar')

	await store.db.close()
}

test('should be able to create an anonymous disk-based database', async () => {
	try {
		await testCreateDatabase(new SqliteStore(''))
	} catch(err) {
		throw err
	}
})

test('should be able to create a named disk-based database', async () => {
	try {
		const dbName = 'foo.sqlite'
		await testCreateDatabase(new SqliteStore(dbName))
		fs.accessSync(dbName)
		fs.unlinkSync(dbName)
	} catch(err) {
		throw err
	}
})

test('`create()` should add the document to the data collection', async () => {
	try {
		await testCreateDatabase(new SqliteStore())
	} catch(err) {
		throw err
	}
})

test('`create()` should add an id to the document if not provided', async () => {
	try {
		const store = new SqliteStore()

		expect(await store._isEmpty()).toBe(true)

		const data = await store.create('tests', {
			foo: 'bar'
		})

		expect(data[0]).toHaveProperty('id')
		expect(await store._isEmpty()).toBe(false)

		await store.db.run('DROP TABLE tests')
		const dataWithId = await store.create('tests', {
			id: 1,
			foo: 'bar'
		})

		expect(dataWithId[0]).toHaveProperty('id', 1)
		expect(await store._isEmpty()).toBe(false)

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('`create()` should not allow sql injection', async () => {
	try {
		const store = new SqliteStore()

		expect(await store._isEmpty()).toBe(true)

		await store.create('tests', {
			foo: 'bar'
		})

		await store.create('; DROP TABLE tests;', {
			id: 1,
			foo: 'baz'
		})

		expect(await store._isEmpty()).toBe(false)

		const data = await store.db.all('SELECT * FROM [; DROP TABLE tests;]')
		expect(data).toHaveLength(1)
		expect(data[0]).toHaveProperty('store', JSON.stringify({id: 1, foo: 'baz'}))

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('`read()` should return an array of matching documents', async () => {
	try {
		const store = new SqliteStore()

		await store.create('posts', [
			{
				id: 1,
				title: 'post 1',
				author: 'jdoe'
			},
			{
				id: 2,
				title: 'post 2',
				author: 'jdoe'
			},
			{
				id: 3,
				title: 'post 3',
				author: 'jsmith'
			}
		])

		const allDocs = await store.read('posts')

		expect(allDocs).toHaveLength(3)
		expect(allDocs).toContainEqual({
			id: 1,
			title: 'post 1',
			author: 'jdoe'
		})
		expect(allDocs).toContainEqual({
			id: 2,
			title: 'post 2',
			author: 'jdoe'
		})
		expect(allDocs).toContainEqual({
			id: 3,
			title: 'post 3',
			author: 'jsmith'
		})

		const docs = await store.read('posts', { author: 'jdoe' })

		expect(docs).toHaveLength(2)
		expect(docs).toContainEqual({
			id: 1,
			title: 'post 1',
			author: 'jdoe'
		})
		expect(docs).toContainEqual({
			id: 2,
			title: 'post 2',
			author: 'jdoe'
		})

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('`update()` should update the matching documents with the provided data', async () => {
	try {
		const store = new SqliteStore()
		
		await store.create('posts', [
			{
				id: 1,
				title: 'post 1',
				author: 'jdoe'
			},
			{
				id: 2,
				title: 'post 2',
				author: 'jdoe'
			},
			{
				id: 3,
				title: 'post 3',
				author: 'jsmith'
			}
		])

		const updatedDocs = await store.update('posts', { author: 'jsmith' }, { title: 'updated post' })
		
		expect(updatedDocs).toHaveLength(1)
		expect(updatedDocs).toContainEqual({
			id: 3,
			title: 'updated post',
			author: 'jsmith'
		})

		const doc = await store.read('posts', {id: 3})
		expect(doc).toContainEqual({
			id: 3,
			title: 'updated post',
			author: 'jsmith'
		})

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('`del()` should delete the matching documents', async () => {
	try {
		const store = new SqliteStore()
		
		await store.create('posts', [
			{
				id: 1,
				title: 'post 1',
				author: 'jdoe'
			},
			{
				id: 2,
				title: 'post 2',
				author: 'jdoe'
			},
			{
				id: 3,
				title: 'post 3',
				author: 'jsmith'
			}
		])

		const deletedDocs = await store.del('posts', { author: 'jdoe' })

		expect(deletedDocs).toHaveLength(2)
		expect(deletedDocs).toContainEqual({
			id: 1,
			title: 'post 1',
			author: 'jdoe'
		})
		expect(deletedDocs).toContainEqual({
			id: 2,
			title: 'post 2',
			author: 'jdoe'
		})

		const docs = await store.read('posts')
		expect(docs).toHaveLength(1)
		expect(docs).toContainEqual({
			id: 3,
			title: 'post 3',
			author: 'jsmith'
		})

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('update() $push should append values to property arrays', async () => {
	try {
		const store = new SqliteStore()

		await store.create('posts', [
			{
				id: 1,
				title: 'post 1',
				author: 'jdoe',
				tags: [1, 2]
			}
		])

		const updatedDocs = await store.update('posts', { id: 1 }, { $push: { tags: 3 }})
		expect(updatedDocs).toContainEqual({
			id: 1,
			title: 'post 1',
			author: 'jdoe',
			tags: [1, 2, 3]
		})

		await store.db.close()
	} catch(err) {
		throw err
	}
})

test('update() $push should create a new array if field is undefined', async () => {
	try {
		const store = new SqliteStore()

		await store.create('posts', [
			{
				id: 1,
				title: 'post 1',
				author: 'jdoe'
			}
		])

		const updatedDocs = await store.update('posts', { id: 1 }, { $push: { tags: 3 }})
		expect(updatedDocs).toContainEqual({
			id: 1,
			title: 'post 1',
			author: 'jdoe',
			tags: [3]
		})

		await store.db.close()
	} catch(err) {
		throw err
	}
})
