const axios = require("axios");

// Constants:
const COOKIE = "e535f2184f715ef1b7b37fcf602c6c23";
const CURRENT_YEAR = new Date(Date.now()).getFullYear();
const CURRENT_MONTH = new Date(Date.now()).getMonth();

// Helper functions:
function textify(event) {
	return `Name: ${event.name}\nDescription: ${event.description}\nCourse name: ${event.course_name}\nCourse category: ${event.course_category}\nDate: ${event.date}\nURL: ${event.url}`
}

// 1. Content retrieval:
async function get_data(year=CURRENT_YEAR, month=CURRENT_MONTH) {
	return (await axios.post(
		"https://moovi.uvigo.gal/lib/ajax/service.php?sesskey=wQ2GngY4A6&info=core_calendar_get_calendar_monthly_view",
		[{"index":0,"methodname":"core_calendar_get_calendar_monthly_view","args":{"year":year,"month":month,"courseid":1,"categoryid":0,"includenavigation":false,"mini":true,"day":1}}],
		{headers: {Cookie: `MoodleSession=${COOKIE}`}}
	)).data[0]
}

// 2. Content handling:
get_data().then(function(response) {
	let weeks = response.data.weeks.map(function (week) {return week.days});
	let days = weeks.flat()
	let daytitles = days.map(function (day) {return day.daytitle});
	let events = days.map(function (day) {return day.events}).flat().map(function (event) {return {
		name: event.name,
		description: event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g) == null ? [] : event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g).filter(function (content) {return content.length > 0 ? content : null}).map(function (content) {return content.trim()}).join(' '),
		course_name: event.course.fullnamedisplay,
		course_category: event.course.coursecategory,
		date: new Date(event.timestart * 1000),
		url: event.url
	}})
	console.log(textify(events[0]));
})
