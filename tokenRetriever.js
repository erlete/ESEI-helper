// Introduce tu nombre y contraseña de Moovi entre las comillas de las variables definidas abajo:
let usuario = '58442559L'
let contrasena = 'SAgm1027??'

const axios = require('axios')

async function getWsToken(username, password) {
	console.log((await axios.post('https://moovi.uvigo.gal/login/token.php', {}, {
		params: {
			username: username,
			password: password,
			service: 'moodle_mobile_app'
		}
	})).data.token)
}

getWsToken(usuario, contrasena)
