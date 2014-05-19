

var gulpAtom = require('../');
var gulp = require('gulp');
var util = require('gulp-util');


process.NODE_ENV = 'test';

gulp.task('atom', function() {

    return gulpAtom({
        srcPath: './src',
        releasePath: './release',
        cachePath: './cache',
        version: 'v0.12.4',
        rebuild: true,
        platforms: ['win']
    });
});

gulp.task('default', ['atom']);
