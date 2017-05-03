#!/usr/bin/env node

var fs = require('fs');
var karel = require('./karel.js');
var version = require('../package.json').version;
var DOMParser = require('xmldom').DOMParser;

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
