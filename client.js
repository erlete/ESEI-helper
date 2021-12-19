const moovi = require('./mooviFunctions') //Requerimos las funciones de manejo de Moovi

// 2. Content handling:
async function main() {
    console.log(moovi.getEvents(await moovi.getCalendarData()))

}
main()