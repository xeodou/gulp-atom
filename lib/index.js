var Decompress, File, PLUGIN_NAME, PluginError, ProgressBar, Promise, async, chalk, childProcess, electron, fs, getApmPath, grs, isDir, isExists, isFile, mv, path, rm, spawn, through, util, wrench;

fs = require('fs');

grs = require('grs');

path = require('path');

async = require('async');

wrench = require('wrench');

mv = require('mv');

rm = require('rimraf');

util = require('gulp-util');

chalk = require('chalk');

Promise = require('promise-simple');

Decompress = require('decompress-zip');

PluginError = util.PluginError;

through = require('through2');

childProcess = require('child_process');

ProgressBar = require('progress');

File = require('vinyl');

PLUGIN_NAME = 'gulp-electron';

module.exports = electron = function(options) {
  var bufferContents, endStream, packageJson;
  options = options || {};
  if (!options.release || !options.version || !options.src || !options.cache) {
    throw new PluginError('Miss version or release path.');
  }
  if (path.resolve(options.src) === path.resolve(".")) {
    throw new PluginError('src path can not root path.');
  }
  packageJson = options.packageJson;
  if (typeof options.packageJson === 'string') {
    packageJson = require(packageJson);
  }
  if (options.platforms == null) {
    options.platforms = ['darwin'];
  }
  if (options.apm == null) {
    options.apm = getApmPath();
  }
  if (options.symbols == null) {
    options.symbols = false;
  }
  if (options.rebuild == null) {
    options.rebuild = false;
  }
  if (options.ext == null) {
    options.ext = 'zip';
  }
  if (typeof options.platforms === 'string') {
    options.platforms = [options.platforms];
  }
  bufferContents = function(file, enc, cb) {
    var src;
    src = file;
    return cb();
  };
  endStream = function(callback) {
    var platforms, push;
    push = this.push;
    platforms = ['darwin', 'win32', 'linux', 'darwin-x64', 'linux-ia32', 'linux-x64', 'win32-ia32', 'win32-x64'];
    return async.eachSeries(options.platforms, function(platform, cb) {
      var _src, binName, cache, cacheFile, cachePath, cacheZip, cacheedPath, defaultAppName, electronFile, electronFileDir, electronFilePath, pkg, pkgZip, pkgZipDir, pkgZipPath, platformDir, platformPath, platformZipDir, platformZipPath, src, suffix, targetApp, targetAppPath, targetDir, targetDirPath, targetPath;
      if (platform === 'osx') {
        platform = 'darwin';
      }
      if (platform === 'win') {
        platform = 'win32';
      }
      if (platforms.indexOf(platform) < 0) {
        throw new PluginError("Not support platform " + platform);
      }
      if (options.ext == null) {
        options.ext = "zip";
      }
      cacheZip = cache = "electron-" + options.version + "-" + platform;
      if (options.symbols) {
        cacheZip += '-symbols';
      }
      cacheZip += "." + options.ext;
      pkgZip = pkg = packageJson.name + "-" + packageJson.version + "-" + platform;
      if (options.symbols) {
        pkgZip += '-symbols';
      }
      pkgZip += "." + options.ext;
      cachePath = path.resolve(options.cache, options.version);
      cacheFile = path.resolve(cachePath, cacheZip);
      cacheedPath = path.resolve(cachePath, cache);
      pkgZipDir = path.join(options.release, options.version);
      pkgZipPath = path.resolve(pkgZipDir);
      pkgZipFilePath = path.resolve(pkgZipDir, pkgZip);
      platformDir = path.join(pkgZipDir, platform);
      platformPath = path.resolve(platformDir);
      targetApp = "";
      defaultAppName = "Electron";
      suffix = "";
      _src = path.join('resources', 'app');
      if (platform.indexOf('darwin') >= 0) {
        suffix = ".app";
        electronFile = "Electron" + suffix;
        targetZip = packageJson.name + suffix;
        _src = path.join(packageJson.name + suffix, 'Contents', 'Resources', 'app');
      } else if (platform.indexOf('win') >= 0) {
        suffix = ".exe";
        electronFile = "electron" + suffix;
        targetZip = ".";
      } else {
        electronFile = "electron";
        targetZip = ".";
      }
      binName = packageJson.name + suffix;
      electronFileDir = path.join(platformDir, electronFile);
      electronFilePath = path.resolve(electronFileDir);
      targetAppDir = path.join(platformDir, binName);
      targetAppPath = path.resolve(targetAppDir);
      targetDir = path.join(platformDir, _src);
      targetDirPath = path.resolve(targetDir);
      copyOption = {
        forceDelete: true,
        excludeHiddenUnix: false,
        inflateSymlinks: false
      };
      identity = "";
      if ((((_ref = options.platformResouces) != null ? (_ref1 = _ref.darwin) != null ? _ref1.identity : void 0 : void 0) != null) && isFile(options.platformResouces.darwin.identity)) {
        identity = fs.readFileSync(options.platformResouces.darwin.identity, 'utf8').trim();

        /*
                signingCmd =
         * http://sevenzip.sourceforge.jp/chm/cmdline/commands/extract.htm
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
         */
      }
      targetDir = path.join(packageJson.name, _src);
      targetDirPath = path.resolve(platformDir, _src);
      targetPath = path.resolve(platformPath);
      return async.series([
        function(next) {
          var bar;
          if (!isFile(cacheFile)) {
            util.log(PLUGIN_NAME, "download " + platform + " " + options.version + " cache filie.");
            wrench.mkdirSyncRecursive(cachePath);
            bar = null;
            return grs({
              repo: 'atom/electron',
              tag: options.version,
              name: cacheZip
            }).on('error', function(error) {
              throw new PluginError(error);
            }).on('size', function(size) {
              return bar = new ProgressBar(pkg + " [:bar] :percent :etas", {
                complete: '>',
                incomplete: ' ',
                width: 20,
                total: size
              });
            }).pipe(through(function(chunk, enc, cb) {
              bar.tick(chunk.length);
              this.push(chunk);
              return cb();
            })).pipe(fs.createWriteStream(cacheFile)).on('close', function() {
              return next();
            }).on('error', next);
          } else {
            return next();
          }
        }, function(next) {
          util.log(PLUGIN_NAME, "unzip " + platformDir + " cache filie.");
          util.log(PLUGIN_NAME, "download " + platform + " " + options.version + " cache filie.");
          return rm(cacheedPath, function() {
            var unzip;
            wrench.mkdirSyncRecursive(platformDir);
            util.log(PLUGIN_NAME, "unzip " + platform + " " + options.version + " electron.");
            unzip = new Decompress(cacheFile);
            unzip.on('extract', function() {
              return next();
            });
            return unzip.extract({
              path: cacheedPath,
              follow: true
            });

            /*
            spawn unpackagingCmd[process.platform], next
             */
          });
        }, function(next) {
          wrench.mkdirSyncRecursive(platformPath);
          wrench.copyDirSyncRecursive(cacheedPath, platformPath, copyOption);
          return next();
        }, function(next) {
          util.log(PLUGIN_NAME, "distributing " + targetAppDir);
          return rm(targetAppPath, function() {
            return mv(electronFilePath, targetAppPath, next);
          });
        }, function(next) {
          if (!isExists(targetDirPath)) {
            return rm(targetDirPath, next);
          } else {
            return next();
          }
        }, function(next) {
          util.log(PLUGIN_NAME, "" + options.src + " -> " + targetDir + " distributing");
          wrench.mkdirSyncRecursive(targetDirPath);
          wrench.copyDirSyncRecursive(options.src, targetDirPath, copyOption);
          return next();
        }, function(next) {
          var promiseList;
          if (!options.packaging) {
            return next();
          }
          return next();
        }, function(next) {
          if (!isExists(targetAppPath)) {
            return mv(electronFilePath, targetAppPath, function() {
              return next();
            });
          } else {
            return next();
          }
        }, function(next) {
          if (!options.packaging) {
            return next();
          }
          if (isFile(pkgZipFilePath)) {
            return rm(pkgZipFilePath, next);
          } else {
            return next();
          }
        }, function(next) {
          util.log(PLUGIN_NAME, options.src + " -> " + targetDir + " distributing");
          wrench.mkdirSyncRecursive(targetDirPath);
          wrench.copyDirSyncRecursive(options.src, targetDirPath, {
            forceDelete: true,
            excludeHiddenUnix: false,
            inflateSymlinks: false
          });
          return next();
        }, function(next) {
          var _target;
          _target = packageJson.name;
          if (!options.rebuild && isExists(path.join(pkgZipPath, pkgZip))) {
            _target = targetDir;
          }
          util.log(PLUGIN_NAME, (path.join(pkgZipDir, _target)) + " packaging");
          return mv(platformPath, platformZipPath, function() {
            return spawn({
              cmd: 'zip',
              args: ['-9', '--symlinks', '-r', pkgZip, _target],
              opts: {
                cwd: pkgZipPath
              }
            }, function() {
              return mv(platformZipPath, platformPath, next);
            });
          });
        }
      ], function(error, results) {
        var _zip;
        _zip = path.join(pkgZipDir, pkgZip);
        util.log(PLUGIN_NAME, _zip + " distribute done.");
        return cb();
      });
    }, function(error, results) {
      util.log(PLUGIN_NAME, "all distribute done.");
      return callback();
    });
  };
  return through.obj(bufferContents, endStream);
};

isDir = function() {
  var filepath;
  filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath) && !fs.statSync(filepath).isFile();
};

isFile = function() {
  var filepath;
  filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath) && fs.statSync(filepath).isFile();
};

isExists = function() {
  var filepath;
  filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath);
};

getApmPath = function() {
  var apmPath;
  apmPath = path.join('apm', 'node_modules', 'atom-package-manager', 'bin', 'apm');
  if (!isFile(apmPath)) {
    return apmPath = 'apm';
  }
};

spawn = function(options, cb) {
  var error, proc, stderr, stdout;
  stdout = [];
  stderr = [];
  error = null;
  options.args.forEach(function(arg) {
    return arg = arg.replace(' ', '\\ ');
  });
  util.log("> " + options.cmd + " " + (options.args.join(' ')));
  proc = childProcess.spawn(options.cmd, options.args, options.opts);
  proc.stdout.on('data', function(data) {
    stdout.push(data.toString());
    if (process.NODE_ENV === 'test') {
      return util.log(data.toString());
    }
  });
  proc.stderr.on('data', function(data) {
    return stderr.push(data.toString());
  });
  return proc.on('exit', function(code, signal) {
    var results;
    if (code !== 0) {
      error = new Error(signal);
    }
    results = {
      stderr: stderr.join(''),
      stdout: stdout.join(''),
      code: code
    };
    if (code !== 0) {
      throw new PluginError(PLUGIN_NAME, results.stderr || 'unknow error , maybe you can try delete the zip packages.');
    }
    return cb(error, results);
  });
};
