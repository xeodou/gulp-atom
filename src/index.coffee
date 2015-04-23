
fs = require 'fs'
grs = require 'grs'
path = require 'path'
async = require 'async'
wrench = require 'wrench'
mv = require 'mv'
rm = require 'rimraf'
util = require 'gulp-util'
PluginError = util.PluginError
through = require 'through2'
childProcess = require 'child_process'
ProgressBar = require 'progress'
File = require 'vinyl'


PLUGIN_NAME = 'gulp-electron'

module.exports = electron = (options) ->
  # Options should be like
  #  cache
  #  src
  #  release
  #  platforms: ['darwin', 'win32', 'linux']
  #  apm
  #  rebuild
  #  symbols
  #  version
  #  repo
  options = (options or {})

  if not options.release or not options.version or
   not options.src or not options.cache
    throw new PluginError 'Miss version or release path.'

  packageJson = options.packageJson
  if typeof options.packageJson is 'string'
    packageJson = require(packageJson)
  options.platforms ?= ['darwin']
  options.apm ?= getApmPath()
  options.symbols ?= false
  options.rebuild ?= false
  options.ext ?= 'zip'

  options.platforms = [options.platforms] if typeof options.platforms is 'string'

  bufferContents = (file, enc, callback) ->
    callback()

  endStream = (callback) ->
    push = @push
    platforms = ['darwin',
    'win32',
    'linux',
    'darwin-x64',
    'linux-ia32',
    'linux-x64',
    'win32-ia32',
    'win32-x64']

    async.eachSeries options.platforms,
      (platform, cb) ->
        platform = 'darwin' if platform is 'osx'
        platform = 'win32' if platform is 'win'

        if platforms.indexOf(platform) < 0
          throw new PluginError "Not support platform #{platform}"

        options.ext ?= "zip"
        cacheZip = cache = "electron-#{options.version}-#{platform}"
        cacheZip += '-symbols' if options.symbols
        cacheZip += ".#{options.ext}"
        pkgZip = pkg = "#{packageJson.name}-#{packageJson.version}-#{platform}"
        pkgZip += '-symbols' if options.symbols
        pkgZip += ".#{options.ext}"

        cachePath = path.resolve options.cache, options.version
        cacheFile = path.resolve cachePath, cacheZip
        cacheedPath = path.resolve cachePath, cache
        pkgZipPwd = path.resolve options.release, options.version
        releasePath = path.resolve options.release, options.version, platform
        releaseZipPath = path.resolve options.release, options.version, packageJson.name

        src = ""
        targetApp = ""
        targetDist = ""
        suffix = ""
        releaseDir =  releasePath
        if platform.indexOf('darwin') >= 0
          suffix = ".app"
          electronFile = path.join releasePath , "Electron" + suffix
        else if platform.indexOf('win') >= 0
          suffix = ".exe"
          electronFile = path.join releasePath , "electron" + suffix
          releaseDir = path.join releasePath, 'Electron.app'
        else
          electronFile = path.join releasePath , "electron"
        binName = packageJson.name + suffix
        targetApp = path.join releasePath , binName
        _src = 'resources/app'
        if platform.indexOf('darwin') >= 0
          _src = binName + '/Contents/Resources/app/'
        targetDist = path.join releasePath , _src

        async.series [
          # If not downloaded then download the special package.
          (next) ->
            if not isFile cacheFile
              util.log PLUGIN_NAME, "download #{platform} #{options.version} cache filie."
              wrench.mkdirSyncRecursive cachePath
              # Download electron package throw stream.
              bar = null
              grs
                repo: 'atom/electron'
                tag: options.version
                name: cacheZip
              .on 'error', (error) ->
                 throw new PluginError error
              .on 'size', (size) ->
                bar = new ProgressBar "#{pkg} [:bar] :percent :etas",
                  complete: '>'
                  incomplete: ' '
                  width: 20
                  total: size
              .pipe through (chunk, enc, cb) ->
                bar.tick chunk.length
                @push(chunk)
                cb()
              .pipe(fs.createWriteStream(cacheFile))
              .on 'close', ->
                next()
              .on 'error', next
            else next()
          # If not unziped then unzip the zip file.
          # Check if there already have an version file.
          (next) ->
            if not isDir cacheedPath
              wrench.mkdirSyncRecursive cacheedPath
              util.log PLUGIN_NAME, "unzip #{platform} #{options.version} electron."
              spawn {cmd: 'unzip', args: ['-o', cacheFile, '-d', cacheedPath]}, next
            else next()

          # If rebuild
          # then rebuild the native module.
          (next) ->
            if options.rebuild
              util.log PLUGIN_NAME, "Rebuilding modules"
              spawn {cmd: options.apm, args: ['rebuild']}, next
            else next()

          # Distribute.
          (next) ->
            wrench.mkdirSyncRecursive releasePath
            wrench.copyDirSyncRecursive cacheedPath, releasePath,
              forceDelete: true
              excludeHiddenUnix: false
              inflateSymlinks: false
            next()
          (next) ->
            if not isExists targetApp
              mv electronFile, targetApp, ->
                next()
            else next()

          # Distribute app.
          (next) ->
            if not isExists targetDist
              rm targetDist, next
            else next()
          (next) ->
            util.log PLUGIN_NAME, "#{pkg} distributing"
            wrench.mkdirSyncRecursive targetDist
            wrench.copyDirSyncRecursive options.src, targetDist,
              forceDelete: true
              excludeHiddenUnix: false
              inflateSymlinks: false
            next()

          # packaging app.
          (next) ->
            util.log PLUGIN_NAME, "#{pkgZip} packaging"
            mv releasePath, releaseZipPath, ->
                spawn {
                    cmd: 'zip'
                    args: ['-9', '-y', '-r', pkgZip , packageJson.name]
                    opts: {cwd: pkgZipPwd}
                }, ->
                    mv releaseZipPath, releasePath, next

        ], (error, results) ->
          zip = path.resolve pkgZipPwd, pkgZip
          util.log PLUGIN_NAME, "#{zip} distribute done."
          cb()

      (error, results) ->
        util.log PLUGIN_NAME, "all distribute done."
        callback()

  return through.obj(bufferContents, endStream)

isDir = ->
  filepath = path.join.apply path, arguments
  fs.existsSync(filepath) and not fs.statSync(filepath).isFile()

isFile = ->
  filepath = path.join.apply path, arguments
  fs.existsSync(filepath) and fs.statSync(filepath).isFile()

isExists = ->
  filepath = path.join.apply path, arguments
  fs.existsSync(filepath)

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
    error = new Error(signal) if code isnt 0
    results = stderr: stderr.join(''), stdout: stdout.join(''), code: code
    if code isnt 0
      throw new PluginError PLUGIN_NAME, results.stderr or
       'unknow error , maybe you can try delete the zip packages.'
    callback error, results
