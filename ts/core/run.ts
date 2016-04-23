import deref = require('deref');

import container = require('../class/Container');
import traverse = require('./traverse');
import random = require('./random');
import utils = require('./utils');

function mixRefs($, sub, reduce): void {
  if (Array.isArray(sub.allOf)) {
    var schemas: JsonSchema[] = sub.allOf;

    delete sub.allOf;

    // this is the only case where all sub-schemas
    // must be resolved before any merge
    schemas.forEach(function(schema: JsonSchema) {
      utils.merge(sub, reduce(schema));
    });
  }

  if (Array.isArray(sub.oneOf || sub.anyOf)) {
    var mix = sub.oneOf || sub.anyOf;

    delete sub.anyOf;
    delete sub.oneOf;

    utils.merge(sub, random.pick(mix));
  }

  if (typeof sub.$ref === 'string') {
    var id = sub.$ref;

    delete sub.$ref;

    utils.merge(sub, $.util.findByRef(id, $.refs));
  }
}

function isKey(prop: string): boolean {
  return prop === 'enum' || prop === 'required' || prop === 'definitions';
}

// TODO provide types
function run(schema, refs?, ex?) {
  var $ = deref();

  try {
    return traverse($(schema, refs, ex), [], function reduce(sub, maxDepth) {
      do {
        if (typeof maxDepth === 'undefined') {
          maxDepth = random.number(2, 5);
        }

        if (maxDepth <= 0) {
          delete sub.$ref;
          delete sub.oneOf;
          delete sub.anyOf;
          delete sub.allOf;
          return sub;
        }

        maxDepth -= 1;
        mixRefs($, sub, reduce);
      } while (sub.$ref || sub.oneOf || sub.anyOf || sub.allOf);

      for (var prop in sub) {
        if ((Array.isArray(sub[prop]) || typeof sub[prop] === 'object') && !isKey(prop)) {
          sub[prop] = reduce(sub[prop], maxDepth);
        }
      }

      return sub;
    });
  } catch (e) {
    if (e.path) {
      throw new Error(e.message + ' in ' + '/' + e.path.join('/'));
    } else {
      throw e;
    }
  }
}

export = run;
