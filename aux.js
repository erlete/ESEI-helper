/**Logs a message (debugging purposes).*/
function logger(title = '', message = null) {
	let now = (new Date(Date.now())).toLocaleString('en-GB', { timeZone: 'UTC' })
	console.log(`[${now}] -> ${title} ${message ? JSON.stringify(message) : ''}`)
}


module.exports = {
	logger
}
