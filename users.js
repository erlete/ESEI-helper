// Remote modules:
const fs = require('fs')

// Constants and variables:
const DEGREE_DATABASE = './subscriptions.json'
const USER_DATABASE = './users.json'


/*Adds a phone to a specific year and degree.**/
function addUser(phone, degree, year) {
	let degreedb = require(DEGREE_DATABASE)
	let userdb = require(USER_DATABASE)

	if (!Object.keys(userdb).includes(phone)) {
		userdb[phone] = {}
	}

	if (Object.keys(degreedb).includes(degree)) {
		if (Object.keys(degreedb[degree]).includes(year)) {
			if (Object.keys(userdb[phone]).includes(degree)) {
				if (!userdb[phone][degree].includes(year)) {
					userdb[phone][degree].push(year)
					degreedb[degree][year].push(phone)

					updateDatabase(DEGREE_DATABASE, degreedb)
					updateDatabase(USER_DATABASE, userdb)
					return 0
				}
				return 3  // Year already registered.
			}
			userdb[phone][degree] = [year]
			degreedb[degree][year].push(phone)

			updateDatabase(DEGREE_DATABASE, degreedb)
			updateDatabase(USER_DATABASE, userdb)
			return 0
		}
		return 2  // Invalid year.
	}
	return 1  // Invalid degree.
}


/*Adds a new degree.**/
function addDegree(degree) {
	let degreedb = require(DEGREE_DATABASE)

	if (Object.keys(degreedb).includes(degree)) {
		return 1
	}

	degreedb[degree] = {
		"1": [],
		"2": [],
		"3": [],
		"4": []
	}

	updateDatabase(DEGREE_DATABASE, degreedb)

	return 0
}


/*Removes a phone from a specific year and degree.**/
function removeUser(phone, degree, year) {
	let degreedb = require(DEGREE_DATABASE)
	let userdb = require(USER_DATABASE)

	if (Object.keys(degreedb).includes(degree)) {
		if (Object.keys(degreedb[degree]).includes(year)) {
			if (Object.keys(userdb[phone]).includes(degree)) {
				if (userdb[phone][degree].includes(year)) {
					if (userdb[phone][degree].length == 1) {
						delete userdb[phone][degree]
					} else {
						userdb[phone][degree].splice(userdb[phone][degree].indexOf(year), 1)
					}

					degreedb[degree][year].splice(degreedb[degree][year].indexOf(phone), 1)

					updateDatabase(DEGREE_DATABASE, degreedb)
					updateDatabase(USER_DATABASE, userdb)

					return 0
				}
				return 1  // Year not registered.
			}
			return 2  // Degree not registered.
		}
		return 3  // Invalid year.
	}
	return 4  // Invalid degree.
}


/*Updates the specified database with a JSON object.**/
async function updateDatabase(database_file, database) {
	fs.writeFile(database_file, JSON.stringify(database),
		err => err ? console.error(err) : null
	)
}


module.exports = {
	DEGREE_DATABASE,
	USER_DATABASE,

	addUser,
	addDegree,
	removeUser
}
