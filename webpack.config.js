module.exports = {
    entry: './js/main.js',
    output: {
        path: './bin',
        filename: 'main.bundle.js',
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
        }]
    },
    devtool: 'source-map'
};
