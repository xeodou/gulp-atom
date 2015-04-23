
var electron = require('../');
var gulp = require('gulp');
var util = require('gulp-util');

var packageJson = require('./src/package.json');

process.NODE_ENV = 'test';

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

gulp.task('default', ['electron']);

