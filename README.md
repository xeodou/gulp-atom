# gulp-electron for [gulp](https://github.com/wearefractal/gulp) [![NPM version](https://badge.fury.io/js/gulp-electron.png)](http://badge.fury.io/js/gulp-electron)

> A gulp plugin that creates electron based distributable applications.

## Install

Install with [npm](https://npmjs.org/package/gulp-electron).

```sh
npm install --save-dev gulp-electron
```

## Usage


Add a gulp electron task like :

```js
var gulp = require('gulp');
var electron = require('gulp-electron');
var packageJson = require('./src/package.json');

gulp.task('electron', function() {

    gulp.src("")
    .pipe(electron({
        src: './src',
        packageJson: packageJson,
        release: './release',
        cache: './cache',
        version: 'v0.24.0',
        rebuild: false,
        platforms: ['win32-ia32', 'darwin-x64']
    }))
    .pipe(gulp.dest(""));
});
```

Executing `gulp electron` will create an electron package for the specified platforms.

When you run code under `process.NODE_ENV = test` more debug information will be displayed.

### `options`

* `src` The root directory of the sources that shall be packaged, **required**.
* `packageJson` The package.json, **required**.
* `cache` The download path for the electron package, **required**.
* `release` is where the release applictions path, **required**.
* `version` the version of the electron release to be download from the GitHub page, **required**.
* `platforms` Support `['darwin','win32','linux','darwin-x64','linux-ia32','linux-x64','win32-ia32','win64-64']`, default is `darwin`. If verion is under `v0.13.0` must use `['darwin','win32','linux']`.
* `apm` Path to the `atom-package-manager` executable. If not specified the default behavior will be to use the globally installed `apm` executable.
* `rebuild` Default is `false`, when set to `true` the native `electron` modules will be rebuilt.
* `symbols` Default is `false`, when set to `true` the symbols package from GitHub will be downloaded.
* `ext` The package extention for the electron package, default is `zip`


## License

MIT
