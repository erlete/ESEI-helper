const fs = require('fs')
const DATABASE = './users.json'

function addUser(phone, degree, level) {
	let db = require(DATABASE)

	db[phone] = {
		degree: degree,
		level: level
	}

	updateUsers(db)
}

function removeUser(phone) {
	let db = require(DATABASE)
	delete db[phone]
	updateUsers(db)
}

async function updateUsers(db) {
	fs.writeFile(DATABASE, JSON.stringify(db),
		err => err ? console.error(err) : null
	)
}
