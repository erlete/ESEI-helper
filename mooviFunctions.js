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


// Helper functions:

/**Function to return a formatted string with event data*/
function eventStringify(event) {

	return `Name: ${event.name.toUpperCase()}\nDescription: ${event.description}\nCourse name: ${event.course_name}\nCourse category: ${event.course_category}\nDate: ${event.date}\nURL: ${event.url}`
}
/**Function to return an object with the time difference between two EPOCH dates*/
function format_difference(date1, date2) {

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

/**Function to initialize the token with .env default credentials
 * Allows to define the ws_token variable without passing env variables each time*/
async function initToken() {

	ws_token = await getWsToken(process.env.MOOVI_USERNAME, process.env.MOOVI_PASSWORD)
	return true;
}

/**Function that gets a Moodle webService token from an username and password*/
async function getWsToken(username, password) {

	return (await axios.post('https://moovi.uvigo.gal/login/token.php', {}, {
		params: {
			username: username,
			password: password,
			service: 'moodle_mobile_app'
		}
	})).data.token;

}



// 1. Content retrieval:

/**CAUTION THIS A GENERAL MOODLE WEBSERVICE REQUEST, READ :
 * Standard webService request to allow cleaner code, takes two parameters:
 * ws_function: String 	(Moodle name of the content requested)
 * req_params: Object	(Object containing all further data needed sent to the server)
 * Example:
 * ws_function = 'core_calendar_get_calendar_monthly_view' //Monthly calendar function name
 * req_params = {	year : 2021	, month : 12	} //Data needed to obtain the calendar info*/
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

/**Function that requests monthly calendar twice.
 * First one with current month and second one with next month*/
async function getCalendarData(year = new Date(Date.now()).getFullYear(), month = new Date(Date.now()).getMonth() + 1) {

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
				console.log(content)
				return content.replace(/[\r\n]+/g, " ").trim()
			})).join(' ').replace(/(\s\.)+/g, "."),
			course_name: "course" in event ? event.course.fullnamedisplay : "Undefined course.",
			course_category: "course" in event ? event.course.coursecategory : "Undefined course.",
			date: new Date(event.timestart * 1000),
			url: event.url,
		}
	})

}
module.exports = { //Exportamos las funciones para tener el codigo del cliente mas limpio
	eventStringify,
	format_difference,
	getWsToken,
	initToken,
	wsRequest,
	getCalendarData,
	getEvents
}