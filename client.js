// Dependencies:
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

require('dotenv').config();


const SESSION_FILE_PATH = './session.json';
let client, sessionData, ESEI_DB, eventsColl, adminsColl, tokensColl, super_users;

//DB functions
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
			resolve()
		} catch (e) {
			console.log(e)
			reject()
		}
	})
}



// Helper functions:

/**Function that adds a custom timestamp to the logged message (debugging purposes).*/
function logger(message, content = '') {
	let now = new Date(Date.now());
	console.log(`[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}] -> ${content} ${JSON.stringify(message)}\n`);
}


// Bot's functions:

/**Function that contains Whatsapp bot's mainloop.*/
async function init() {
	//Initiate connection to the database
	await initDB()
	console.log("Database initialized")
	super_users = await adminsColl.find({}).toArray()
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
		updateEvents()

		setInterval(function () {
			updateEvents()
		}, 600000);
	})


	// Bot commands:

	client.on('message_create', message => {
		if (message.type == 'list_response') {
			logger(message, 'List response detected.');
			listReplyHandler(message);
		} else if (message.type == 'buttons_response') {
			logger(message, 'Button response detected.');
			buttonReplyHandler(message);
		} else if (message.body.startsWith('!esei')) {
			if (super_users.find(x => x.ws_id == message.from) || super_users.find(x => x.ws_id == message.author) || message.fromMe) {
				let msg_arguments = message.body.match(/(?<=\-)[^\s\-]+/g);
				if (msg_arguments) {
					let err_args = [];
					msg_arguments.map(function (argument, index) {
						switch (argument) {
							case 'getid':
								logger(message, 'ID requested.');
								message.reply(message.to);
								break;
							case 'geteventlist':
								logger(message, 'Event list requested.');
								sendEventList(message);
								break;
							default:
								logger(message, 'No matches for the requested argument: ' + argument);
								err_args.push(argument)
								break;
						}
					})
					message.reply(`Los argumentos ${err_msg} no tienen un comando asociado :c`)
				}
			} else {
				logger(message, 'Non-admin user: ' + message.from + ' tried to run a command');
			}
		} else if (message.body.startsWith('!newadmin')) {
			if (super_users.find(x => x.ws_id == message.from) || super_users.find(x => x.ws_id == message.author) || message.fromMe) {
				logger(message, 'Adding new admin');

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
					console.log(upsert_result)

					if (upsert_result.upsertedId) {
						message.reply(`Succesfully added admin, name:'${n_admin.name}' ws_id:'${n_admin.ws_id}'`)
					} else if (upsert_result.modifiedCount > 0) {
						message.reply(`Succesfully updated admin, name:'${n_admin.name}' ws_id:'${n_admin.ws_id}'`)

					} else {
						message.reply(`Admin already exists`)

					}

				})
			}
		} else {
			logger(message, 'Non-commanded message.');
			//esto peta la consola permanentemente con cada mensaje
		}
	});

	client.initialize();
}

/**Function that sends a formatted event list to the message sender's chat.*/
async function sendEventList(message) {
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
				title: event.name,
				description: event.description != '' ? event.description.length <= 39 ? event.description : event.description.slice(0, 39) + '...' : 'No existe descripción para este evento.'
			});
		});
		console.log(sections[0].rows)
		// client.sendMessage(message.from, '```Actualmente no hay eventos :D```');
		client.sendMessage(message.from, new List('_Pulsa el botón de la parte inferior para ver todos los eventos disponibles._', 'Ver eventos', sections, '*Próximos eventos:*'));


	} else {
		client.sendMessage(message.from, '```Actualmente no hay eventos :D```');

	}
}

/**Function that serves as handler for list-specific replies.*/
async function listReplyHandler(message) {
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
}

/**Function that serves as handler for button-specific replies.*/
async function buttonReplyHandler(message) {
	let difference = moovi.dateDifference(new Date(Date.now()), new Date(parseInt(message.selectedButtonId)));
	client.sendMessage(message.from, `Tiempo restante: ${difference.days} día(s), ${difference.hours} hora(s), ${difference.minutes} minuto(s), ${difference.seconds} segundo(s).`);
}


// Initialization:

async function updateEvents() {
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
			console.log("SE HA AÑADIDO UN NUEVO EVENTO")
			let button = new Buttons(
				`\n${moovi.eventStringify(event)}`,
				[{
					id: `${event.date}`,
					body: 'UwU'
				}],
				`_NUEVO EVENTO_\n${event.name.toUpperCase()}`,
				`\nVisita ${event.url} para más información acerca del evento.`
			);
			client.sendMessage(process.env.GROUP_ID, button);
		}
		if (upsertResult.modifiedCount > 0 && event.date > Date.now()) {
			let button = new Buttons(
				`\n${moovi.eventStringify(event)}`,
				[{
					id: `${event.date}`,
					body: 'UwU'
				}],
				`_EVENT CHANGE_\n ${event.name.toUpperCase()}`,
				`\nVisita ${event.url} para más información acerca del evento.`
			);
			client.sendMessage(process.env.GROUP_ID, button);

		}
	})
}


init()