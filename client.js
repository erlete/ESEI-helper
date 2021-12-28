const fs = require('fs')
const qrcode = require('qrcode-terminal')
const { Client, List, Buttons } = require('whatsapp-web.js')
const formatter = require('./formatter')
const users = require('./users')

require('dotenv').config()
const SUPERUSERS = process.env.SUPERUSERS.split(',')

const SESSION = './session.json'
let client, sessionData, chat, content


/**Function that adds a custom timestamp to the logged message (debugging purposes).*/
function logger(message, content = '') {
	let now = (new Date(Date.now())).toLocaleString('en-GB', { timeZone: 'UTC' })
	console.log(`[${now}] -> ${content} ${JSON.stringify(message)}\n`)
}


/**Function that contains Whatsapp bot's mainloop.*/
async function session_initialize() {

	// Session:

	fs.existsSync(SESSION) ? sessionData = require(SESSION) : null
	client = new Client({ session: sessionData })

	client.on('authenticated', session => {
		sessionData = session
		fs.writeFile(SESSION, JSON.stringify(session),
			err => err ? console.error(err) : null
		)
	})

	client.on('qr', qr => qrcode.generate(qr, { small: true }))
	client.on('ready', () => logger('Client is ready'))

	// Commands:

	client.on('message_create', async message => {
		chat = await message.getChat()

		if (message.type == 'list_response') {
			logger(message, 'List response detected.')
			listReplyHandler(message)

		} else if (message.type == 'buttons_response') {
			logger(message, 'Button response detected.')
			buttonReplyHandler(message)

		} else if (SUPERUSERS.includes(message.from)) {
			content = message.body.split(' ')
			switch (content[0]) {
				case 'getid':
					chat.sendStateTyping()
					logger(message, 'ID requested.')
					client.sendMessage(message.from, `El ID del chat solicitado es: ${message.to}`)
					chat.clearState()
					break

				case 'geteventlist':
					chat.sendStateTyping()
					logger(message, 'Event list requested.')
					sendEventList(message)
					chat.clearState()
					break

				case 'getsession':
					chat.sendStateTyping()
					logger(message, 'Session JSON requested.')
					client.sendMessage(message.from, 'Con el fin de evitar problemas de seguridad, copie el código de sesión del mensaje siguiente y proceda a eliminarlo.')
					client.sendMessage(message.from, `${JSON.stringify(require(SESSION))}`)
					chat.clearState()
					break

				case 'addme':
					chat.sendStateTyping()
					users.addUser(message.from, content[1], content[2])
					chat.clearState()
					break

				case 'removeme':
					chat.sendStateTyping()
					users.removeUser(message.from)
					chat.clearState()
					break

				default:
					break
			}
		}
	})

	client.initialize()
}


/**Function that sends a formatted event list to the message sender's chat.*/
async function sendEventList(message) {
	let events = require(formatter.DATABASE)
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

	client.sendMessage(message.to, new List('_Pulsa el botón de la parte inferior para ver todos los eventos disponibles._', 'Ver eventos', sections, '*Próximos eventos:*', ''))
}


/**Function that serves as handler for list-specific replies.*/
async function listReplyHandler(message) {
	let event = require(formatter.DATABASE)[message.selectedRowId]
	let button = new Buttons(
		`\n${formatter.eventStringify(event)}`,
		[{id: `${event.date}`, body: 'Ver tiempo restante'}],
		`Evento: ${event.name.toUpperCase()}`,
		`\nVisita ${event.url} para más información acerca del evento.`
	)

	client.sendMessage(message.to, button)
}


/**Function that serves as handler for button-specific replies.*/
async function buttonReplyHandler(message) {
	let difference = formatter.dateDifference(new Date(Date.now()), new Date(parseInt(message.selectedButtonId)))
	client.sendMessage(message.to, `Tiempo restante: ${difference.days} día(s), ${difference.hours} hora(s), ${difference.minutes} minuto(s), ${difference.seconds} segundo(s).`)
}


// Bot initialization:
session_initialize();
