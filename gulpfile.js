'use strict';
/* jshint node:true */

process.env.NODE_ENV = 'test';
require('should');

var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var coffee = require('gulp-coffee');
var coffeelint = require('gulp-coffeelint');
var mocha = require('gulp-mocha');

// Files.
var src = '*.coffee';
var tests = 'test/*.mocha.js';

// Coffee Lint
gulp.task('lint', function() {
    gulp.src(src)
        .pipe(coffeelint())
        .pipe(coffeelint.reporter());
});

// Compile coffee scripts.
gulp.task('coffee', ['lint'], function() {
    return gulp.src(src)
        .pipe(coffee({
            bare: true
        }).on('error', gutil.log))
        .pipe(gulp.dest('.'))
        .on('error', gutil.log);
});

// Run tests.
gulp.task('mocha', ['coffee'], function() {
    return gulp.src(tests)
        .pipe(mocha({
            timeout: 10000,
            reporter: 'spec'
        }));
});

gulp.task('watch', function() {
    gulp.watch(src, ['coffee']);
});

gulp.task('default', ['coffee']);
