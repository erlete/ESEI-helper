// Dependencies and declarations:

const axios = require('axios');
const fs = require('fs-extra');
const url = require('url'); // Encoded data tool for URL-params.

require('dotenv').config();

function base64(string) {
	return new Buffer.from(string).toString('base64');
}


// WebService Authentication:

/**Function that initializes the token with default .env credentials.
 * Allows automatic ws_token variable definition (with no additional .env parameters).*/
async function initToken() {
	if (!process.env.MOOVI_TOKEN) {
		fs.writeFileSync('.env', `\nMOOVI_TOKEN=${await getWsToken(process.env.MOOVI_USERNAME, process.env.MOOVI_PASSWORD)}`, {
			'flag': 'a'
		}, function (err) {
			if (err) {
				return console.error(err);
			}
		})
		require('dotenv').config();
	}
	ws_token = process.env.MOOVI_TOKEN
	user_data = await wsRequest("core_webservice_get_site_info", {})
	return;

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

/**CAUTION: THIS IS A GENERAL MOODLE WEBSERVICE REQUEST. READ:
 * Standard webService request to allow cleaner code, takes two parameters:
 * ws_function: String 	(Requested content's Moodle identifier)
 * req_params: Object	(Object containing all further data required, which is sent to the server)
 * Example:
 * ws_function = 'core_calendar_get_calendar_monthly_view' // Monthly calendar function name.
 * req_params = {	year : 2021	, month : 12	} // Data required to fetch calendar's info.*/
async function wsRequest(ws_function, req_params) {
	if (typeof ws_token === 'undefined') {
		await initToken();
	}
	return (await axios.post('https://moovi.uvigo.gal/webservice/rest/server.php', new url.URLSearchParams({
		...req_params,
		wsfunction: ws_function,
		wstoken: ws_token
	}).toString(), {
		params: {
			moodlewsrestformat: 'json'
		}
	})).data;
}

/**No clue about what this actually does, but it works, so whatever...*/
async function fileRequest(fileUrl, outputLocationPath) {
	if (typeof ws_token === 'undefined') {
		await initToken();
	}
	outputLocationPath = `./downloads/${outputLocationPath}`
	fileUrl = fileUrl.replace('webservice/pluginfile.php', `tokenpluginfile.php/${user_data.userprivateaccesskey}`)
	if (!fs.existsSync(outputLocationPath)) {
		fs.outputFileSync(outputLocationPath, '')
		const writer = fs.createWriteStream(outputLocationPath);
		return (axios.get(fileUrl, {
			params: {
				wstoken: ws_token,
			},
			responseType: 'stream'
		})).then(response => {
			/* Ensure that the user can call `then()` only when the file has
			been downloaded entirely. */
			return new Promise((resolve, reject) => {
				response.data.pipe(writer);
				let error = null;
				writer.on('error', err => {
					error = err;
					writer.close();
					reject(err);
				});
				writer.on('close', () => {
					if (!error) {
						resolve(true);
					}
					//no need to call the reject here, as it will have been called in the
					//'error' stream;
				});
			});
		});
	} else {
		console.log('File already exists.')
		return
	}
}

/**Function that requests Moodle's calendar data for the next two months.*/
async function getCalendarData(c_year = new Date(Date.now()).getFullYear(), c_month = new Date(Date.now()).getMonth() + 1) {
	let current_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: c_year,
		month: c_month
	})).weeks;

	let next_month = (await wsRequest('core_calendar_get_calendar_monthly_view', {
		year: c_month == 12 ? c_year + 1 : c_year,
		month: c_month == 12 ? 1 : c_month + 1
	})).weeks;
	return current_month.concat(next_month);
}

/**Function that processes previously fetched calendar data but only for upcoming events.*/
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
					return content.replace(/[\r\n]+/g, ' ').trim()
				})).join(' ').replace(/(\s\.)+/g, '.'),
				course_name: 'course' in event ? event.course.fullnamedisplay : '',
				course_category: 'course' in event ? event.course.coursecategory : '',
				date: event.timestart * 1000, // Hourly delay compensation.
				location: event.location,
				url: event.url,
				_id: `${event.id}`,
			}
		})
		.filter(function (event) {
			return event.date >= new Date(Date.now()) ? event : null;
		});
}

/**Returns a unique identifier for each event.*/
function getId(event) {
	return `${new Date(event.date).getTime()}_${event.name.split(' ').map(function (word) {return word[0]}).join('').toLowerCase()}`;
}


// Format functions:

/**Function that returns a formatted string with event data.*/
function eventStringify(event) {
	return ('' +
		`${event.course_category == '' ? '': `*Curso:* ${event.course_category}\n\n`}` +
		`${event.course_category == '' ? '': `*Módulo:* ${event.course_name}\n\n`}` +
		`*Fecha límite:* ${new Date(event.date).toLocaleString('en-GB', { timeZone: 'UTC' })}\n\n` +
		`${event.location == '' ? '' : `*Localización:* ${event.location}\n\n`}` +
		`${event.description == '' ? '' : `*Descripción:* _${event.description}_`}`
	);
}

/**Function that returns an object containing the time difference between two EPOCH dates.*/
function dateDifference(date1, date2) {
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
	};
}


// Module exports:

module.exports = {
	initToken,
	wsRequest,
	getId,
	getEvents,
	getWsToken,
	getCalendarData,
	eventStringify,
	dateDifference,
	fileRequest
}

// This is a test.
