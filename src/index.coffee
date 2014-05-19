
fs = require 'fs'
grw = require 'grw'
path = require 'path'
async = require 'async'
wrench = require 'wrench'
util = require 'gulp-util'
through2 = require 'through2'
childProcess = require 'child_process'


PLUGIN_NAME = 'gulp-atom-shell'

module.exports = atom = (options)->
    # Options should be like
    #    cachePath
    #    srcPath
    #    releasePath
    #    platforms: ['darwin', 'win32', 'linux']
    #    apm
    #    rebuild
    #    symbols
    #    version
    #    repo
    #    prefix
    options = (options or {})

    if not options.releasePath or not options.version or
     not options.srcPath or not options.cachePath
        throw new util.PluginError 'Miss version or release path.'

    options.platforms ?= ['darwin']
    options.apm ?= getApmPath()
    options.symbols ?= false
    options.rebuild ?= false

    platforms = ['darwin', 'win32', 'linux']
    async.each options.platforms,
        (platform, callback) ->
            platform = 'darwin' if platform is 'osx'
            platform = 'win32' if platform is 'win'

            if platforms.indexOf(platform) < 0
                util.log PLUGIN_NAME, "Not support platform #{platform}"
                return callback()

            cachePath = path.resolve options.cachePath, options.version
            cacheFile = path.resolve cachePath, "atom-shell-#{platform}.zip"
            releasePath = path.resolve options.releasePath, options.version, platform

            async.series [
                # If not downloaded then download the special package.
                (next)->
                    if not isFile(cacheFile)
                        util.log PLUGIN_NAME,
                        "#{platform} #{options.version} atom-shell package is downloading..."
                        wrench.mkdirSyncRecursive cachePath

                        options.repo = 'atom/atom-shell'
                        options.prefix = "atom-shell-#{options.version}-#{platform}"
                        options.prefix += '-symbols' if options.symbols
                        options.ext = 'zip'

                        # Download atom package throw stream.
                        grw(options).pipe(fs.createWriteStream(cacheFile))
                        .on 'close', ->
                            util.log PLUGIN_NAME,
                            "#{platform} #{options.version} atom-shell package is downloaded."
                            next()
                        .on 'error', next
                    else next()


                # If not unziped then unzip the zip file.
                # Check if there already have an version file.
                (next) ->
                    if not isFile path.resolve releasePath, 'version'
                        wrench.mkdirSyncRecursive releasePath
                        util.log PLUGIN_NAME, "unzip #{platform} #{options.version} atom-shell."
                        spawn {cmd: 'unzip', args: ['-o', cacheFile, '-d', releasePath]}, next
                    else next()

                # If rebuild
                # then rebuild the native module.
                (next) ->
                    if options.rebuild
                        util.log PLUGIN_NAME, "Rebuilding modules"
                        spawn { cmd: options.apm, args: ['rebuild'] }, next
                    else next()

                # Distribute.
                (next) ->
                    util.log PLUGIN_NAME, 'Distribute applications.'
                    _src = 'resources/app'
                    _src = 'Atom.app/Contents/Resources/app/' if platform is 'darwin'
                    wrench.mkdirSyncRecursive path.join releasePath , _src
                    wrench.copyDirSyncRecursive options.srcPath, path.join(releasePath , _src),
                    forceDelete: true
                    excludeHiddenUnix: false
                    inflateSymlinks: false

            ], (error, results) ->
                callback error

        (error) ->
            return util.log PLUGIN_NAME, error.message if error


isFile = ->
    filepath = path.join.apply path, arguments
    fs.existsSync(filepath) and fs.statSync(filepath).isFile()

getApmPath = ->
    apmPath = path.join 'apm', 'node_modules', 'atom-package-manager', 'bin', 'apm'
    apmPath = 'apm' unless isFile apmPath

spawn = (options, callback) ->
    stdout = []
    stderr = []
    error = null
    proc = childProcess.spawn options.cmd, options.args, options.opts
    proc.stdout.on 'data', (data) ->
        stdout.push data.toString()
        if process.NODE_ENV is 'test'
            util.log data.toString()
    proc.stderr.on 'data', (data) ->
        stderr.push data.toString()
    proc.on 'exit', (code, signal) ->
        error = new Error(signal) if code != 0
        results = stderr: stderr.join(''), stdout: stdout.join(''), code: code
        if code != 0
            throw new util.PluginError PLUGIN_NAME, results.stderr or
             'unknow error , maybe you can try delete the zip packages.'
        callback error, results
