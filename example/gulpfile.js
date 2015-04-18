

var gulpAtom = require('../');
var gulp = require('gulp');
var util = require('gulp-util');


process.NODE_ENV = 'test';

gulp.task('atom', function() {

    return gulpAtom({
        srcPath: './src',
        releasePath: './release',
        cachePath: './cache',
        version: 'v0.24.0',
        rebuild: false,
        platforms: ['win32-ia32', 'darwin-x64']
    });
});

gulp.task('default', ['atom']);
