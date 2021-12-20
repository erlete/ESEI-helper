// Dependencies:

const axios = require("axios");
const fs = require("fs");
const url = require('url') // Encoded data tool for URL-params.

require('dotenv').config()


// Format functions:

/**Function that returns a formatted string with event data.*/
function eventStringify(event) { // TODO: add remaining time parameter.

	let output = '';

	if (event.course_category != '') {
		output += `\`\`\`Curso:\`\`\` ${event.course_category}\n\n` +
			`\`\`\`Módulo:\`\`\` ${event.course_name}\n\n`;
	}

	output += `\`\`\`Título:\`\`\` *${event.name.toUpperCase()}*\n\n` +
		`\`\`\`Descripción:\`\`\` ${event.description}\n\n` +
		`\`\`\`Fecha de entrega:\`\`\` ${event.date.toLocaleString('en-GB', { timeZone: 'UTC' })}\n\n` +
		`\`\`\`URL:\`\`\` ${event.url}`;

	return output;
}

/**Function that returns an object containing the time difference between two EPOCH dates.*/
function format_difference(date1, date2) {

	let diff = Math.abs(date1 - date2); // Returns the ms difference.
	days = diff / 86400000;
	hours = days % 1 * 24;
	minutes = hours % 1 * 60;
	seconds = minutes % 1 * 60;

	return {
		days: Math.floor(days),
		hours: Math.floor(hours),
		minutes: Math.floor(minutes),
		seconds: Math.floor(seconds)
	}
}


// WebService Authentication:

/**Function that initializes the token with default .env credentials.
 * Allows automatic ws_token variable definition (with no additional .env parameters).*/
async function initToken() {

	ws_token = await getWsToken(process.env.MOOVI_USERNAME, process.env.MOOVI_PASSWORD)
	return true;
}

/**Function that gets a Moodle webService token from an username and password.*/
async function getWsToken(username, password) {

	return (await axios.post('https://moovi.uvigo.gal/login/token.php', {}, {
		params: {
			username: username,
			password: password,
			service: 'moodle_mobile_app'
		}
	})).data.token;

}


// Content processing:

/**CAUTION THIS A GENERAL MOODLE WEBSERVICE REQUEST, READ:
 * Standard webService request to allow cleaner code, takes two parameters:
 * ws_function: String 	(Requested content's Moodle identifier)
 * req_params: Object	(Object containing all further data required, which is sent to the server)
 * Example:
 * ws_function = 'core_calendar_get_calendar_monthly_view' // Monthly calendar function name.
 * req_params = {	year : 2021	, month : 12	} // Data required to fetch calendar's info.*/
async function wsRequest(ws_function, req_params) {

	if (typeof ws_token === 'undefined') {
		await initToken()
	}
	return (await axios.post('https://moovi.uvigo.gal/webservice/rest/server.php', new url.URLSearchParams({
		...req_params,
		wsfunction: ws_function,
		wstoken: ws_token,
	}).toString(), {
		params: {
			moodlewsrestformat: 'json',
		}
	})).data
}

/**Function that requests Moodle's calendar data for the next two months.*/
async function getCalendarData(c_year = new Date(Date.now()).getFullYear(), c_month = new Date(Date.now()).getMonth() + 1) {

	let current_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: c_year,
		month: c_month,
	})).weeks

	let next_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: c_month == 12 ? c_year + 1 : c_year,
		month: c_month == 12 ? 1 : c_month + 1
	})).weeks

	return current_month.concat(next_month);
}

/**Function that processes previously fetched calendar data.*/
async function getEvents(calendar_data) {
	return calendar_data.map(function (week) {
		return week.days
	}).flat().map(function (day) {
		return day.events
	}).flat().map(function (event) {
		return {
			name: event.name,
			description: (event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g) == null ? [] : event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g).filter(function (content) {
				return content.length > 0 ? content : null
			}).map(function (content) {
				return content.replace(/[\r\n]+/g, " ").trim()
			})).join(' ').replace(/(\s\.)+/g, "."),
			course_name: "course" in event ? event.course.fullnamedisplay : '',
			course_category: "course" in event ? event.course.coursecategory : '',
			date: new Date(event.timestart * 1000),
			url: event.url,
		}
	})
}

/**Function that processes previously fetched calendar data but only for upcoming events.*/
async function getUpcomingEvents(calendar_data) {
	return calendar_data.map(function (week) {
		return week.days
	}).flat().map(function (day) {
		return day.events
	}).flat().map(function (event) {
		return {
			name: event.name,
			description: (event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g) == null ? [] : event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g).filter(function (content) {
				return content.length > 0 ? content : null
			}).map(function (content) {
				return content.replace(/[\r\n]+/g, " ").trim()
			})).join(' ').replace(/(\s\.)+/g, "."),
			course_name: "course" in event ? event.course.fullnamedisplay : '',
			course_category: "course" in event ? event.course.coursecategory : '',
			date: new Date(event.timestart * 1000),
			url: event.url,
		}
	}).filter(function (event) {
		return event.date >= new Date(Date.now()) ? event : null
	})
}


// Module export:

module.exports = {
	eventStringify,
	format_difference,
	getWsToken,
	initToken,
	wsRequest,
	getCalendarData,
	getEvents,
	getUpcomingEvents
}
