const credentials = {
  accessKeyId: process.env.DYNAMO_ACCESS_KEY,
  secretAccessKey: process.env.DYNAMO_SECRET_KEY
};

const dynasty = require('dynasty')(credentials);

var users = dynasty.table('users');

var UserRepo = {
  findById: function (userId, callback) {
    users.find({hash : userId})
    .then(function (value) {
      callback(value);
    })
    .catch(function (reason) {
      console.log('Could not find user by id - ' + userId + '. reason - ' + reason);
      callback(null);
    });
  },

  save: function (user, callback) {
    users.insert(user)
    .then(function (value) {
      callback(value);
    })
    .catch(function (reason) {
      console.log('Could not save user. reason - ' + reason);
      callback(null);
    });
  }
};

module.exports = UserRepo;