'use strict';

var debug = require('debug')('xpr:dash:mongodb:app')
  , experimentValidator = require('xpr-util-validation').experimentValidator
  , Promise = Promise || require('bluebird');

var AppModel = require('./app')
  , ExpModel = require('./experiment');


module.exports = App;


/**
 * Generates
 * @param {[type]} config [description]
 */
function App(config) {
  config = config || {};

  if (! (config instanceof AppModel)) config = new AppModel(config);

  this.doc = config;
}


/**
 * Limits the fields that can be queried
 *
 * @param  {Object} oldObj Potentially unsafe query
 * @return {Object}        Safe query
 */
App.cleanQuery = function(oldObj) {
  var fieldList = [ 'github_repo' ]
    , newObj = {}
    , field;

  for (var i=0, l=fieldList.length; i<l; i++) {
    field = fieldList[i];
    if (oldObj[field]) newObj[field] = oldObj[field];
  }

  return newObj;
};


/**
 * Deletes the given experiment
 *
 * @param  {String}   id Experiment ID
 * @param  {Function} cb Callback
 * @return {Promise}     Promise - Resolves the parent app
 */
App.deleteExperiment = function(id, cb) {
  return new Promise(function(resolve, reject) {
    AppModel.findOneAndUpdate({
      'experiments._id': id
    }, {
      $pull: {
        experiments: { '_id': id }
      }
    }).exec(function(err, doc) {
      if (err) {
        debug('Experiment delete err: ', err);

        if (cb) cb(err);
        return reject(err);
      }

      var app = new App(doc);

      if (cb) cb(null, app);
      resolve(app);
    });
  });
};


/**
 * Fetch many by any query
 *
 * @param  {Object}   query Query data
 * @param  {Function} cb    Callback
 * @return {Promise}        Promise - Resolves an array of `new App`s
 */
App.find = function(query, raw, cb) {
  return new Promise(function(resolve, reject) {
    AppModel
      .find(query)
      .sort({
        name: 1,
        github_repo: 1,
      })
      .exec(function(err, docs) {
        if (err) {
          debug('App fetch failure: ', err);
          if (cb) cb(err);
          return reject(err);
        }

        if (! raw) {
          docs = docs.map(function(doc) {
            return new App(doc);
          });
        }

        if (cb) cb(null, docs);
        return resolve(docs);
      });
  });
};


/**
 * Fetch one (first) item by any query
 *
 * @param  {Object}   query Query data
 * @param  {Function} cb    Callback
 * @return {Promise}        Promise - Resolves a `new App`
 */
App.findOne = function(query, cb) {
  return new Promise(function(resolve, reject) {
    AppModel.findOne(query).exec(function(err, doc) {
      if (err) {
        debug('App find err:', err);

        if (cb) cb(err);
        return reject(err);
      }

      if (! doc) {
        debug('App not found');

        if (cb) cb(401);
        return reject(401);
      }

      var app = new App(doc);

      if (cb) cb(null, app);
      return resolve(app);
    });
  });
};


/**
 * Fetch by ID, change data, and save
 *
 * @param  {String}   id    AppID
 * @param  {Object}   data  Data to change on the object
 * @param  {Function} cb    Callback
 * @return {Promise}        Promise - Resolves a `new App`
 */
App.findAndUpdate = function(id, data, cb) {

  if (! data.date_modified) data.date_modified = new Date();

  return new Promise(function(resolve, reject) {
    console.log(JSON.stringify(id, null, 2), JSON.stringify(data, null, 2));
    AppModel
      .findByIdAndUpdate(id, {
        $set: data
      }, { new: true })
      .exec(function(err, doc) {
        if (err) {
          debug('App update error: ', err);

          if (cb) cb(err);
          return reject(err);
        }

        // This is a PUT. This should already exist
        if (! doc) {
          debug('App (update) not found!');

          if (cb) cb(404);
          return reject(404);
        }

        var app = new App(doc);

        if (cb) cb(null, app);
        return resolve(app);
      });
  });
};


/**
 * Fetch Experiment by ID, change data, and save
 *
 * @param  {String}   id    ExperimentID
 * @param  {Object}   data  Data to change on the object
 * @param  {Function} cb    Callback
 * @return {Promise}        Promise - Resolves the parent App
 */
App.updateExperiment = function(id, data, cb) {

  if (! data.date_modified) data.date_modified = new Date();

  return new Promise(function(resolve, reject) {
    AppModel
      .findOneAndUpdate(
        { 'experiments._id': id },
        {
          $set: data
        },
        { new: true }
      )
      .exec(function(err, doc) {
        if (err) {
          debug('App update error: ', err);

          if (cb) cb(err);
          return reject(err);
        }

        // This is a PUT. This should already exist
        if (! doc) {
          debug('Experiment (update) not found!');

          if (cb) cb(404);
          return reject(404);
        }

        var app = new App(doc);

        if (cb) cb(null, app);
        return resolve(app);
      });
  });
};


/**
 * Generate an experiment and adds to the app
 *
 * Does not save
 *
 * @param  {Object} data Experiment data
 * @return {Object}      The created experiment
 */
App.prototype.createExperiment = function(data, defaultVal) {
  var exp = new ExpModel(data);

  exp.value = defaultVal;

  this.doc.experiments.push(exp);
  return exp;
};


/**
 * Returns the Object of the whole document
 *
 * Safer than letting people just get it, right?
 *
 * @return {Object} `this.doc`
 */
App.prototype.getDoc = function(serialized) {
  if (serialized) return this.getSerialized();

  return this.doc;
};


/**
 * Fetches a single experiment by its unique identifier
 *
 * @param  {String} expId Experiment ID
 * @return {Object}       Experiment
 */
App.prototype.getExperiment = function(expId) {
  return this.doc.experiments.id(expId);
};


/**
 * Get an object of all of these experiments
 *
 * @return {Object}  Object of name: experiment
 */
App.prototype.getExperimentsObj = function() {

  var obj = {};
  var experiments = this.doc.experiments;
  experiments.map(function(item) {
    obj[item.name] = item;
  });

  return obj;
};


/**
 * Returns the Serialized Object of the whole document
 *
 * Validates experiments before returning serialized data
 *
 * @return {Object} `this.doc.serialized`
 */
App.prototype.getSerialized = function() {

  var invalid = this.invalidExperiments = {};

  var serialized = this.doc.serialized
    , experiments = serialized.experiments;

  for (var key in experiments) {
    if (experiments.hasOwnProperty(key) && !experimentValidator.isValid({ name: key })) {
      invalid[key] = experiments[key];
      delete experiments[key];
    }
  }

  return serialized;
};


/**
 * Save the doc to the datastore
 * @param  {Function} cb  Callback
 * @return {Promise}      Promise - Resolves `undefined`
 */
App.prototype.save = function(cb) {
  var doc = this.doc;

  return new Promise(function(resolve, reject) {
    doc.save(function(err) {
      if (err) {
        debug('App save error: ', err);

        if (cb) cb(err);
        return reject(err);
      }
      debug('App saved: ', doc);

      if (cb) cb();
      resolve();
    });
  });
};


/**
 * Generate and save the Serialized data for this app
 *
 * This allows the fetching to go that much faster
 *
 * @param  {Function} cb  Callback
 * @return {Promise}      Promise - Resolves `this`
 */
App.prototype.serialize = function(cb) {
  return this.doc.serialize(cb);
};
