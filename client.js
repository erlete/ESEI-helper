// Remote modules:
const fs = require('fs')
const qrcode = require('qrcode-terminal')
const { Client, List, Buttons } = require('whatsapp-web.js')

// Local modules:
const users = require('./users')
const event_fetcher = require('./event_fetcher')
const { logger } = require('./aux')
const { SUPERUSERS, SESSION } = require('./auth')

// Constants and variables:
//const SESSION = './session.json'
let client, sessionData, chat, content


/**Bot's authentication and mainloop.*/
async function session_initialize() {

	// Session:

	client = new Client({ session: SESSION })
	client.on('ready', () => logger('Client is ready'))

	// Commands:

	client.on('message_create', async message => {
		chat = await message.getChat()
		content = message.body.split(' ')
		superuser = SUPERUSERS.includes(message.from)

		if (message.type == 'list_response') {
			logger('List response detected.', message)
			listReplyHandler(message)

		} else if (message.type == 'buttons_response') {
			logger('Button response detected.', message)
			buttonReplyHandler(message)

		} else {
			switch (content[0]) {
				case 'getid':
					chat.sendStateTyping()
					logger('ID requested.', message)
					superuser ? client.sendMessage(message.from, `El ID del chat solicitado es: ${message.to}`) : null
					chat.clearState()
					break

				case 'getsession':
					chat.sendStateTyping()
					logger('Session JSON requested.', message)
					if (superuser) {
						client.sendMessage(message.from, 'Con el fin de evitar problemas de seguridad, copie el código de sesión del mensaje siguiente y proceda a eliminarlo.')
						client.sendMessage(message.from, `${JSON.stringify(SESSION)}`)
					}
					chat.clearState()
					break

				case 'adddegree':
					chat.sendStateTyping()
					logger('Degree addition requested.', message)
					if (superuser) {
						switch (users.addDegree(content[1])) {
							case 0:
								client.sendMessage(message.from, `El grado en ${content[1]} ha sido añadido correctamente.`)
								break
							case 1:
								client.sendMessage(message.from, `El grado en ${content[1]} ya existe.`)
								break
						}
					}
					chat.clearState()
					break

				case 'addme':
					chat.sendStateTyping()
					logger('User addition requested.', message)
					switch (users.addUser(message.from, content[1], content[2])) {
						case 0:
							client.sendMessage(message.from, `Ha sido añadido correctamente a la lista de notificaciones de ${content[2]}º del grado en ${content[1]}.`)
							break
						case 1:
							client.sendMessage(message.from, `El grado en ${content[1]} no existe. Contacte con un administrador para resolver la incidencia.`)
							break
						case 2:
							client.sendMessage(message.from, `El curso ${content[2]}º del grado en ${content[1]} no existe. Contacte con un administrador para resolver la incidencia.`)
							break
						case 3:
							client.sendMessage(message.from, `Usted ya se encuentra registrado en ${content[2]}1 del grado en ${content[1]}.`)
							break
					}
					chat.clearState()
					break

				case 'removeme':
					chat.sendStateTyping()
					logger('User removal requested.', message)
					switch (users.removeUser(message.from, content[1], content[2])) {
						case 0:
							client.sendMessage(message.from, `Ha sido retirado correctamente de la lista de notificaciones de ${content[2]}º del grado en ${content[1]}.`)
							break
						case 1:
							client.sendMessage(message.from, `Usted no se encuentra matriculado en ${content[2]}º del grado de ${content[1]}.`)
							break
						case 2:
							client.sendMessage(message.from, `Usted no se encuentra matriculado en el grado de ${content[1]}.`)
							break
						case 3:
							client.sendMessage(message.from, `El curso ${content[2]}º del grado en ${content[1]} no existe. Contacte con un administrador para resolver la incidencia.`)
							break
						case 4:
							client.sendMessage(message.from, `El grado en ${content[1]} no existe. Contacte con un administrador para resolver la incidencia.`)
							break
					}
					chat.clearState()
					break

				case 'geteventlist':
					chat.sendStateTyping()
					logger('Event list requested.', message)
					sendEventList(message)
					chat.clearState()
					break

				default:
					logger(`Plain message from ${message.from}.`)
			}
		}
	})
	client.initialize()
}


/**Sends a formatted event list to the message sender's chat.*/
async function sendEventList(message) {
	let user = require(users.USER_DATABASE)[message.from]

	Object.keys(user).forEach(degree =>
		user[degree].forEach(function (year) {
			let events = require(event_fetcher.EVENTS)[degree][year]
			let identifiers = Object.keys(events)

			let rows = []
			let sections = [{title: 'Eventos:', rows: rows}]

			identifiers.forEach(function (identifier) {
				sections[0].rows.push({
					id: identifier,
					title: events[identifier].name,
					description: events[identifier].description != '' ? events[identifier].description.length <= 39 ? events[identifier].description : events[identifier].description.slice(0, 39) + '...' : 'No existe descripción para este evento.'
				})
			})

			client.sendMessage(message.from, new List(`Lista de eventos disponibles para ${year}º del grado en ${degree}.\n\n_Pulsa el botón de la parte inferior para continuar._`, 'Ver eventos', sections, '*Próximos eventos:*', ''))
		})
	)
}


/**Handler for list-specific replies.*/
async function listReplyHandler(message) {
	let user = require(users.USER_DATABASE)[message.from]
	let events = require(event_fetcher.EVENTS)
	let event;

	Object.keys(user).forEach(degree =>
		user[degree].forEach(function (year) {
			if (Object.keys(events[degree][year]).includes(message.selectedRowId)) {
				event = events[degree][year][message.selectedRowId]
			}
		})
	)

	let button = new Buttons(
		`\n${event_fetcher.eventStringify(event)}`,
		[{id: `${event.date}`, body: 'Ver tiempo restante'}],
		`Evento: ${event.name.toUpperCase()}`,
		`\nVisita ${event.url} para más información acerca del evento.`
	)

	client.sendMessage(message.from, button)
}


/**Handler for button-specific replies.*/
async function buttonReplyHandler(message) {
	let difference = event_fetcher.dateDifference(new Date(Date.now()), new Date(parseInt(message.selectedButtonId)))
	client.sendMessage(message.from, `Tiempo restante: ${difference.days} día(s), ${difference.hours} hora(s), ${difference.minutes} minuto(s), ${difference.seconds} segundo(s).`)
}


// Bot initialization:
session_initialize();
