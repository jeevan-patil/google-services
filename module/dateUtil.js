var moment = require('moment');

var DateUtil = {
  convertToRFC3339: function (date) {
    if (date) {
      return moment(date).format();
    }
    return null;
  },

  formatDateToDisplay: function (date) {
    if (date) {
      try {
        return '<\!date^' + new Date(date).getTime() / 1000 + '^{date_long} at {time}|DATE>';
      } catch (e) {
        console.log(e);
        console.log('Error while formatting display date.');
        return '';
      }
    }

    return '';
  },

  format8601DurationToMinutes: function (duration) {
    try {
      return moment.duration(duration).asMinutes();
    } catch (e) {
      console.log('Error while formatting 8601 duration.', e);
      return null;
    }
  },

  addTimeToDate: function (date, time) {
    var dateTime = moment(date + " " + time);
    return dateTime;
  },

  convertDate: function (date) {
    var d = moment(date).format();
    return d;
  },

  now: function () {
    return moment(new Date()).format("YYYY-MM-DD");
  },

  addMinutesToDate: function (date, minutes) {
    return date.add(minutes, 'minutes');
  },

  formatWithTimezone: function (date) {
    return date.tz('Asia/Kolkata').format();
  },
};

module.exports = DateUtil;