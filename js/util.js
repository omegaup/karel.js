var karel = require('../js/karel.js');
var fs = require('fs');

// Draws a world as a png.
// Takes a .in as a string, a path, and optionally how many cells to draw in each axis.
var Draw = function(worldString, outputFile, widthCells, heightCells){
  var DOMParser = require('xmldom').DOMParser;
  var WorldRender = require('../js/mundo.js').WorldRender;
  var { createCanvas } = require('canvas');

  var worldXml = new DOMParser().parseFromString(worldString, 'text/xml');
  var out = fs.createWriteStream(outputFile, {encoding: 'binary'});

  var world = new karel.World(100, 100);
  world.load(worldXml);

  var height = parseInt(heightCells || world.h);
  var width = parseInt(widthCells || world.w);

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