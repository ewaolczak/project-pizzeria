import { classNames, select, settings, templates } from '../settings.js';
import { utils } from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getDate();

    thisBooking.selectedTable = '';
  }

  getDate() {
    const thisBooking = this;

    const startDateParam =
      settings.db.dateStartParamKey +
      '=' +
      utils.dateToStr(thisBooking.DatePicker.minDate);
    const endDateParam =
      settings.db.dateEndParamKey +
      '=' +
      utils.dateToStr(thisBooking.DatePicker.maxDate);

    const params = {
      bookings: [startDateParam, endDateParam],
      eventsCurrent: [settings.db.notRepeatParam, startDateParam, endDateParam],
      eventsRepeat: [settings.db.repeatParam, endDateParam]
    };

    // console.log('getData params:', params);

    const urls = {
      bookings:
        settings.db.url +
        '/' +
        settings.db.bookings +
        '?' +
        params.bookings.join('&'),
      eventsCurrent:
        settings.db.url +
        '/' +
        settings.db.events +
        '?' +
        params.eventsCurrent.join('&'),
      eventsRepeat:
        settings.db.url +
        '/' +
        settings.db.events +
        '?' +
        params.eventsRepeat.join('&')
    };

    // console.log('getData urls:', urls);

    Promise.all([
      fetch(urls.bookings),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat)
    ])
      .then(function (allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json()
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        // console.log(bookings);
        // console.log(eventsCurrent);
        // console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.DatePicker.minDate;
    const maxDate = thisBooking.DatePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (
          let loopDate = minDate;
          loopDate <= maxDate;
          loopDate = utils.addDays(loopDate, 1)
        ) {
          thisBooking.makeBooked(
            utils.dateToStr(loopDate),
            item.hour,
            item.duration,
            item.table
          );
        }
      }
    }

    // console.log('thisBooking.booked:', thisBooking.booked);

    thisBooking.updateDOM();
  }

  selectTable(clickedElement) {
    const thisBooking = this;
    const tableId = clickedElement.getAttribute('data-table');
    const isTable = tableId && clickedElement.classList.value.includes('table');
    console.log(isTable);

    const isTableBooked = clickedElement.classList.value.includes('booked');
    const isTableSelected = clickedElement.classList.value.includes(
      classNames.booking.selected
    );

    if (isTable && !isTableBooked) {
      if (isTableSelected) {
        thisBooking.unselectTables();
        thisBooking.selectedTable = '';
      } else {
        thisBooking.unselectTables();
        console.log('select');
        clickedElement.classList.add(classNames.booking.selected);
        thisBooking.selectedTable = tableId;
      }
    }
  }

  unselectTables() {
    const thisBooking = this;

    for (let table of thisBooking.dom.tables) {
      table.classList.remove(classNames.booking.selected);
    }
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (
      let hourBlock = startHour;
      hourBlock < startHour + duration;
      hourBlock += 0.5
    ) {
      // console.log('loop:', hourBlock);

      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.unselectTables();

    thisBooking.date = thisBooking.DatePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.HourPicker.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] ==
        'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  render(element) {
    const thisBooking = this;
    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.peopleAmount
    );
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.hoursAmount
    );
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.datePicker.wrapper
    );
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.hourPicker.wrapper
    );
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.tables
    );
    thisBooking.dom.tablesDiv = thisBooking.dom.wrapper.querySelector(
      select.containerOf.floorPlan
    );
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(
      select.booking.bookingSubmit
    );
    thisBooking.dom.startersCheckboxes =
      thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(
      select.booking.phone
    );
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(
      select.booking.address
    );
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmountWidget = new AmountWidget(
      thisBooking.dom.peopleAmount
    );
    // thisBooking.dom.peopleAmount.addEventListener('updated', function () {});
    thisBooking.hourAmountWidget = new AmountWidget(
      thisBooking.dom.hoursAmount
    );
    // thisBooking.dom.hoursAmount.addEventListener('updated', function () {});
    thisBooking.DatePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.HourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });

    thisBooking.dom.tablesDiv.addEventListener('click', function (event) {
      thisBooking.selectTable(event.target);
    });

    thisBooking.dom.wrapper.addEventListener('click', function (event) {
      if (event.target.type == 'checkbox' && event.target.name == 'starter') {
        console.log(event.target.value);
        thisBooking.starters = [];

        if (event.target.checked == true) {
          if (event.target.value == 'water') {
            thisBooking.starters.push('water');
          }
          if (event.target.value == 'bread') {
            thisBooking.starters.push('water', 'bread');
          }
        }
        // else {
        //   thisBooking.starters = [];
        // }
      }
    });

    thisBooking.dom.form.addEventListener('submit', function (event) {
      event.preventDefault();
      thisBooking.sendBooking();
    });
  }

  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.bookings;

    console.log(thisBooking);

    const payload = {
      date: thisBooking.date,
      hour: thisBooking.hour,
      table: parseInt(thisBooking.selectedTable),
      duration: parseInt(thisBooking.hourAmountWidget.correctValue),
      ppl: parseInt(thisBooking.peopleAmountWidget.correctValue),
      starters: thisBooking.starters,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value
    };
    console.log('payload', payload);
    console.log(url);
  }
}

export default Booking;
