// Dependencies:

const moovi = require('./mooviFunctions')
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, List } = require('whatsapp-web.js');

let client; // FIXME: should this be here?

// Helper functions:

/**Function that adds a timestamp to the logged message (debugging purposes).*/
function logger(content) {
    let now = new Date(Date.now());
    console.log(`[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}] ->`);
    console.log(content);
}


// Bot's functions:

/**Function that contains Whatsapp's bot's mainloop.*/
async function init() {

    // Session authentication:

    const SESSION_FILE_PATH = './session.json';
    let sessionData;

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
    });


    // Bot commands:

    client.on('message_create', message => {
        if (message.type == 'list_response') {
            listReplyHandler(message)
        } else if (message.fromMe && message.body.startsWith("!esei")) {
            message.body.match(/(?<=\-)\S*/g).map(function (command, index) {
                switch (command) {
                    case 'getid':
                        logger("ID requested.");
                        message.reply(message.to);
                        break;
                    case 'getevents':
                        logger("Events requested.");
                        sendEvents(message.to)
                        break;
                    case 'getupcomingevents':
                        logger("Upcoming events requested.");
                        sendUpcomingEvents(message.to)
                        break;
                    case 'new':
                        logger("New method test requested.");
                        newEvents(message.to)
                        break;
                    case 'list':
                        logger("List requested.");
                        sendDefaultList(message.to)
                        break;
                    default:
                        logger("No matches for the requested message.");
                        logger(message)
                        break;
                }
            })
        }
    });

    client.initialize();
}

async function newEvents(chatId) {
    let events = require("./events.json");
    Object.keys(events).map(function (event) {console.log(events[event]); client.sendMessage(chatId, moovi.eventStringify(events[event]))})
}

/**Function that sends each formatted event to the specified chat.*/
async function sendEvents(chatId) {
    (await moovi.getEvents(await moovi.getCalendarData())).map(function (event, index) {
        client.sendMessage(chatId, moovi.eventStringify(event)) // TODO: split events.
    })
}

/**Function that sends each formatted event to the specified chat but only for upcoming events.*/
async function sendUpcomingEvents(chatId) {
    (await moovi.getUpcomingEvents(await moovi.getCalendarData())).map(function (event, index) {
        client.sendMessage(chatId, moovi.eventStringify(event)) // TODO: split events.
    })
}

/**Function that sends a formatted event list to the specified chat.*/
async function sendDefaultList(chatId) {
    let sections = [{
        title: 'Funciones',
        rows: [{
            id: "events_id",
            title: 'Ver eventos',
            description: 'Devuelve todos los eventos de Ing Informatica'
        }, {
            title: 'ListItem2'
        }]
    }];

    client.sendMessage(chatId, new List('List body', 'Interacciones', sections, 'Title', 'footer'))
}

/**Function that serves as handler for list-specific replies.*/
async function listReplyHandler(message) {
    switch (message.selectedRowId) {
        case 'events_id': {
            sendEvents(message.from)
        }
        default:
            return "Algo ha fallado, prueba de nuevo.";
    }
}


// Initialization:

init()
