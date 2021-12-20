// Dependencies:

const moovi = require('./mooviFunctions');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, List } = require('whatsapp-web.js');

let client; // FIXME: should this be here?
const SESSION_FILE_PATH = './session.json';


// Helper functions:

/**Function that adds a timestamp to the logged message (debugging purposes).*/
function logger(message, content = '') {
    let now = new Date(Date.now());
    console.log(`[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}] -> ${content} ${JSON.stringify(message)}\n`);
}


// Bot's functions:

/**Function that contains Whatsapp's bot's mainloop.*/
async function init() {

    // Session authentication:

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
            logger(message, "List response detected.");
            listReplyHandler(message);
        } else if (message.fromMe) {
            switch (message.body) {
                case 'getid':
                    logger(message, "ID requested.");
                    message.reply(message.to);
                    break;
                case 'getevents':
                    logger(message, "Events requested.");
                    sendEvents(message);
                    break;
                case 'cachedevents':
                    logger(message, "Cached events requested.");
                    cachedEvents(message);
                    break;
                case 'list':
                    logger(message, "List requested.");
                    sendEventList(message);
                    break;
                default:
                    logger(message, "No matches for the requested message.");
                    break;
            }
        } else {
            logger(message, "Non-commanded message.");
        }
    });

    client.initialize();
}

async function cachedEvents(message) {
    let events = require(moovi.DATABASE_FILE);
    Object.keys(events).map(function (event) {client.sendMessage(message.to, moovi.eventStringify(events[event]))});
}

/**Function that sends each formatted event to the specified chat but only for upcoming events.*/
async function sendEvents(message) { // DEPRECATED
    (await moovi.getEvents(await moovi.getCalendarData())).map(function (event) {
        client.sendMessage(message.to, moovi.eventStringify(event));
    });
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
