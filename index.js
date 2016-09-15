var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var stream = require("stream");
var util = require("util");
var os = require('os');

var haxeRe = /\.hx$/i;

function isHaxe(filename) {
  return haxeRe.test(filename);
}

function haxeToJs(filename) {
  return filename + '.js';
}

function haxeToClass(filename) {
  return path.basename(filename.replace(haxeRe, ''));
}

function Haxeify(filename, opts) {
  if (!(this instanceof Haxeify)) {
    return Haxeify.configure(filename, opts);
  }

  stream.Transform.call(this);
  this._data = "";
  this._filename = filename;
  this._opts = opts;
}

Haxeify.prototype._transform = function (buf, enc, callback) {
  this._data += buf;
  callback();
};

Haxeify.prototype._flush = function (callback) {
  var stderr = '';
  var haxe = spawn(this._opts.cmd, this._opts.args);
  var self = this;

  haxe.stderr.on('data', function (buf) {
    stderr += buf;
  });

  haxe.on('close', function (code) {
    if (code !== 0) {
      self.emit('error', new Error(stderr));
    }
    fs.readFile(self._opts.outFilename, function(err, data) {
      if (err) {
        self.emit('error', err);
      }

      self.push(data);
      callback();
    });
  });
};

Haxeify.configure = function (filename, opts) {
  opts = opts || {};

  if (!isHaxe(filename)) {
    return stream.PassThrough();
  }

  var outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'haxeify-'));
  var outFilename = path.join(outDir, haxeToJs(filename));

  cmd = opts.haxe || 'haxe';
  args = [haxeToClass(filename), '-js', outFilename];

  if (opts.main) {
    args.unshift('-main');
  }

  if (typeof opts.hxml == 'string') {
    args.unshift(opts.hxml);
  }

  if (typeof opts.lib == 'string') {
    args.push('-lib', opts.lib);
  }
  else if (Array.isArray(opts.lib)) {
    args = opts.lib.reduce(function(prev, lib) {
      return prev.concat(['-lib', lib]);
    }, args);
  }

  if (typeof opts.dce == 'string') {
    args.push('-dce', opts.dce);
  }

  if (process.cwd() != path.dirname(filename)) {
    args.push('-cp', path.resolve(process.cwd(), path.dirname(filename)));
  }

  return new Haxeify(filename, {cmd: cmd, args: args, outFilename: outFilename});
};

util.inherits(Haxeify, stream.Transform);
module.exports = Haxeify;
