# Gulp atom release plugin

> A gulp plugin for atom-shell distribute applications.


## Usage


Add a gulp atom task like :

```
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

Add run with `gulp atom` will release the application in `outputDir` .
When you run code under `process.NODE_ENV = test` will out put more debug informations.

### `options`

* `cachePath` is where the package download path, **required**.
* `srcPath` is where the src code need to package, **required**.
* `releasePath` is where the release applictions path, **required**.
* `platforms` support `['darwin or osx ', 'win32 or win', 'linux']`, default is `drawin`.
* apm is where the `atom-package-manager` command path, default using the global `apm`.
* rebuild default is `false`, when set `true` will rebuild the native `atom` modules.
* symbols defualt is `false`, when set `true` will download the symbols package from github.
* version the special package need download from github, **required**.



## License

MIT
