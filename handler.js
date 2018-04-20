'use strict';

const googleService = require('./module/googleService');
const userUtil = require('./module/userUtil');
const dateUtil = require('./module/dateUtil');

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message, responseCard) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ElicitSlot',
      intentName,
      slots,
      slotToElicit,
      message,
      responseCard,
    },
  };
}

function confirmIntent(sessionAttributes, intentName, slots, message, responseCard) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ConfirmIntent',
      intentName,
      slots,
      message,
      responseCard,
    },
  };
}

function close(sessionAttributes, fulfillmentState, message, responseCard) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Close',
      fulfillmentState,
      message,
      responseCard,
    },
  };
}

function delegate(sessionAttributes, slots) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Delegate',
      slots,
    },
  };
}

function buildMessage(message) {
  return {
    contentType: 'PlainText',
    content: message,
  };
}

function buildResponseCard(title, subTitle, options) {
  let buttons = null;
  if (options !== null) {
    buttons = [];
    for (let i = 0; i < options.length; i++) {
      buttons.push(options[i]);
    }
  }
  return {
    contentType: 'application/vnd.amazonaws.card.generic',
    version: 1,
    genericAttachments: [{
      title,
      subTitle,
      buttons,
    }],
  };
}

function buildResponseOptions(optionsArray) {
  var responseOptions = [];
  for (var i = 0; i < optionsArray.length; i++) {
    var temp = {
      "text": optionsArray[i],
      "value": optionsArray[i]
    }
    responseOptions.push(temp);
  }
  return responseOptions;
}

var prepareCalendarMarkup = function (events) {
  var html = '<table style="width:100%">'
      + '  <tr>'
      + '    <th>Title</th>'
      + '    <th>Start</th>'
      + '    <th>End</th>'
      + '    <th>Location</th>'
      + '  </tr>';

  var data = '';
  if (events) {
    events.forEach(function (event) {
      /*html += '<tr>'
          + '    <td>' + event.summary + '</td>'
          + '    <td>' + event.start + '</td>'
          + '    <td>' + event.end + '</td>'
          + '    <td>' + event.location + '</td>'
          + '  </tr>';*/

      data += event.summary + ' from ' + event.summary + ' to ' + event.end + '. Location - ' + event.location + '\n';
    });
  } else {
    /*html += '<tr>'
        + '    <td>No events found</td>'
        + '  </tr>';*/
    data += 'No events found';
  }

  html += '</table>';
  return data;
};

module.exports.listCalendarEvents = (event, context, callback) => {
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      const from = event.currentIntent.slots.EventDate;
      const to = null;

      console.info('User ' + userId + ' is asking for events from ' + from);

      googleService.listEvents(userId, from, to, function (data) {
        callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(data)));
      });
    }
  });
};

module.exports.validateAuthCode = (event, context, callback) => {
  const outputSessionAttributes = event.sessionAttributes || {};
  console.log(event.currentIntent);
  const token = event.currentIntent.slots.AccountToken;

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      googleService.validateAuthCode(userId, token, function (result) {
        callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(result)));
      });
    }
  });
};

module.exports.createEvent = (event, context, callback) => {
  console.log('createEvent input - ' + JSON.stringify(event));
  const outputSessionAttributes = event.sessionAttributes || {};

  console.log('outputSessionAttributes ' + outputSessionAttributes);

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      event.userId = userId;
      const source = event.invocationSource;
      const slots = event.currentIntent.slots;

      googleService.createEvent(event, function (result) {
        if (result && result.status === 'confirmed') {
          callback(null, close(outputSessionAttributes, 'Fulfilled',
              buildMessage('Meeting with title - ' + result.summary + ' has been created.')));
        } else {
          callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(result)));
        }
      });
    }
  });
};

module.exports.showFreeSlots = (event, context, callback) => {
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      const from = event.currentIntent.slots.DateFrom;

      //googleService.showFreeSlots(userId, from, function (result) {
      callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage('Not implemented yet.')));
      //});
    }
  });
};

module.exports.findEventParticipants = (event, context, callback) => {
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      const participants = event.currentIntent.slots.participants;

      googleService.findContacts(userId, participants, function (result) {
        callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(result)));
      });
    }
  });
};

module.exports.greetUser = (event, context, callback) => {
  console.log('event object: ' + JSON.stringify(event));
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      googleService.isAuthorizedUser(userId, function (authorized) {
        if (authorized) {
          var message = 'Hello! This is your meeting assistant. You can ask me your schedule, to create new meetings '
              + 'etc. How may I help you now?';
          callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
        } else {
          googleService.askUserForAuthentication(function (message) {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          });
        }
      });
    }
  });
};

module.exports.thankUser = (event, context, callback) => {
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      googleService.isAuthorizedUser(userId, function (authorized) {
        if (authorized) {
          var message = 'Thanks! It is my pleasure.';
          callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          /*googleService.searchMeetingRooms('', '2018-04-16', '19:00', userId, function (message) {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          });*/
        } else {
          googleService.askUserForAuthentication(function (message) {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          });
        }
      });
    }
  });
};

module.exports.searchFreeRooms = (event, context, callback) => {
  console.log(JSON.stringify(event));
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      googleService.isAuthorizedUser(userId, function (authorized) {
        if (authorized) {
          const day = event.currentIntent.slots.OnDate;
          const time = event.currentIntent.slots.OnTime;

          googleService.searchMeetingRooms(null, day, time, userId, function (rooms) {
            if (rooms && rooms.length > 0) {
              var names = [];
              rooms.forEach(function (room) {
                names.push(room.name);
              });
              callback(null, close(outputSessionAttributes, 'Fulfilled',
                  buildMessage('These are the available rooms. ' + names.join(', '))));
            } else {
              callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage('No rooms are available.')));
            }
          });
        } else {
          googleService.askUserForAuthentication(function (message) {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          });
        }
      });
    }
  });
};

module.exports.authenticateUser = (event, context, callback) => {
  console.log('authenticateUser event ' + JSON.stringify(event));

  var response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    }
  };

  const body = JSON.parse(event.body);
  const token = body.token;
  const uid = body.uid;
  event.userId = uid;

  if (!token || !uid) {
    callback(null, buildLambdaResponseCard(400, 'Token and UserId are mandatory.'));
  } else {
    userUtil.getBotUserId(event, function (userId) {
      if (!userId) {
        callback(null, buildLambdaResponseCard(400, 'Could not recognize the user identity.'));
      } else {
        googleService.saveTokens(userId, token, function (result) {
          response.body = result;
          callback(null, response);
        });
      }
    });
  }
};

function unauthorizedUser(callback) {
  callback(null,
      close({}, 'Fulfilled', buildMessage('Could not recognize the user identity.')));
}

function buildLambdaResponseCard(statusCode, response) {
  return {
    "statusCode": statusCode,
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify(response)
  };
}