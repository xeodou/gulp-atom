
fs = require 'fs'
grs = require 'grs'
path = require 'path'
async = require 'async'
wrench = require 'wrench'
mv = require 'mv'
rm = require 'rimraf'
util = require 'gulp-util'
chalk = require 'chalk'
Promise = require 'promise-simple'
Decompress = require 'decompress-zip'
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
  if path.resolve(options.src) is path.resolve(".")
    throw new PluginError 'src path can not root path.'

  packageJson = options.packageJson
  if typeof options.packageJson is 'string'
    packageJson = require(packageJson)
  options.platforms ?= ['darwin']
  options.apm ?= getApmPath()
  options.symbols ?= false
  options.rebuild ?= false
  options.ext ?= 'zip'

  options.platforms = [options.platforms] if typeof options.platforms is 'string'

  bufferContents = (file, enc, cb) ->
    src = file
    cb()

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
        # ex: electron-v0.24.0-darwin-x64.zip
        cacheZip = cache = "electron-#{options.version}-#{platform}"
        cacheZip += '-symbols' if options.symbols
        cacheZip += ".#{options.ext}"
        pkgZip = pkg = "#{packageJson.name}-#{packageJson.version}-#{platform}"
        pkgZip += '-symbols' if options.symbols
        pkgZip += ".#{options.ext}"

        # ex: ./cache/v0.24.0/electron-v0.24.0-darwin-x64.zip
        cachePath = path.resolve options.cache, options.version
        cacheFile = path.resolve cachePath, cacheZip
        cacheedPath = path.resolve cachePath, cache
        # ex: ./release/v0.24.0/
        pkgZipDir = path.join options.release, options.version
        pkgZipPath = path.resolve pkgZipDir
        pkgZipFilePath = path.resolve pkgZipDir, pkgZip
        # ex: ./release/v0.24.0/darwin-x64/
        platformDir = path.join pkgZipDir, platform
        platformPath = path.resolve platformDir

        targetApp = ""
        defaultAppName = "Electron"
        suffix = ""
        _src = path.join 'resources', 'app'
        if platform.indexOf('darwin') >= 0
          suffix = ".app"
          electronFile = "Electron" + suffix
          targetZip = packageJson.name + suffix
          _src = path.join packageJson.name + suffix, 'Contents', 'Resources', 'app'
        else if platform.indexOf('win') >= 0
          suffix = ".exe"
          electronFile = "electron" + suffix
          targetZip = "."
        else
          electronFile = "electron"
        # ex: ./release/v0.24.0/darwin-x64/Electron
        electronFileDir = path.join platformDir, electronFile
        electronFilePath = path.resolve electronFileDir
        binName = packageJson.name + suffix
        targetAppPath = path.join platformPath , binName
        _src = 'resources/app'
        if platform.indexOf('darwin') >= 0
          _src = binName + '/Contents/Resources/app/'
        # ex: ./release/v0.24.0/darwin-x64/Electron/Contents/resources/app
        targetDir = path.join packageJson.name, _src
        targetDirPath = path.resolve platformDir, _src

        copyOption =
          forceDelete: true
          excludeHiddenUnix: false
          inflateSymlinks: false
        identity = ""
        if options.platformResouces?.darwin?.identity? and isFile options.platformResouces.darwin.identity
          identity = fs.readFileSync(options.platformResouces.darwin.identity, 'utf8').trim()
          ###
        signingCmd =
          # http://sevenzip.sourceforge.jp/chm/cmdline/commands/extract.htm
          darwin: [
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'Electron\\ Framework.framework')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'Electron\\ Helper EH.app')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'Electron\\ Helper NP.app')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'Electron\\ Helper.app')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'ReactiveCocoa.framework')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir ,'Contents', 'Frameworks', 'Squirrel.framework')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, path.join(targetAppDir,'Contents', 'Frameworks', 'Mantle.framework')]
            ,
              cmd: 'codesign'
              args: ['--deep', '--force', '--verbose', '--sign', identity, targetAppDir]
          ]
          ###
        unpackagingCmd =
          # http://sevenzip.sourceforge.jp/chm/cmdline/commands/extract.htm
          #win32:
            #cmd: '7z'
            #args: ['x', cacheFile, '-o' + cacheedPath]
          #http://docs.oracle.com/javase/7/docs/technotes/tools/windows/jar.html
          win32:
            cmd: 'jar'
            args: ['-xMf', cacheFile, cacheedPath]
          darwin:
            cmd: 'unzip'
            args: ['-o', cacheFile, '-d', cacheedPath]
          ###
          darwin:
            cmd: 'ditto'
            args: [ '-x', targetZip, path.join('..', pkgZip)]
          ###
          linux:
            cmd: 'unzip'
            args: ['-o', cacheFile, '-d', cacheedPath]
        packagingCmd =
          # http://www.appveyor.com/docs/packaging-artifacts#packaging-multiple-files-in-different-locations-into-a-single-archive
          win32:
            cmd: '7z',
            args: ['a', path.join('..', pkgZip), targetZip],
            opts: {cwd: platformPath}
          # http://stackoverflow.com/questions/17546016/how-can-you-zip-or-unzip-from-the-command-prompt-using-only-windows-built-in-ca
          #win32:
          #cmd: 'jar'
          #args: ['-cMf', targetZip, path.join('..', pkgZip)]
          #opts: {cwd: platformPath}
          darwin:
            cmd: 'ditto'
            args: [ '-c', '-k', '--sequesterRsrc', '--keepParent' , targetZip, path.join('..', pkgZip)]
            opts: {cwd: platformPath}
          linux:
            cmd: 'zip'
            args: ['-9', '-y', '-r', path.join('..', pkgZip) , targetZip]
            opts: {cwd: platformPath}

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
            util.log PLUGIN_NAME, "unzip #{platformDir} cache filie."
            util.log PLUGIN_NAME, "download #{platform} #{options.version} cache filie."
            rm cacheedPath, ->
              wrench.mkdirSyncRecursive platformDir
              util.log PLUGIN_NAME, "unzip #{platform} #{options.version} electron."
              unzip = new Decompress cacheFile
              unzip.on 'extract', ->
                next()
              unzip.extract
                path: cacheedPath
                follow: true
              ###
              spawn unpackagingCmd[process.platform], next
              ###

          # Distribute.
          (next) ->
            wrench.mkdirSyncRecursive platformPath
            wrench.copyDirSyncRecursive cacheedPath, platformPath, copyOption
            next()
          (next) ->
            if not isExists targetAppPath
              mv electronFilePath, targetAppPath, ->
                next()
            else next()

          # Distribute app.
          (next) ->
            if not isExists targetDirPath
              rm targetDirPath, next
            else next()
          (next) ->
            util.log PLUGIN_NAME, "#{options.src} -> #{targetDir} distributing"
            wrench.mkdirSyncRecursive targetDirPath
            wrench.copyDirSyncRecursive options.src, targetDirPath, copyOption
            next()
          # signing
          (next) ->
            if not options.packaging
              return next()
            # FIXME: skip signing
            return next()
            if platform is "darwin-x64" and process.platform is "darwin"
              if identity is ""
                util.log PLUGIN_NAME, "not found identity file. skip signing"
                return next()
              util.log PLUGIN_NAME, "signing #{platform}"
              promiseList = []
              signingCmd.darwin.forEach (cmd) ->
                p = Promise.defer()
                promiseList.push p
                spawn cmd, ->
                  p.resolve()
              Promise.when promiseList
                .then ->
                  util.log PLUGIN_NAME, "signing done."
                  next()
            else next()

          # packaging app.
          (next) ->
            if not options.packaging
              return next()
            if isFile pkgZipFilePath
              rm pkgZipFilePath, next
            else next()
          (next) ->
            if not options.packaging
              return next()
            util.log PLUGIN_NAME, "packaging"
            cmd = packagingCmd[process.platform]
            spawn cmd, ->
              util.log PLUGIN_NAME, "packaging done"
              return next()

        ], (error, results) ->
          _zip = path.join pkgZipDir, pkgZip
          util.log PLUGIN_NAME, "#{_zip} distribute done."
          cb()

      (error, results) ->
        util.log PLUGIN_NAME, "all distribute done."
        callback()
    return

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

spawn = (options, cb) ->
  stdout = []
  stderr = []
  error = null
  options.args.forEach (arg) ->
    arg = arg.replace ' ', '\\ '
  util.log "> #{options.cmd} #{options.args.join ' '}"
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
    cb error, results
