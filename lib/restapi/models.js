/**
 * REST API models loader
 */
var PATH = require('path');

var models = module.exports = {
  basePath: null,
  modPath: null,
  mods: {}
};

models.setBasePath = function(path) {
  if (path) {
    var pathArr = path.split(PATH.sep);
    var currentArr = __dirname.split(PATH.sep);
    while (pathArr.length > 0) {
      if (pathArr[0] != currentArr[0])
        break;
      pathArr.shift();
      currentArr.shift();
    }
    this.modPath = "./" + "../".repeat(currentArr.length) + pathArr.join('/');
    this.basePath = path;
  }
}

models.push = function(mod) {
  if (typeof mod === 'object' && mod.name) {
    if (mod.model) {
      this.mods[mod.name] = mod.model;
    } else {
      this.load(mod.name);
    }
  }
}

models.load = function(name) {
  if (this.modPath && typeof name === 'string' && name != '') {
    this.mods[name] = require(this.modPath + '/' + name);
  }
}

models.getModel = function(name) {
  if (this.mods && typeof name === 'string' && name != '') {
    if (typeof this.mods[name] !== 'undefined')
      return this.mods[name];
  }
  return null;
}

models.isModel = function(name) {
  if (this.mods && typeof name === 'string' && name != '') {
    return (typeof this.mods[name] !== 'undefined');
  }
  return false;
}

models.isModelFunction = function(model, name) {
  if (this.mods && typeof name === 'string' && name != '') {
    var m = this.getModel(model);
    return (typeof m === 'object' && typeof m[name] === 'function');
  }
  return false;
}
