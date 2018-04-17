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
    for (let i = 0; i < Math.min(5, options.length); i++) {
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

function buildResponseOptions(optionsArray){
  var responseOptions = [];
  for(var i=0; i<optionsArray.length; i++){
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
  const outputSessionAttributes = event.sessionAttributes || {};

  userUtil.getBotUserId(event, function (userId) {
    if (!userId) {
      unauthorizedUser(callback);
    } else {
      event.userId = userId;
      const source = event.invocationSource;
      const slots = event.currentIntent.slots;

      if (source === 'DialogCodeHook') {
        //https://stackoverflow.com/questions/32041605/how-do-i-troubleshoot-freebusy-google-calendar-nodejs-api?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
        const todayMenuBeverageType = {
          'mocha':{'size': ['short', 'small', 'medium', 'large']},
          'chai':{'size': ['small', 'short']}
        };
        var menuItem = buildResponseOptions(Object.keys(todayMenuBeverageType));

        // this section will be run for initialization and validation
        callback(null, elicitSlot(outputSessionAttributes, event.currentIntent.name, slots, 'MeetingTime',
            buildMessage('Sorry, but we can only do a mocha or a chai. What kind of beverage would you like?'),
            buildResponseCard("Menu", "Today's Menu", menuItem)));
      } else {
        googleService.createEvent(event, function (result) {
          if (result && result.status === 'confirmed') {
            callback(null, close(outputSessionAttributes, 'Fulfilled',
                buildMessage('Meeting with title - ' + result.summary + ' has been created.')));
          } else {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(result)));
          }
        });
      }
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
          //callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
          googleService.searchMeetingRooms('', '2018-04-16', '19:00', userId, function (message) {
            callback(null, close(outputSessionAttributes, 'Fulfilled', buildMessage(message)));
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

function unauthorizedUser(callback) {
  callback(null,
      close({}, 'Fulfilled', buildMessage('Could not recognize the user identity.')));
}