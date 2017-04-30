const assert = require('assert');
const extract = require('extract-zip')
const fs = require('fs');
const tmp = require('tmp');

describe('extract-zip', function() {
  var dir = null;

  beforeEach(function() {
    dir = tmp.dirSync({unsafeCleanup: true});
  });

  afterEach(function() {
    dir.removeCallback();
    dir = null;
  });

  it('should not crash with intermediate directories', function(done) {
    extract('./test/test.zip', {dir: dir.name}, function(err) {
      assert.ifError(err);
      assert.ok(fs.existsSync(dir.name + '/nested/file'));
      done();
    });
  });
});
