/* global before, after */
'use strict';

var root = '../';

var connection = require(root).init('mongodb://localhost/test');

before(function(done) {
  return connection.on('open', function() {
    return connection.db.dropDatabase(done);
  });
});

after(function(done) {
  return connection.close(done);
});

module.exports = connection.db;
