var PLUGIN_NAME, async, atom, childProcess, fs, getApmPath, grw, isFile, path, spawn, through2, util, wrench;

fs = require('fs');

grw = require('grw');

path = require('path');

async = require('async');

wrench = require('wrench');

util = require('gulp-util');

through2 = require('through2');

childProcess = require('child_process');

PLUGIN_NAME = 'gulp-atom-shell';

module.exports = atom = function(options) {
  var platforms;
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
  platforms = ['darwin', 'win32', 'linux'];
  return async.each(options.platforms, function(platform, callback) {
    var cacheFile, cachePath, releasePath;
    if (platform === 'osx') {
      platform = 'darwin';
    }
    if (platform === 'win') {
      platform = 'win32';
    }
    if (platforms.indexOf(platform) < 0) {
      util.log(PLUGIN_NAME, "Not support platform " + platform);
      return callback();
    }
    cachePath = path.resolve(options.cachePath, options.version);
    cacheFile = path.resolve(cachePath, "atom-shell-" + platform + ".zip");
    releasePath = path.resolve(options.releasePath, options.version, platform);
    return async.series([
      function(next) {
        if (!isFile(cacheFile)) {
          util.log(PLUGIN_NAME, "" + platform + " " + options.version + " atom-shell package is downloading...");
          wrench.mkdirSyncRecursive(cachePath);
          options.repo = 'atom/atom-shell';
          options.prefix = "atom-shell-" + options.version + "-" + platform;
          if (options.symbols) {
            options.prefix += '-symbols';
          }
          options.ext = 'zip';
          return grw(options).pipe(fs.createWriteStream(cacheFile)).on('close', function() {
            util.log(PLUGIN_NAME, "" + platform + " " + options.version + " atom-shell package is downloaded.");
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
        util.log(PLUGIN_NAME, 'Distribute applications.');
        _src = 'resources/app';
        if (platform === 'darwin') {
          _src = 'Atom.app/Contents/Resources/app/';
        }
        wrench.mkdirSyncRecursive(path.join(releasePath, _src));
        return wrench.copyDirSyncRecursive(options.srcPath, path.join(releasePath, _src), {
          forceDelete: true,
          excludeHiddenUnix: false,
          inflateSymlinks: false
        });
      }
    ], function(error, results) {
      return callback(error);
    });
  }, function(error) {
    if (error) {
      return util.log(PLUGIN_NAME, error.message);
    }
  });
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
