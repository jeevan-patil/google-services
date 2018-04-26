var moment = require('moment');
const IST_TZ = "Asia/Kolkata";
const DATE_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss';
const IST_TZ_TIME = "05:30";

var DateUtil = {
  defaultTimezone: function () {
    return IST_TZ;
  },

  convertToRFC3339: function (date) {
    if (date) {
      var formatted = moment(date).format();
      var tz = formatted.split("+");
      if (tz.length > 1) {
        formatted = tz[0] + "+" + IST_TZ_TIME;
      }
      return formatted;
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
    var d = moment(date).format(DATE_FORMAT);
    return d;
  },

  now: function () {
    return moment(new Date()).format("YYYY-MM-DD");
  },

  addMinutesToDate: function (date, minutes) {
    return date.add(minutes, 'minutes');
  },

  formatWithTimezone: function (date) {
    return date.format(DATE_FORMAT);
  },

  prepareDate: function (date, time) {
    return date + "T" + time + ":00"
  },

  testZone: function (date) {
    console.log(moment(date).utcOffset(300));
  },

  addMinutesAndReturnStringDate: function (strDate, minutes) {
    var start = moment(strDate);
    var end = start.clone();
    end = this.addMinutesToDate(end, minutes);
    end = end.format(DATE_FORMAT);
    return "" + end;
  }
};

module.exports = DateUtil;