const {google} = require('googleapis');
const googleClient = require('./auth/googleAuth');
const dateUtil = require('./dateUtil');
const BOT_NAME = '@meetassist';
var GoogleContacts = require('google-contacts').GoogleContacts;
var validator = require('validator');
var request = require('request');

var GoogleService = {
  isAuthorizedUser: function (userId, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        callback(false);
      } else {
        callback(true);
      }
    });
  },

  listEvents: function (userId, from, to, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        if (!from) {
          from = new Date();
        }
        var fromDate = new Date(from);
        fromDate.setUTCHours(0, 0, 0);

        if (!to) {
          to = new Date(fromDate.getTime());
        }
        var toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59);

        listCalendarEvents('primary', fromDate, toDate, oauthToken, function (events) {
          callback(prepareCalendarMarkup(events));
        });
      }
    });
  },

  validateAuthCode: function (userId, code, callback) {
    googleClient.createAndStoreAuthToken(userId, code, function (result) {
      callback(result);
    });
  },

  createEvent: function (event, callback) {
    googleClient.getUserOAuthClient(event.userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        createEvent(event, oauthToken, function (result) {
          callback(result);
        });
      }
    });
  },

  showFreeSlots: function (userId, day, time, duration, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        showFreeSlots(null, oauthToken, day, time, duration, function (result) {
          callback(result);
        });
      }
    });
  },

  findContacts: function (userId, names, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        findContacts(names, oauthToken, function (result) {
          callback(result);
        });
      }
    });
  },

  askUserForAuthentication: function (callback) {
    askUserToAuthenticate(callback);
  },

  listCalendars: function (userId, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        listCalendars(oauthToken, function (calendars) {
          callback(calendars);
        });
      }
    });
  },

  fetchAllTheRooms: function (userId, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        fetchAllTheRooms(oauthToken, function (rooms) {
          callback(rooms);
        });
      }
    });
  },

  searchMeetingRooms: function (name, day, time, userId, callback) {
    googleClient.getUserOAuthClient(userId, function (oauthToken) {
      if (!oauthToken || oauthToken === 'NOAUTH') {
        askUserToAuthenticate(callback);
      } else {
        searchMeetingRooms(name, day, time, oauthToken, function (rooms) {
          callback(rooms);
        });
      }
    });
  },

  saveTokens: function (userId, token, callback) {
    googleClient.storeToken(userId, token, function (result) {
      callback(result);
    });
  }
};

function askUserToAuthenticate(callback) {
  googleClient.getOAuthUrl(function (oauthUrl) {
    var message = 'You are not authorized yet. Visit <' + oauthUrl + '|this URL> in the browser.';
    message = message + '  Copy the authorization code and ask me to verify/validate the token.';
    callback(message);
  });
}

var showFreeSlots = function (resource, auth, day, time, duration, callback) {
  var calendar = google.calendar('v3');
  var start = dateUtil.addTimeToDate(day, time);
  var startDate = start.format();

  var end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);
  var endDate = dateUtil.convertDate(end);

  console.log('FreeBusy: start - ' + startDate + ', end - ' + endDate);

  if (!resource) {
    resource = 'primary';
  }

  var criteria = {
    auth: auth,
    resource: {
      items: [{"id": resource}],
      timeMin: dateUtil.convertToRFC3339(startDate),
      timeMax: dateUtil.convertToRFC3339(endDate)
    }
  };

  calendar.freebusy.query(criteria, function (error, response) {
    callback(response.data);
  });
};

var listCalendars = function (auth, callback) {
  var calendar = google.calendar('v3');

  var criteria = {
    auth: auth,
    showHidden: true
  };

  calendar.calendarList.list(criteria, function (err, response) {
    if (err) {
      callback('Could not list the calendar events.');
    }

    console.log(response.data);
    callback('find calendars');
  });
};

var findContacts = function (searchQuery, oauthToken, callback) {
  var contactApi = new GoogleContacts({
    token: oauthToken.credentials.access_token
  });

  contactApi.getContacts(function (error, data) {
    if (error) {
      callback([]);
    } else {
      callback(searchContacts(searchQuery, data));
    }
  });
};

var searchContacts = function (searchQuery, contacts) {
  var emails = [];
  if (!searchQuery) {
    return emails;
  }

  var searchTerms = searchQuery.split(',');

  if (contacts && contacts.length > 0) {
    contacts.forEach(function (contact) {
      if (contact.email && contact.name) {
        if (searchTerms && searchTerms.length) {
          searchTerms.forEach(function (term) {
            term = term.replace(/\s/g, '');
            if (validator.isEmail(term) || (contact.name.indexOf(term) > -1 || contact.email.indexOf(term) > -1)) {
              emails.push(contact.email);
            }
          });
        }
      }
    });
  }

  return emails;
};

var listCalendarEvents = function (calendarId, from, to, auth, callback) {
  var calendar = google.calendar('v3');

  //console.log(from);
  //console.log(to);

  var criteria = {
    auth: auth,
    calendarId: calendarId,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: dateUtil.convertToRFC3339(from),
    timeMax: dateUtil.convertToRFC3339(to),
    //timeZone: 'Asia/Kolkata'
  };

  //console.log(criteria);

  calendar.events.list(criteria, function (err, response) {
    if (err) {
      callback('Could not list the calendar events.');
    }

    var events = response.data.items;
    if (events.length == 0) {
      callback(events);
    } else {
      var eventDetails = '';
      var eventData = [];

      events.forEach(function (event) {
        console.log(event);
        var attendees = [];
        if (event.attendees) {
          event.attendees.forEach(function (attendee) {
            if (!attendee.resource && !attendee.self) {
              attendees.push(attendee.displayName + ' <' + attendee.email + '>');
            }
          });
        }

        var data = {
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          organizer: event.organizer.displayName,
          start: event.start.dateTime,
          end: event.end.dateTime,
          attendees: attendees
        };

        var start = event.start.dateTime || event.start.date;
        eventDetails = eventDetails + start + ' - ' + event.summary;
        eventData.push(data);
      });
      callback(eventData);
    }
  });
};

var createEvent = function (eventDetails, auth, callback) {
  console.log(JSON.stringify(eventDetails.currentIntent));
  const day = eventDetails.currentIntent.slots.MeetingDate;
  const time = eventDetails.currentIntent.slots.MeetingTime;
  const title = eventDetails.currentIntent.slots.MeetingTitle;
  const room = eventDetails.currentIntent.slots.MeetingRoom;

  // duration is in minutes
  var duration = eventDetails.currentIntent.slots.MeetingDuration;

  duration = dateUtil.format8601DurationToMinutes(duration);
  if (!duration) {
    duration = 60;
  }

  console.log('Meeting request: title - ' + title + ', day - ' + day + ', time - ' + time + ', for ' + duration
      + ' minutes in room - ' + room);

  var start = dateUtil.addTimeToDate(day, time);
  var startDate = start.format();

  var end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);
  var endDate = dateUtil.convertDate(end);
  var timezone = 'Asia/Kolkata';

  var attendees = [];
  if (room) {
    console.log('search by ' + room);
    searchRoom(room, day, time, duration, auth, function (rooms) {
      console.log(rooms);
      if (rooms && rooms.length > 0) {
        rooms.forEach(function (room) {
          var resource = {
            email: room.mid,
            displayName: room.name,
            resource: true,
            responseStatus: 'accepted'
          };
          attendees.push(resource);
        });
      }
    });
  }

  setTimeout(function () {
    var calendarEvent = new Object();
    calendarEvent.summary = title;
    //calendarEvent.location = location;
    calendarEvent.start = {
      'dateTime': startDate,
      'timeZone': timezone
    };
    calendarEvent.end = {
      'dateTime': endDate,
      'timeZone': timezone
    };
    calendarEvent.attendees = attendees;
    calendarEvent.sendNotifications = true;
    calendarEvent.guestsCanSeeOtherGuests = true;

    console.log('Calendar event input are : ' + JSON.stringify(calendarEvent));

    var calendar = google.calendar('v3');

    calendar.events.insert({
      auth: auth,
      calendarId: 'primary',
      resource: calendarEvent,
    }, function (err, event) {
      if (err) {
        console.log('Could not create event - ' + err);
        callback('Sorry! Could not create the meeting - ' + err);
      } else {
        callback(event.data);
      }
    });
  }, 3000);
};

var prepareCalendarMarkup = function (events) {
  var html = '<table style="width:100%">'
      + '  <tr>'
      + '    <th>Title</th>'
      + '    <th>Start</th>'
      + '    <th>End</th>'
      + '    <th>Location</th>'
      + '  </tr>';

  var data = '';
  if (events && events.length > 0) {
    events.forEach(function (event) {
      /*html += '<tr>'
          + '    <td>' + event.summary + '</td>'
          + '    <td>' + event.start + '</td>'
          + '    <td>' + event.end + '</td>'
          + '    <td>' + event.location + '</td>'
          + '  </tr>';*/

      data += event.summary + ' from ' + dateUtil.formatDateToDisplay(event.start) + ' to '
          + dateUtil.formatDateToDisplay(event.end) + (event.location ? ', Location - ' + event.location : '') + '\n';
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

var fetchAllTheRooms = function (oauthToken, callback) {
  var service = google.admin('directory_v1');
  service.resources.calendars.list({
    auth: oauthToken,
    customer: 'my_customer',
    //query: 'name=*Lords*'
  }, function (err, response) {
    if (err) {
      console.log(err);
      callback('Could not find meeting rooms.');
    } else {
      var meetingRooms = [];
      if (response.data && response.data.items.length > 0) {
        response.data.items.forEach(function (room) {
          var meetingRoom = {
            mid: room.resourceEmail,
            name: room.resourceName
          };
          meetingRooms.push(meetingRoom);
        });
      }
      callback(meetingRooms);
    }
  });
};

var searchMeetingRooms = function (name, day, time, oauthToken, callback) {
  const defaultDuration = 60;

  if (!day) {
    day = dateUtil.now();
  }

  var startDate = dateUtil.addTimeToDate(day, time);
  var toDate = startDate.clone();
  toDate = dateUtil.addMinutesToDate(toDate, defaultDuration);
  var availableRooms = [];

  console.log('searching free rooms at ' + startDate.format());

  fetchAllTheRooms(oauthToken, function (rooms) {
    if (rooms && rooms.length > 0) {
      rooms.forEach(function (room) {
        if (name && room.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
          if (!isRoomBusy(room.mid, startDate, toDate, oauthToken)) {
            room.name = room.name.split('(')[0].trim();
            availableRooms.push(room);
          }
        } else if (!name) {
          if (!isRoomBusy(room.mid, startDate, toDate, oauthToken)) {
            room.name = room.name.split('(')[0].trim();
            availableRooms.push(room);
          }
        }
      });
    }
    callback(availableRooms);
  });
};

var searchRoom = function (name, day, time, duration, oauthToken, callback) {
  if (!day) {
    day = dateUtil.now();
  }

  if (!duration) {
    duration = 60;
  }

  var startDate = dateUtil.addTimeToDate(day, time);
  var toDate = startDate.clone();
  toDate = dateUtil.addMinutesToDate(toDate, duration);
  var availableRooms = [];

  fetchAllTheRooms(oauthToken, function (rooms) {
    if (rooms && rooms.length > 0) {
      rooms.forEach(function (room) {
        if (name && room.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
          if (!isRoomBusy(room.mid, startDate, toDate, oauthToken)) {
            availableRooms.push(room);
          }
        } else if (!name) {
          if (!isRoomBusy(room.mid, startDate, toDate, oauthToken)) {
            availableRooms.push(room);
          }
        }
      });
    }
    callback(availableRooms);
  });
};

var isBusy = function (resource, auth, day, time, duration) {

  /*if (!isBusy(room.mid, oauthToken, day, time, defaultDuration)) {
    room.name = room.name.split('(')[0].trim();
    availableRooms.push(room);
  }*/

  showFreeSlots(resource, auth, day, time, duration, function (events) {
    if (!events || events.length <= 0) {
      return false;
    } else {
      return true;
    }
  });
};

var isRoomBusy = function (roomResourceEmail, from, to, oauthToken) {
  listCalendarEvents(roomResourceEmail, from, to, oauthToken, function (events) {
    if (!events || events.length <= 0) {
      return false;
    } else {
      return true;
    }
  });
};

module.exports = GoogleService;