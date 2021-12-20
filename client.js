const moovi = require('./mooviFunctions') //Requerimos las funciones de manejo de Moovi
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const {
    Client,
    List
} = require('whatsapp-web.js');
let client;
// Client initialization
async function init() {
    // console.log(moovi.getEvents(await moovi.getCalendarData()))
    const SESSION_FILE_PATH = './session.json';
    let sessionData;

    if (fs.existsSync(SESSION_FILE_PATH)) {
        sessionData = require(SESSION_FILE_PATH);
    }

    client = new Client({
        session: sessionData
    });

    client.on('qr', qr => {
        qrcode.generate(qr, {
            small: true
        });

    });
    client.on('ready', () => {
        console.log('Client is ready');
        var now = new Date();
        var ms_to_12 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0, 0) - now;
        console.log(`Se va a esperar --> ${ms_to_12} milisegundos, es decir se ejecutará la función a las ${new Date (Date.now() + ms_to_12)}`)
        setTimeout(function () {
            sendEvents()
            console.log("Empezando ciclo de 24 horas")
            setInterval(function () {
                sendEvents()
            }, 86400000);
        }, ms_to_12);


    });

    client.on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
            if (err) {
                console.error(err);
            }
        });
    });


    client.on('message_create', message => {
        console.log(message)
        if (message.type == 'list_response') {
            listReplyHandler(message)
        }
        if (message.fromMe && message.body.startsWith("!esei")) {
            message.body.match(/(?<=\-)\S*/g).map(function (command, index) {
                switch (command) {
                    case 'getid':
                        message.reply(message.to);
                        break;
                    case 'getevents':
                        sendEvents(message.to)
                        break;
                    case 'list':
                        sendDefaultList(message.to)
                        break;
                    default:
                        break;
                }
            })
        }

    });
    client.initialize();
}
async function sendEvents(chatId) {
    (await moovi.getEvents(await moovi.getCalendarData())).map(function (event, index) {
        client.sendMessage(chatId, moovi.eventStringify(event))
    })


}
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

async function listReplyHandler(message) {

    switch (message.selectedRowId) {
        case 'events_id': {
            sendEvents(message.from)

        }

        default:
            return "Algo ha fallado, prueba de nuevo.";


    }


}

init()