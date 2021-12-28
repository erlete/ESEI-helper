const axios = require('axios')
const url = require('url')

require('dotenv').config()

const CAREER = process.env.DEGREE
const LEVEL = process.env.LEVEL


/**Function that gets a Moodle webService token from an username and password.*/
async function getWsToken(username, password) {
	return (await axios.post('https://moovi.uvigo.gal/login/token.php', {}, {
		params: {
			username: username,
			password: password,
			service: 'moodle_mobile_app'
		}
	})).data.token
}


/**Initializes the token with default dotenv/GH-secrets credentials.
 * Provides with automatic ws_token variable definition with no additional
	dotenv parameters.*/
async function initToken() {
	ws_token = await getWsToken(process.env.MOOVI_USERNAME, process.env.MOOVI_PASSWORD)
	return true
}


/**CAUTION: THIS IS A GENERAL MOODLE WEBSERVICE REQUEST. READ:
 * Standard webService request to allow cleaner code. Takes two parameters:
 * ws_function: String (Requested content's Moodle identifier)
 * req_params: Object (Object containing all further data required, which is
 	sent to the server)
 * Example:
 *   ws_function = 'core_calendar_get_calendar_monthly_view'
 *   req_params = { year : 2021 , month : 12 }*/
async function wsRequest(ws_function, req_params) {
	if (typeof ws_token === 'undefined') {
		await initToken();
	}

	return (await axios.post(
		'https://moovi.uvigo.gal/webservice/rest/server.php',
		new url.URLSearchParams({
			...req_params,
			wsfunction: ws_function,
			wstoken: ws_token
		}).toString(), {
			params: {
				moodlewsrestformat: 'json'
			}
		})
	).data
}


module.exports = {
	initToken,
	wsRequest,
	getWsToken
}
