var UserUtil = {
  getBotUserId: function (event, callback) {
    if (event && event.userId) {
      const userId = event.userId;

      if (userId.indexOf(':') > -1) {
        const tokenized = userId.split(':');

        if (tokenized) {
          callback((tokenized.length === 3) ? (tokenized[1] + '-' + tokenized[2]) : (tokenized[tokenized.length - 1]));
        }
      } else {
        callback(userId);
      }
    }
  },

  getCommandUserId: function (event, callback) {
    if (event && event.body) {
      const user = event.body;
      callback(user.team_id + '-' + user.user_id);
    }
  }
};

module.exports = UserUtil;