// Dependencies:

const moovi = require('./mooviFunctions');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, List, Buttons } = require('whatsapp-web.js');

require('dotenv').config();
const SUPERUSERS = process.env.SUPERUSERS.split(',');

const SESSION_FILE_PATH = './session.json';
let client, sessionData;

// Helper functions:

/**Function that adds a custom timestamp to the logged message (debugging purposes).*/
function logger(message, content = '') {
	let now = new Date(Date.now());
	console.log(`[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}] -> ${content} ${JSON.stringify(message)}\n`);
}


// Bot's functions:

/**Function that contains Whatsapp bot's mainloop.*/
async function init() {

	// Session authentication:

	if (fs.existsSync(SESSION_FILE_PATH)) {
		sessionData = require(SESSION_FILE_PATH);
	}

	client = new Client({
		session: sessionData
	});

	client.on('authenticated', (session) => {
		sessionData = session;
		fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
			if (err) {
				console.error(err);
			}
		});
	});

	client.on('qr', qr => {
		qrcode.generate(qr, {
			small: true
		});
	});

	client.on('ready', () => {
		logger('Client is ready');
	})


	// Bot commands:

	client.on('message_create', message => {
		if (message.type == 'list_response') {
			logger(message, 'List response detected.');
			listReplyHandler(message);
		} else if (message.type == 'buttons_response') {
			logger(message, 'Button response detected.');
			buttonReplyHandler(message);
		} else if (SUPERUSERS.includes(message.from)) {
			switch (message.body) {
				case 'getid':
					logger(message, 'ID requested.');
					message.reply(message.to);
					break;
				case 'geteventlist':
					logger(message, 'Event list requested.');
					sendEventList(message);
					break;
				default:
					logger(message, 'No matches for the requested message.');
					break;
			}
		} else {
			logger(message, 'Non-commanded message.');
		}
	});

	client.initialize();
}

/**Function that sends a formatted event list to the message sender's chat.*/
async function sendEventList(message) {
	let events = require(moovi.DATABASE_FILE);
	let identifiers = Object.keys(events);

	let rows = [];
	let sections = [{title: 'Eventos:', rows: rows}];

	identifiers.forEach(function (identifier) {
		sections[0].rows.push({
			id: identifier,
			title: events[identifier].name,
			description: events[identifier].description != '' ? events[identifier].description.length <= 39 ? events[identifier].description : events[identifier].description.slice(0, 39) + '...' : 'No existe descripción para este evento.'
		});
	});

	client.sendMessage(message.to, new List('_Pulsa el botón de la parte inferior para ver todos los eventos disponibles._', 'Ver eventos', sections, '*Próximos eventos:*', ''));
}

/**Function that serves as handler for list-specific replies.*/
async function listReplyHandler(message) {
	let event = require(moovi.DATABASE_FILE)[message.selectedRowId];
	let button = new Buttons(
		`\n${moovi.eventStringify(event)}`,
		[{id: `${event.date}`, body: 'Ver tiempo restante'}],
		`Evento: ${event.name.toUpperCase()}`,
		`\nVisita ${event.url} para más información acerca del evento.`
	);
	client.sendMessage(message.to, button);
}

/**Function that serves as handler for button-specific replies.*/
async function buttonReplyHandler(message) {
	let difference = moovi.dateDifference(new Date(Date.now()), new Date(parseInt(message.selectedButtonId)));
	client.sendMessage(message.to, `Tiempo restante: ${difference.days} día(s), ${difference.hours} hora(s), ${difference.minutes} minuto(s), ${difference.seconds} segundo(s).`);
}


// Initialization:

init();
