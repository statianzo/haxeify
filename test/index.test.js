var browserify = require('browserify');
var vm = require('vm');
var test = require('tap').test;
var path = require('path');
var haxeify = ('./');

test('bundled with .hx file', function(t) {
  t.plan(2);

  var b = browserify();

  b.require(path.join(__dirname,'/fixture/TestBundle.hx'), {expose: 'bundle'});
  b.transform([haxeify]);

  b.bundle(function(err, src) {
    t.error(err);
    var c = {};
    vm.runInNewContext(src, c);
    t.equal(c.require('bundle').foo(), 'bar');
  });
});
