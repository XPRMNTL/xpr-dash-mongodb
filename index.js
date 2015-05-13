var mongoose = require('mongoose');
var connection = mongoose.connection;

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', function callback () {
  console.info('DB Connection Successful');
});


module.exports = {
  app: require('./models/newApp'),
  testHelpers: require('./test/helpers.test.js'),
  init: function(MONGO_URL) {
    mongoose.connect(MONGO_URL);

    return connection;
  }
};
