/**
 * REST API filters default parser
 */
var filters = module.exports = {
  values: []
};

filters.signs = {
  "or": function(sender, filter, quote) {
    return filter.replace(/\|or\|/gi, "|OR|");
  },
  "and": function(sender, filter, quote) {
    return filter.replace(/\|and\|/gi, "|AND|");
  },

  "cs": function(sender, filter, quote) {
    return filter.replace(/\|cs\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|LIKE '%" + sender.likeEscape(v) + "%'|";
    });
  },
  "sw": function(sender, filter, quote) {
    return filter.replace(/\|sw\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|LIKE '" + sender.likeEscape(v) + "%'|";
    });
  },
  "ew": function(sender, filter, quote) {
    return filter.replace(/\|ew\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|LIKE '%" + sender.likeEscape(v) + "'|";
    });
  },
  "eq": function(sender, filter, quote) {
    return filter.replace(/\|eq\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|= " + v + "|";
    });
  },
  "lt": function(sender, filter, quote) {
    return filter.replace(/\|lt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|< " + v + "|";
    });
  },
  "le": function(sender, filter, quote) {
    return filter.replace(/\|le\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|<= " + v + "|";
    });
  },
  "ge": function(sender, filter, quote) {
    return filter.replace(/\|ge\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|>= " + v + "|";
    });
  },
  "gt": function(sender, filter, quote) {
    return filter.replace(/\|gt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|> " + v + "|";
    });
  },
  "bt": function(sender, filter, quote) {
    return filter.replace(/\|bt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      var val = v.split(',');
      return (val.length == 2) ? "|BETWEEN " + val[0] + " AND " + val[1] + "|" : "|";
    });
  },
  "in": function(sender, filter, quote) {
    return filter.replace(/\|in\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|IN (" + v + ")|";
    });
  },
  "is": function(sender, filter, quote) {
    return filter.replace(/\|is\|/gi, function(x) {
      return "|IS NULL|";
    });
  },

  "ncs": function(sender, filter, quote) {
    return filter.replace(/\|ncs\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|NOT LIKE '%" + sender.likeEscape(v) + "%'|";
    });
  },
  "nsw": function(sender, filter, quote) {
    return filter.replace(/\|nsw\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|NOT LIKE '" + sender.likeEscape(v) + "%'|";
    });
  },
  "new": function(sender, filter, quote) {
    return filter.replace(/\|new\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|NOT LIKE '%" + sender.likeEscape(v) + "'|";
    });
  },
  "neq": function(sender, filter, quote) {
    return filter.replace(/\|neq\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|<> " + v + "|";
    });
  },
  "nlt": function(sender, filter, quote) {
    return filter.replace(/\|nlt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|>= " + v + "|";
    });
  },
  "nle": function(sender, filter, quote) {
    return filter.replace(/\|nle\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|> " + v + "|";
    });
  },
  "nge": function(sender, filter, quote) {
    return filter.replace(/\|nge\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|< " + v + "|";
    });
  },
  "ngt": function(sender, filter, quote) {
    return filter.replace(/\|ngt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|<= " + v + "|";
    });
  },
  "nbt": function(sender, filter, quote) {
    return filter.replace(/\|nbt\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      var val = v.split(',');
      return (val.length == 2) ? "|NOT BETWEEN " + val[0] + " AND " + val[1] + "|" : "|";
    });
  },
  "nin": function(sender, filter, quote) {
    return filter.replace(/\|nin\|([^\|]+)\|/gi, function(x, x1) {
      var v = sender.getValue(x1, quote);
      return "|NOT IN (" + v + ")|";
    });
  },
  "nis": function(sender, filter, quote) {
    return filter.replace(/\|nis\|/gi, function(x) {
      return "|IS NOT NULL|";
    });
  }
};

filters.likeEscape = function(val) {
  return val.replace(/\'/g, '').replace(/([%_])/g, '\\$1');
}

filters.getValue = function(key, quote) {
  if (typeof quote === 'undefined' || quote == null) {
    quote = "'";
  }
  var val = key;
  if (key.startsWith('#')) {
    var idx = parseInt(key.substring(1));
    val = this.values[idx];
  }
  val = val.replace(/^\[([^\[\]]+)\]$/g, '$1');
  var valArr = [];
  if (!!~val.indexOf(',')) {
    valArr = val.split(',');
  } else {
    valArr.push(val);
  }
  for (var i in valArr) {
    valArr[i] = valArr[i].replace(/\'/g, '');
    if (!/^[\d]+$/.test(valArr[i])) {
      valArr[i] = quote + valArr[i] + quote;
    }
  }

  return valArr.join(',');
}

filters.convertFilter = function(filter, quote) {
  if (typeof quote === 'undefined' || quote == null) {
    quote = "'";
  }
  var self = this;
  this.values = [];
  filter = filter.trim();
  filter = filter.replace(/(\[[^\[\]]+\])/g, function(x) {
    self.values.push(x);
    return '#' + (self.values.length - 1);
  });
  filter = filter.replace(/(\'[^\']+\')/g, function(x) {
    self.values.push(x);
    return '#' + (self.values.length - 1);
  });
  filter = (',' + filter + ',').replace(/([\(\)])/g, ',$1,')
    .replace(/[,]{2,}/g, ',')
    .replace(/[^a-zA-Z0-9\-_,.*#\(\)]/g, '')
    .replace(/,/g, '|');

  for (var s in this.signs) {
    filter = this.signs[s](this, filter, quote);
  }
  return filter.replace(/\|/g, ' ').trim();
}