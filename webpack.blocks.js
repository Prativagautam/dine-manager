const path = require('path');
const wpConfig = require('@wordpress/scripts/config/webpack.config');
const { merge } = require('webpack-merge');

module.exports = merge(wpConfig, {
	entry: {
		'blocks/account-menu/index': path.resolve(__dirname, 'src/blocks/account-menu/index.tsx'),
	},
	output: {
		path: path.resolve(__dirname, 'build'),
		clean: false,
	},
});
