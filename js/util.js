var karel = require('../js/karel.js');
var fs = require('fs');

// Draws a world as a png.
// Takes a .in as a string, a path, and optionally:
// .height = how many rows to render
// .width = how many columns to render
// .run = the path to a karel program to run before rendering
var Draw = function(worldString, outputFile, opts) {
  var DOMParser = require('xmldom').DOMParser;
  var WorldRender = require('../js/mundo.js').WorldRender;
  var {createCanvas} = require('canvas');

  var worldXml = new DOMParser().parseFromString(worldString, 'text/xml');
  var out = fs.createWriteStream(outputFile, {encoding: 'binary'});

  var world = new karel.World(100, 100);
  world.load(worldXml);

  if (opts.run) {
    var file = fs.readFileSync(opts.run, {encoding: 'utf-8'});
    var compiled = null;
    if (opts.run.endsWith('.kx')) {
      compiled = JSON.parse(file);
    } else {
      compiled = karel.compile(file);
    }
    world.runtime.load(compiled);
    while (world.runtime.step())
      ;
  }

  var height = parseInt(opts.height || world.h);
  var width = parseInt(opts.width || world.w);

  var imgheight = 30 * (height + 1) + 15;
  var imgwidth = 30 * (width + 1) + 15;

  var canvas = createCanvas(imgwidth, imgheight);
  var stream = canvas.pngStream();

  stream.on('data', function(chunk) { out.write(chunk); });

  stream.on('end', function() { out.end(); });

  var ctx = canvas.getContext('2d');

  var renderer = new WorldRender(ctx, world.h, world.w);

  renderer.paint(world, imgwidth, imgheight);
};

if (typeof exports !== 'undefined') {
  exports.Draw = Draw;
}
