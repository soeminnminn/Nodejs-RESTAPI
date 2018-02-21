/**
 * Model user
 */

var user = module.exports = {};

user.get = function(args, cb) {
  var result = {};
  for(var i in args) {
    if (i == '_holder') continue;
    var type = typeof args[i];
    if (!!~['string', 'number', 'boolean', 'object'].indexOf(type)) {
      result[i] = {
        'type': type,
        'value': JSON.stringify(args[i])
      };
    } else {
      result[i] = {
        'type': type
      };
    }
  }
  cb(0, result);

  // var query = "SELECT `user`.* FROM `user`";
  // if (args.id) {
  //   query += "WHERE `id` = " + args.id;
  // }
  // args.getDatabase().raw(query)
  //   .then(function(result) {
  //     cb(0, { 'user': result[0] });
  //   }).catch(function(err){
  //     cb(err, {});
  //   });
};