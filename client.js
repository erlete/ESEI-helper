// Dependencies and declarations:
const {
	MongoClient
} = require("mongodb")
const moovi = require('./mooviFunctions');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const {
	Client,
	List,
	Buttons
} = require('whatsapp-web.js');
const logger = require('./logger.js')

require('dotenv').config();

const SESSION_FILE_PATH = './session.json';
let client, sessionData, ESEI_DB, eventsColl, adminsColl, tokensColl, super_users;

// Database methods:

/**Missing documentation.*/
async function initDB() {
	return new Promise(async function (resolve, reject) {
		try {
			DBClient = await MongoClient.connect(process.env.MONGO_URL, {
				connectTimeoutMS: 20000,
				retryWrites: true,
				useNewUrlParser: true,
			})
			// create a database object
			ESEI_DB = DBClient.db("ESEI_DB")

			// create a collection object for each of the collections
			eventsColl = ESEI_DB.collection("events")
			adminsColl = ESEI_DB.collection("admins")
			tokensColl = ESEI_DB.collection("moovi_tokens")
			logger.client.log('info', {
				message: logMsgFormat('Database initialized')
			});
			resolve()
		} catch (e) {
			logger.client.log('error', {
				message: logMsgFormat('Error initializing DB', e.toString(), )
			});
			reject()
		}
	})
}


// Helper functions:

/**Function that formats data for logging purposes.*/
function logMsgFormat(label = '', log_data = '') {
	return {
		title: label == '' ? "Unknown" : label,
		data: log_data == '' ? undefined : log_data,
	}
}


// Bot's functions:

/**Function that contains Whatsapp bot's mainloop.*/
async function init() {
	//Initiate connection to the database
	await initDB()

	super_users = await adminsColl.find({}).toArray()
	console.log(process.env)
	// Session authentication:
	if (process.env.WS_SESSION) {
		sessionData = JSON.parse(process.env.WS_SESSION);
	}

	client = new Client({
		session: sessionData
	});

	client.on('authenticated', (session) => {
		sessionData = session;
		if (typeof ws_token === 'undefined') {
			moovi.envUpdate('WS_SESSION', session)
		} else {
			moovi.envAdd('WS_SESSION', session)
		}

	});

	client.on('qr', qr => {
		qrcode.generate(qr, {
			small: true
		});
	});

	client.on('ready', () => {
		logger.client.log('info', {
			message: logMsgFormat('Client is ready')
		});

		updateEvents()

		setInterval(function () {
			updateEvents()
		}, 600000);
	})

	// Bot commands:

	client.on('message_create', message => {
		if (message.type == 'list_response') {
			logger.user.log('info', {
				message: logMsgFormat('List response detected.', message)
			});
			listReplyHandler(message);
		} else if (message.type == 'buttons_response') {
			logger.user.log('info', {
				message: logMsgFormat('Button response detected.', message)
			});
			buttonReplyHandler(message);
		} else if (message.body.startsWith('!esei')) {
			if (super_users.find(x => x.ws_id == message.from) || super_users.find(x => x.ws_id == message.author) || message.fromMe) {
				let msg_arguments = message.body.match(/(?<=\-)[^\s\-]+/g);
				if (msg_arguments) {
					msg_arguments.map(function (argument, index) {
						switch (argument) {
							case 'getid':
								logger.admin.log('info', {
									message: logMsgFormat('ID requested.', message)
								});
								message.reply(message.to);
								break;
							case 'geteventlist':
								logger.admin.log('info', {
									message: logMsgFormat('Event list requested.', message)
								});
								sendEventList(message);
								break;
							default:
								logger.admin.log('info', {
									message: logMsgFormat('No matches for the requested argument: ' + argument, message)
								});
								break;
						}
					})
				}
			} else {
				logger.admin.log('error', {
					message: logMsgFormat('Non-admin user: ' + message.from + ' tried to run a command', message)
				});
			}
		} else if (message.body.startsWith('!newadmin')) {
			if (super_users.find(x => x.ws_id == message.from) || super_users.find(x => x.ws_id == message.author) || message.fromMe) {

				try {
					let n_admin = {
						name: message.body.match(/(?<=(name)(:|=))[\S]+/)[0],
						ws_id: message.body.match(/(?<=(id)(:|=))[\S]+/)[0]
					}
					adminsColl.updateOne({
						name: n_admin.name
					}, {
						$set: {
							name: n_admin.name,
							ws_id: n_admin.ws_id
						}
					}, {
						upsert: true
					}, ).then(function (upsert_result) {
						if (upsert_result.upsertedId) {
							message.reply(`Succesfully added admin, name:'${n_admin.name}' ws_id:'${n_admin.ws_id}'`)
							logger.admin.log('info', {
								message: logMsgFormat('Added new admin', {
									name: n_admin.name,
									ws_id: n_admin.ws_id
								})
							});
						} else if (upsert_result.modifiedCount > 0) {
							message.reply(`Succesfully updated admin, name:'${n_admin.name}' ws_id:'${n_admin.ws_id}'`)
							logger.admin.log('info', {
								message: logMsgFormat('Admin updated', {
									name: n_admin.name,
									ws_id: n_admin.ws_id
								})
							});
						} else {
							message.reply(`Admin already exists`)
							logger.admin.log('info', {
								message: logMsgFormat('Admin already exists', {
									name: n_admin.name,
									ws_id: n_admin.ws_id
								})
							});
						}

					})

				} catch (e) {
					logger.admin.log('error', {
						message: logMsgFormat('Error adding new admin', e.toString())
					});
				}
			}
		} else {
			logger.user.log('info', {
				message: logMsgFormat('User msg', message)
			});
		}
	});


	try {
		client.initialize();
	} catch (error) {
		logger.client.log('error', {
			message: logMsgFormat('Error on client initialization', error.toString())
		});
		init()
	}
}

/**Function that sends a formatted event list to the message sender's chat.*/
async function sendEventList(message) {
	try {
		let events = await eventsColl.find({
			date: {
				$gt: Date.now()
			}
		}).toArray()
		if (events.length) {

			let sections = [{
				title: 'Eventos:',
				rows: []
			}];

			events.forEach(function (event) {
				sections[0].rows.push({
					id: event._id,
					title: event.name + " " + new Date(event.date).toLocaleDateString('en-GB'),
					description: event.description != '' ? event.description.length <= 39 ? event.description : event.description.slice(0, 39) + '...' : 'No existe descripción para este evento.'
				});
			});
			client.sendMessage(message.from, new List('_Pulsa el botón de la parte inferior para ver todos los eventos disponibles._', 'Ver eventos', sections, '*Próximos eventos:*'));


		} else {
			client.sendMessage(message.from, '```Actualmente no hay eventos :D```');

		}
	} catch (e) {
		logger.client.log('error', {
			message: logMsgFormat('Error sending event list', e.toString())
		});
	}
}

/**Function that serves as handler for list-specific replies.*/
async function listReplyHandler(message) {
	try {
		let event = await eventsColl.findOne({
			_id: message.selectedRowId
		})
		let button = new Buttons(
			`\n${moovi.eventStringify(event)}`,
			[{
				id: `${event.date}`,
				body: 'Ver tiempo restante'
			}],
			`Evento: ${event.name.toUpperCase()}`,
			`\nVisita ${event.url} para más información acerca del evento.`
		);
		client.sendMessage(message.from, button);
	} catch (e) {
		logger.client.log('error', {
			message: logMsgFormat('Error replying to list', e.toString())
		});
	}
}

/**Function that serves as handler for button-specific replies.*/
async function buttonReplyHandler(message) {
	try {
		let difference = moovi.dateDifference(new Date(Date.now()), new Date(parseInt(message.selectedButtonId)));
		client.sendMessage(message.from, `Tiempo restante: ${difference.days} día${difference.days==1?'':'s'}, ${difference.hours} hora${difference.hours==1?'':'s'}, ${difference.minutes} minuto${difference.minutes==1?'':'s'}, ${difference.seconds} segundo${difference.seconds==1?'':'s'}.`);
	} catch (e) {
		logger.client.log('error', {
			message: logMsgFormat('Error replying to button', e.toString())
		});
	}
}


// Initialization:

/**Missing documentation.*/
async function updateEvents() {
	try {
		let event_data = await moovi.getEvents(await moovi.getCalendarData());
		// this is an upsert. We use the update method instead of insert.
		event_data.forEach(async function (event, index) {
			let upsertResult = await eventsColl.updateOne({
					_id: event._id
				}, {
					$set: event
				},

				{
					upsert: true
				},
			)
			if (upsertResult.upsertedId) {
				logger.events.log('info', {
					message: logMsgFormat('New event added', event)
				});
				let new_event = new Buttons(
					`\n${moovi.eventStringify(event)}`,
					[{
						id: `${event.date}`,
						body: 'UwU'
					}],
					`NUEVO EVENTO: ${event.name.toUpperCase()}`,
					`\nVisita ${event.url} para más información acerca del evento.`
				);
				client.sendMessage(process.env.GROUP_ID, new_event);
			}
			if (upsertResult.modifiedCount > 0) {
				logger.events.log('info', {
					message: logMsgFormat('Event changed', event)
				});
				if (event.date > Date.now()) {
					let changed_event = new Buttons(
						`\n${moovi.eventStringify(event)}`,
						[{
							id: `${event.date}`,
							body: 'UwU'
						}],
						`EVENT CHANGE: ${event.name.toUpperCase()}`,
						`\nVisita ${event.url} para más información acerca del evento.`
					);
					client.sendMessage(process.env.GROUP_ID, changed_event);

				}
			}
		})
	} catch (e) {
		logger.events.log('error', {
			message: logMsgFormat('Error updating events', e.toString())
		});
	}
}

init()