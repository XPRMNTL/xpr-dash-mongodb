/**
 * Module Dependencies
 */
var debug = require('debug')('feature:models:app:methods')
  , Promise = Promise || require('bluebird');

module.exports = setupMethods;

/**
 * In this file `this` will represent the Document
 */
function setupMethods(Schema) {
  Schema.methods.serialize = serialize;
  Schema.methods.generateSerialized = generateSerialized;
}

function generateSerialized() {
  var serialized = {
      groups: this.groups,
      envs: {},
    }
    , experiments = serialized.experiments = {}
    , envs = serialized.envs;

  this.experiments
    .filter(function(item) {
      // filter out archived items
      return item.archived !== true;
    })
    .map(function(item) {
      var references = item.references
        , name = item.name
        , ref, val;

      experiments[name] = item.value;

      if (! references) return;

      // If the refFlag is set, overwrite it or nothing.
      // if (refFlag) {
      //   val = references[refFlag];

      //   // If there was no override, just leave it as is.
      //   if (undefined === val) return;

      //   // Set Groups list
      //   if (typeof val === 'object' && typeof val.length === 'number')  {
      //     return (experiments[name] = val.map(cleanGroupList));
      //   }

      //   // Set the booleans
      //   return (experiments[name] = val);
      // }

      for (ref in references) {
        if (references.hasOwnProperty(ref)) {
          if (envs && (! envs[ref])) envs[ref] = {};
          val = references[ref];

          // Sets Groups list
          if (typeof val === 'object' && typeof val.length === 'number') {
            envs[ref][name] = val.map(cleanGroupList);
            continue;
          }

          // Set the booleans
          envs[ref][name] = val;
        }
      }
    });

  this._serialized = JSON.stringify(serialized);
}

function serialize(cb) {

  var doc = this;

  return new Promise(function(resolve, reject) {
    doc.generateSerialized();

    doc.save(function(err) {
      if (err) {
        console.info('count#xprmntl.serialize_save.fail=1 error="' + err.message + '"');
        if (cb) cb(err);
        return reject(err);
      }

      if (cb) cb(null, doc);
      resolve(doc);
    });
  });
}

function cleanGroupList(item) {
  if (typeof item === 'string') return item;
  if (typeof item.min === 'number' && typeof item.max === 'number') return '' + item.min + '-' + item.max + '%';
}
