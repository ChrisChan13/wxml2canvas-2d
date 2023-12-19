const gulp = require('gulp');
const clean = require('gulp-clean');

const config = require('./tools/config');
require('./tools/build');

const cleanPath = (path) => gulp.src(path, {
  read: false, allowEmpty: true,
}).pipe(clean());

gulp.task('clean', gulp.series(
  () => cleanPath(config.distPath),
  (done) => {
    if (!config.isDev) return done();
    return cleanPath(config.demoDist);
  },
));

gulp.task('default', gulp.series('build'));
