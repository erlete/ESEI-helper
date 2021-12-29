// Remote modules:
const axios = require('axios')
const url = require('url')

// Dotenv settings:
require('dotenv').config()

// Constants and variables:
const SUPERUSERS = process.env.SUPERUSERS.split(',')
const TOKENS = {
	ESEI: {
		"1": process.env.ESEI_1,
		"2": process.env.ESEI_2,
		"3": process.env.ESEI_3,
		"4": process.env.ESEI_4
	},
	EEAE: {
		"1": process.env.EEAE_1,
		"2": process.env.EEAE_2,
		"3": process.env.EEAE_3,
		"4": process.env.EEAE_4
	}
}


/**CAUTION: THIS IS A GENERAL MOODLE WEBSERVICE REQUEST. READ:
 * Standard webService request to allow cleaner code. Takes two parameters:
 * ws_function: String (Requested content's Moodle identifier)
 * req_params: Object (Object containing all further data required, which is
 	sent to the server)
 * Example:
 *   ws_function = 'core_calendar_get_calendar_monthly_view'
 *   req_params = { year : 2021 , month : 12 }*/
async function wsRequest(token, ws_function, req_params) {
	return (await axios.post(
		'https://moovi.uvigo.gal/webservice/rest/server.php',
		new url.URLSearchParams({
			...req_params,
			wsfunction: ws_function,
			wstoken: token
		}).toString(), {
			params: {
				moodlewsrestformat: 'json'
			}
		})
	).data
}


module.exports = {
	SUPERUSERS,
	TOKENS,

	wsRequest
}
