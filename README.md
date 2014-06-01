# [gulp](https://github.com/wearefractal/gulp)-atom [![NPM version](https://badge.fury.io/js/gulp-atom.png)](http://badge.fury.io/js/gulp-atom)

> A gulp plugin that creates atom-shell based distributable applications.

## Install

Install with [npm](https://npmjs.org/package/gulp-atom).

```sh
npm install --save-dev gulp-atom
```

## Usage


Add a gulp atom task like :

```js
gulp.task('atom', function() {

    return gulpAtom({
        srcPath: './src',
        releasePath: './release',
        cachePath: './cache',
        version: 'v0.12.4',
        rebuild: true,
        platforms: ['win']
    });
});
```

Executing `gulp atom` will create an atom-shell package for the specified platforms.

When you run code under `process.NODE_ENV = test` more debug information will be displayed.

### `options`

* `cachePath` The download path for the atom-shell package, **required**.
* `srcPath` The root directory of the sources that shall be packaged, **required**.
* `releasePath` is where the release applictions path, **required**.
* `platforms` support `['darwin or osx ', 'win32 or win', 'linux']`, default is `darwin`.
* `apm` Path to the `atom-package-manager` executable. If not specified the default behavior will be to use the globally installed `apm` executable.
* `rebuild` Default is `false`, when set to `true` the native `atom` modules will be rebuilt.
* `symbols` Default is `false`, when set to `true` the symbols package from GitHub will be downloaded.
* `version` the version of the atom-shell release to be download from the GitHub page, **required**.



## License

MIT
