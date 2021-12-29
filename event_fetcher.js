// Remote modules:
const fs = require('fs')

// Local modules:
const auth = require('./auth')
const { logger } = require('./aux')

// Constants and variables:
let EVENTS = './events.json'


/**Requests Moodle's calendar data for the next two months.*/
async function getCalendarData(token) {
	let c_year = new Date(Date.now()).getFullYear()
	let c_month = new Date(Date.now()).getMonth() + 1

	let current_month = (await auth.wsRequest(token, 'core_calendar_get_calendar_monthly_view', {
		year: c_year,
		month: c_month
	})).weeks;

	let next_month = (await auth.wsRequest(token, 'core_calendar_get_calendar_monthly_view', {
		year: c_month == 12 ? c_year + 1 : c_year,
		month: c_month == 12 ? 1 : c_month + 1
	})).weeks;

	return current_month.concat(next_month)
}


/**Processes fetched calendar data for upcoming events.*/
async function getEvents(weeks) {
	return weeks.map(week => week.days).flat().map(day => day.events).flat().map(event => ({
		id: event.id,
		name: event.name,
		description: formatDescription(event),
		location: event.location,
		course_id: event.normalisedeventtype == 'course' ? event.course.id : '',
		course_name: event.normalisedeventtype == "course" ? event.course.fullnamedisplay : '',
		course_category: event.normalisedeventtype == "course" ? event.course.coursecategory : '',
		date: (event.timestart + 3600) * 1000, // Hourly delay compensation.
		url: event.url
	})).filter(event => event.date >= new Date(Date.now()) ? event : null)
}


/**Formats an event's description.*/
function formatDescription(event) {
	let match = event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g)

	if (match) {
		return match.filter(content => content.length > 0 ? content : null).map(
			content => content.replace(/[\r\n]+/g, ' ').trim()
		).join(' ').replace(/(\s\.)+/g, '.')
	}

	return ''
}


/**Updates a JSON database that contains every event.*/
async function updateEvents(degree, year) {
	let data = await getEvents(await getCalendarData(auth.TOKENS[degree][year]))
	let data_ids = data.map(event => `${event.id}`)
	let database = require(EVENTS)

	if (!Object.keys(database).includes(degree)) {
		database[degree] = {}
	}

	for (i = 1; i <= 4; i++) {
		database[degree][i] = database[degree][i] ? database[degree][i] : {}
	}

	let new_events = require(EVENTS)[degree][year]
	let old_events = {...new_events}

	// Include added entries:
	data.forEach(event => `${event.id}` in new_events ? null : new_events[event.id] = event)

	// Discard removed entries:
	Object.keys(old_events).forEach(event_id => data_ids.includes(event_id) ? null : delete new_events[event_id])

	database[degree][year] = new_events

	// Write output:
	if (JSON.stringify(new_events) != JSON.stringify(old_events)) {
		logger('Modified entries, saving data.')
		fs.writeFile(EVENTS, JSON.stringify(database), error => { if (error) { console.error(error) } })
	} else {
		logger('No modified entries, keeping original data.')
	}
}


/**Returns a formatted string with event data.*/
function eventStringify(event) {
	return ('' +
		`${event.course_category == '' ? '': `*Curso:* ${event.course_category}\n\n`}` +
		`${event.course_category == '' ? '': `*Módulo:* ${event.course_name}\n\n`}` +
		`*Fecha límite:* ${new Date(event.date).toLocaleString('en-GB', { timeZone: 'UTC' })}\n\n` +
		`${event.location == '' ? '' : `*Localización:* ${event.location}\n\n`}` +
		`${event.description == '' ? '' : `*Descripción:* _${event.description}_`}`
	)
}


/**Returns an object containing the time difference between two EPOCH dates.*/
function dateDifference(date1, date2) {

	let diff = Math.abs(date1 - date2) // Returns the ms difference.
	days = diff / 86400000
	hours = days % 1 * 24
	minutes = hours % 1 * 60
	seconds = minutes % 1 * 60

	return {
		days: Math.floor(days),
		hours: Math.floor(hours),
		minutes: Math.floor(minutes),
		seconds: Math.floor(seconds)
	}
}


module.exports = {
	EVENTS,

	getEvents,
	getCalendarData,
	updateEvents,

	eventStringify,
	dateDifference
}


// Quick test:

updateEvents("ESEI", 1)
updateEvents("EEAE", 2)
