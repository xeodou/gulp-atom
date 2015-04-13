var File, PLUGIN_NAME, ProgressBar, async, atom, childProcess, fs, getApmPath, grs, isFile, path, spawn, through2, util, wrench;

fs = require('fs');

grs = require('grs');

path = require('path');

async = require('async');

wrench = require('wrench');

util = require('gulp-util');

through2 = require('through2');

childProcess = require('child_process');

ProgressBar = require('progress');

File = require('vinyl');

PLUGIN_NAME = 'gulp-atom-shell';

module.exports = atom = function(options) {
  var platforms, stream;
  options = options || {};
  if (!options.releasePath || !options.version || !options.srcPath || !options.cachePath) {
    throw new util.PluginError('Miss version or release path.');
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
  stream = through2.obj();
  platforms = ['darwin', 'win32', 'linux', 'darwin-x64', 'linux-ia32', 'linux-x64', 'win32-ia32', 'win32-x64'];
  async.eachSeries(options.platforms, function(platform, callback) {
    var cacheFile, cachePath, pkg, releasePath;
    if (platform === 'osx') {
      platform = 'darwin';
    }
    if (platform === 'win') {
      platform = 'win32';
    }
    if (platforms.indexOf(platform) < 0) {
      stream.emit('error', "Not support platform " + platform);
      return callback();
    }
    pkg = "atom-shell-" + options.version + "-" + platform;
    if (options.symbols) {
      pkg += '-symbols';
    }
    pkg += "." + options.ext;
    cachePath = path.resolve(options.cachePath, options.version);
    cacheFile = path.resolve(cachePath, pkg);
    releasePath = path.resolve(options.releasePath, options.version, platform);
    return async.series([
      function(next) {
        var bar;
        if (!isFile(cacheFile)) {
          wrench.mkdirSyncRecursive(cachePath);
          bar = null;
          return grs({
            repo: 'atom/atom-shell',
            tag: options.version,
            name: pkg
          }).on('error', function(error) {
            return stream.emit('error', error);
          }).on('size', function(size) {
            return bar = new ProgressBar("" + pkg + " [:bar] :percent :etas", {
              complete: '>',
              incomplete: ' ',
              width: 20,
              total: size
            });
          }).pipe(through2(function(chunk, enc, cb) {
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
        if (!isFile(path.resolve(releasePath, 'version'))) {
          wrench.mkdirSyncRecursive(releasePath);
          util.log(PLUGIN_NAME, "unzip " + platform + " " + options.version + " atom-shell.");
          return spawn({
            cmd: 'unzip',
            args: ['-o', cacheFile, '-d', releasePath]
          }, next);
        } else {
          return next();
        }
      }, function(next) {
        if (options.rebuild) {
          util.log(PLUGIN_NAME, "Rebuilding modules");
          return spawn({
            cmd: options.apm,
            args: ['rebuild']
          }, next);
        } else {
          return next();
        }
      }, function(next) {
        var _src;
        util.log(PLUGIN_NAME, "" + pkg + " distribute done.");
        _src = 'resources/app';
        if (platform.indexOf('darwin') >= 0) {
          _src = 'Atom.app/Contents/Resources/app/';
        }
        wrench.mkdirSyncRecursive(path.join(releasePath, _src));
        wrench.copyDirSyncRecursive(options.srcPath, path.join(releasePath, _src), {
          forceDelete: true,
          excludeHiddenUnix: false,
          inflateSymlinks: false
        });
        return next(null, platform.indexOf('darwin') < 0 && releasePath || path.join(releasePath, 'Atom.app'));
      }
    ], function(error, results) {
      var execution, releaseDir;
      releaseDir = results[results.length - 1];
      execution = (function() {
        switch (false) {
          case !(platform.indexOf('darwin') >= 0):
            return 'Contents/MacOS/Atom';
          case !(platform.indexOf('win') >= 0):
            return 'atom.exe';
          default:
            return 'atom';
        }
      })();
      stream.write(new File({
        base: releaseDir,
        path: path.join(releaseDir, execution)
      }));
      return callback(error);
    });
  }, function(error) {
    if (error) {
      stream.emit('error', error);
    }
    return stream.end();
  });
  return stream;
};

isFile = function() {
  var filepath;
  filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath) && fs.statSync(filepath).isFile();
};

getApmPath = function() {
  var apmPath;
  apmPath = path.join('apm', 'node_modules', 'atom-package-manager', 'bin', 'apm');
  if (!isFile(apmPath)) {
    return apmPath = 'apm';
  }
};

spawn = function(options, callback) {
  var error, proc, stderr, stdout;
  stdout = [];
  stderr = [];
  error = null;
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
      throw new util.PluginError(PLUGIN_NAME, results.stderr || 'unknow error , maybe you can try delete the zip packages.');
    }
    return callback(error, results);
  });
};
