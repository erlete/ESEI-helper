//Dependencies
const axios = require("axios"); // Requests module
const fs = require("fs");
require('dotenv').config()
/*
Import .env file for testing purposes (para que no tengamos que compartir la cuenta de moovi)
Se accede a las variables asi : process.env.MOOVI_USERNAME.
Te añadi un .env.example para que veas, quitale el .example y cambialo
*/
const url = require('url') //Module to allow sending forms data url-param encoded



// Constants:
const CURRENT_YEAR = new Date(Date.now()).getFullYear();
const CURRENT_MONTH = new Date(Date.now()).getMonth() + 1;
/** Estas dos variables no deberias ponerlas porque una vez creado el cliente
 * si se mantiene encendido mucho tiempo dejaran de ser correctas, las he cambiado
 * en la funcion que definiste tu para que se lean en ejecución y le cambie el nombre.
 */

let ws_token; //Definimos el token como variable global

// Helper functions:

function eventStringify(event) {
	/**Function to return a formatted string with event data*/

	return `Name: ${event.name.toUpperCase()}\nDescription: ${event.description}\nCourse name: ${event.course_name}\nCourse category: ${event.course_category}\nDate: ${event.date}\nURL: ${event.url}`
}

function format_difference(date1, date2) {
	/**Function to return an object with the time difference between two EPOCH dates*/

	let diff = Math.abs(date1 - date2); // Returns the ms difference.
	days = diff / 86400000
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



// WebService Authentication

async function initToken() {
	/**Function to initialize the token with .env default credentials
	 * Allows to define the ws_token variable without passing env variables each time*/

	ws_token = await getWsToken(process.env.MOOVI_USERNAME, process.env.MOOVI_PASSWORD)
	return true;
}
async function getWsToken(username, password) {
	/**Function that gets a Moodle webService token from an username and password*/

	return (await axios.post('https://moovi.uvigo.gal/login/token.php', {}, {
		params: {
			username: username,
			password: password,
			service: 'moodle_mobile_app'
		}
	})).data.token;

}



// 1. Content retrieval:

async function wsRequest(ws_function, req_params) {
	/**CAUTION THIS A GENERAL MOODLE WEBSERVICE REQUEST, READ :
	 * Standard webService request to allow cleaner code, takes two parameters:
	 * ws_function: String 	(Moodle name of the content requested)
	 * req_params: Object	(Object containing all further data needed sent to the server)
	 * Example:
	 * ws_function = 'core_calendar_get_calendar_monthly_view' //Monthly calendar function name
	 * req_params = {	year : 2021	, month : 12	} //Data needed to obtain the calendar info
	 */
	if (!ws_token) {
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


async function getCalendarData(year = new Date(Date.now()).getFullYear(), month = new Date(Date.now()).getMonth() + 1) {
	/**Function that requests monthly calendar twice.
	 * First one with current month and second one with next month
	 */
	let crnt_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: year,
		month: month,
	})).weeks
	let nxt_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: month == 12 ? year + 1 : year,
		month: month == 12 ? 1 : month + 1,
	})).weeks
	return crnt_month.concat(nxt_month);
}

// 2. Content handling:
getCalendarData().then(function (response) {
	let days = response.map(function (week) {
		return week.days
	}).flat();
	let daytitles = days.map(function (day) {
		return day.daytitle
	});
	let events = days.map(function (day) {
		return day.events
	}).flat().map(function (event) {
		return {
			name: event.name,
			description: event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g) == null ? [] : event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g).filter(function (content) {
				return content.length > 0 ? content : null
			}).map(function (content) {
				return content.trim()
			}).join(' '),
			course_name: "course" in event ? event.course.fullnamedisplay : "Undefined course.",
			course_category: "course" in event ? event.course.coursecategory : "Undefined course.",
			date: new Date(event.timestart * 1000),
			url: event.url
		}
	})

	// Tests:
	events.map(function (event, index) {

		console.log(eventStringify(event)); // displays an event.
		console.log(JSON.stringify(format_difference(new Date(Date.now()), event.date)) + '\n'); // displays the remaning time.


	})

})