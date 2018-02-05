#!/usr/bin/env node

var fs = require('fs');
var karel = require('./karel.js');
var WorldRender = require('./mundo.js').WorldRender;
var version = require('../package.json').version;
var DOMParser = require('xmldom').DOMParser;
var Canvas = require('canvas-prebuilt');

var nomnom = require('nomnom');

nomnom.command('compile')
    .option('lang',
            {
              abbr: 'l',
              position: 1,
              required: true,
              choices: ['pascal', 'java', 'ruby'],
              type: 'string',
              help: 'the language (pascal, java, ruby)'
            })
    .option('input',
            {
              abbr: 'i',
              position: 2,
              required: true,
              type: 'string',
              help: 'the program to compile'
            })
    .option('output', {abbr: 'o', type: 'string', help: 'the output file'})
    .help('compile a karel program');

nomnom.command('run')
    .option('program',
            {
              abbr: 'p',
              position: 1,
              required: true,
              type: 'string',
              help: 'the program you want to run'
            })
    .help('run a compiled karel program');

nomnom.command('draw')
    .option('world',
            {
              abbr: 'w',
              position: 1,
              required: true,
              type: 'string',
              help: 'the world to be rendered'
            })
    .option('output',
            {
              abbr: 'o',
              position: 2,
              required: false,
              type: 'string',
              help: 'output file. Default is <world>.png.'
            })
    .option('width',
            {
              abbr: 'w',
              position: 3,
              required: false,
              type: 'string',
              help: 'width to draw, in cells'
            })
    .option('height',
            {
              abbr: 'h',
              position: 4,
              required: false,
              type: 'string',
              help: 'height to draw, in cells'
            })
    .help('draw a world input file as a png');

var opts = nomnom.script('karel.js')
               .option('verbose',
                       {
                         abbr: 'v',
                         flag: true,
                         help: 'be verbose (print debugging messages)'
                       })
               .option('version',
                       {
                         abbr: 'V',
                         flag: true,
                         help: 'print version and exit',
                         callback: function() { return version; }
                       })
               .parse();

if (opts['0'] == 'compile') {
  var file = fs.readFileSync(opts.input, {encoding: 'utf-8'});
  var parser = null;

  if (opts.lang == 'java') {
    parser = require('./kareljava.js').parse;
  } else if (opts.lang == 'pascal') {
    parser = require('./karelpascal.js').parse;
  } else if (opts.lang == 'ruby') {
    parser = require('./karelruby.js').parse;
  }

  var program = null;
  try {
    program = parser(file);
  } catch (e) {
    console.error(e.message);
    if (!e.hash || !e.hash.line || !e.hash.text) {
      process.exit(1);
    }
    var lines = file.split('\n');
    if (e.hash.line < 1 || e.hash.line > lines.length) {
      process.exit(1);
    }
    var errorLine = lines[e.hash.line].replace(/\t/g, '        ');
    var idx = errorLine.indexOf(e.hash.text);
    if (idx < 0) {
      process.exit(1);
    }
    var lineNumberPrefix = e.hash.line.toString(10) + ': ';
    console.error('\n' + lineNumberPrefix + errorLine);
    console.error(' '.repeat(idx + lineNumberPrefix.length) +
                  '^'.repeat(e.hash.text.length));
    process.exit(1);
  }

  var output = opts.output;
  if (!output) {
    var index = opts.input.lastIndexOf('.');
    if (index == -1) {
      output = opts.input + '.json';
    } else {
      output = opts.input.substring(0, index) + '.json';
    }
  }

  fs.writeFileSync(output, JSON.stringify(program));
} else if (opts['0'] == 'draw') {
  var outputFile = opts.output || opts.world.replace(/[^.]*$/, 'png');

  var out = fs.createWriteStream(outputFile, {encoding: 'binary'});

  var worldXml = new DOMParser().parseFromString(
      fs.readFileSync(opts.world, {encoding: 'utf-8'}), 'text/xml');

  var world = new karel.World(100, 100);
  world.load(worldXml);

  var height = parseInt(opts.height || world.XMLheight);
  var width = parseInt(opts.width || world.XMLwidth);

  var imgheight = 30 * (height + 1) + 15;
  var imgwidth = 30 * (width + 1) + 15;

  var canvas = new Canvas(imgwidth, imgheight);
  var stream = canvas.pngStream();

  stream.on('data', function(chunk) { out.write(chunk); });

  stream.on('end', function() { out.end(); });

  var ctx = canvas.getContext('2d');

  var renderer = new WorldRender(ctx, world.XMLheight, world.XMLwidth);

  renderer.paint(world, imgwidth, imgheight);
} else {
  var program = JSON.parse(fs.readFileSync(opts.program, {encoding: 'utf-8'}));
  var worldXml = new DOMParser().parseFromString(
      fs.readFileSync('/dev/stdin', {encoding: 'utf-8'}), 'text/xml');
  var world = new karel.World(100, 100);
  world.load(worldXml);
  if (opts.verbose) {
    world.runtime.debug = true;
    world.runtime.addEventListener(
        'debug', function(ev) { console.log(ev.debugType, ev.message); });
  }
  world.runtime.load(program);
  while (world.runtime.step()) {
    // Keep going...
  }
  console.log(world.output());
}
