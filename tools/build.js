const gulp = require('gulp');

const config = require('./config');

const copyFile = (filePattern, cwd, distPath) => gulp.src(filePattern, { cwd })
  .pipe(gulp.dest(distPath));

gulp.task('build-component', () => copyFile('**/*', config.srcPath, config.distPath));
gulp.task('build-demo', () => copyFile('**/*', config.demoSrc, config.demoDist));

gulp.task('watch-component', () => {
  const watchCallback = (filePattern) => copyFile(filePattern, config.srcPath, config.distPath);
  return gulp.watch('**/*', { cwd: config.srcPath })
    .on('change', watchCallback)
    .on('add', watchCallback)
    .on('unlink', watchCallback);
});
gulp.task('watch-demo', () => {
  const watchCallback = (filePattern) => copyFile(filePattern, config.demoSrc, config.demoDist);
  return gulp.watch('**/*', { cwd: config.demoSrc })
    .on('change', watchCallback)
    .on('add', watchCallback)
    .on('unlink', watchCallback);
});

(() => {
  gulp.task('build', gulp.series('build-component'));
  gulp.task('dev', gulp.series(
    gulp.parallel('build-component', 'build-demo'),
    gulp.parallel('watch-component', 'watch-demo'),
  ));
})();
