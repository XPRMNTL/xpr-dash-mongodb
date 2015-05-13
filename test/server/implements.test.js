/* global describe, before, after, it */

'use strict';

var expect = require('chai').expect;

var root = '../../';

// var db = require('./db.test');

var App = require(root + 'models/newApp');

require('xpr-dash-db-interface')(App);
