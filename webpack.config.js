const path = require('path')
const MinifyPlugin = require('babel-minify-webpack-plugin')

module.exports = {
	entry: ['./src/index.js'],
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'dist'),
		library: 'polymod-sqlite',
		libraryTarget: 'commonjs2'
	},
	plugins: [
		new MinifyPlugin()
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [/node_modules/],
				use: [{
					loader: 'babel-loader'
				}]
			}
		]
	},
	target: 'node',
	externals: [
		'babel-runtime',
		'debug',
		'sqlite',
		'uuid'
	]
}
