var fs = require('fs');
var {google} = require('googleapis');
const userRepo = require('../db/users');
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly'];

var config = require('./client_secret_gcal-bot.json');

var GoogleClient = {
  getOAuthUrl: function (callback) {
    getOAuthUrl(function (oauthUrl) {
      callback(oauthUrl);
    })
  },

  getUserOAuthClient: function (userId, callback) {
    getOAuthClient(function (oauthClient) {
      userRepo.findById(userId, function (result) {
        if (!result) {
          console.log('User has not given access to the google services.');
          callback('NOAUTH');
        } else {
          oauthClient.credentials = result.token;
          callback(oauthClient);
        }
      });
    });
  },

  createAndStoreAuthToken: function (userId, code, callback) {
    console.log('verifying token - ' + code);
    getOAuthClient(function (oauthClient) {
      oauthClient.getToken(code, function (err, token) {
        if (err) {
          callback('Sorry. Could not verify the code.');
        } else {
          storeToken(userId, token);
          callback('Thank you. Account has been verified successfully.');
        }
      });
    });
  },

  storeToken: function (userId, token, callback) {
    storeToken(userId, token);
    callback('Thank you. Account has been verified successfully.');
  }
};

var getOAuthUrl = function (callback) {
  getOAuthClient(function (oauthClient) {
    var authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    callback(authUrl);
  });
};

var getOAuthClient = function (callback) {
  getSuperCredentials(function (credentials) {
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
    callback(oauth2Client);
  });
};

var getSuperCredentials = function (callback) {
  callback(config);
};

var storeToken = function (userId, token) {
  var user = {
    'id': userId,
    'token': token
  };

  userRepo.save(user, function (result) {
    if (result) {
      console.log('user has been saved. ' + JSON.stringify(result));
    } else {
      console.log('Failed to store the user.');
    }
  });
};

module.exports = GoogleClient;