'use strict';
/* jshint node:true */

var electron = require('../');
var gulp = require('gulp');
var util = require('gulp-util');

var packageJson = require('./src/package.json');
var nodeInspector = require('gulp-node-inspector');

process.NODE_ENV = 'test';

gulp.task('electron', function() {

    gulp.src("")
    .pipe(electron({
        src: process.env.PWD + '/src',
        packageJson: packageJson,
        release: process.env.PWD + '/release',
        cache: process.env.PWD + '/cache',
        version: 'v0.37.6',
        rebuild: false,
        packaging: true,
        asar: true,
        platforms: ['win32-ia32', 'darwin-x64', 'linux-ia32', 'linux-x64', 'linux-arm'],
        platformResources: {
            darwin: {
                CFBundleDisplayName: packageJson.name,
                CFBundleIdentifier: packageJson.name,
                CFBundleName: packageJson.name,
                CFBundleVersion: packageJson.version,
                icon: 'gulp-electron.icns'
            },
            win: {
                "version-string": packageJson.version,
                "file-version": packageJson.version,
                "product-version": packageJson.version,
                "icon": 'gulp-electron.ico'
            }
        }
    }))
    .pipe(gulp.dest(""));
});

gulp.task('debug', function() {
  gulp.src([])
    .pipe(nodeInspector());
});

gulp.task('default', ['electron']);

