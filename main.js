const axios = require("axios");

// Constants:
const COOKIE = "e535f2184f715ef1b7b37fcf602c6c23";
const CURRENT_YEAR = new Date(Date.now()).getFullYear();
const CURRENT_MONTH = new Date(Date.now()).getMonth() + 1;

// Helper functions:
function textify(event) {
	return `Name: ${event.name}\nDescription: ${event.description}\nCourse name: ${event.course_name}\nCourse category: ${event.course_category}\nDate: ${event.date}\nURL: ${event.url}`
}

function format_difference(date1, date2) {
	let diff = Math.abs(date1 - date2); // returns the ms difference.

	days = diff / 86400000
	hours = days % 1 * 24;
	minutes = hours % 1 * 60;
	seconds = minutes % 1 * 60;

	return {days: Math.floor(days), hours: Math.floor(hours), minutes: Math.floor(minutes), seconds: Math.floor(seconds)}
}

// 1. Content retrieval:
async function get_weeks(year=CURRENT_YEAR, month=CURRENT_MONTH) {
	let currentMonth = (await axios.post(
		"https://moovi.uvigo.gal/lib/ajax/service.php?sesskey=wQ2GngY4A6&info=core_calendar_get_calendar_monthly_view",
		[{"index":0,"methodname":"core_calendar_get_calendar_monthly_view","args":{"year":year,"month":month,"courseid":1,"categoryid":0,"includenavigation":false,"mini":true,"day":1}}],
		{headers: {Cookie: `MoodleSession=${COOKIE}`}}
	)).data[0].data.weeks;

	let nextMonth = (await axios.post(
		"https://moovi.uvigo.gal/lib/ajax/service.php?sesskey=wQ2GngY4A6&info=core_calendar_get_calendar_monthly_view",
		[{"index":0,"methodname":"core_calendar_get_calendar_monthly_view","args":{"year":month == 12 ? year + 1 : year,"month": month == 12 ? 1 : month + 1,"courseid":1,"categoryid":0,"includenavigation":false,"mini":true,"day":1}}],
		{headers: {Cookie: `MoodleSession=${COOKIE}`}}
	)).data[0].data.weeks;

	return currentMonth.concat(nextMonth);
}

// 2. Content handling:
get_weeks().then(function(response) {
	let days = response.map(function (week) {return week.days}).flat();
	let daytitles = days.map(function (day) {return day.daytitle});
	let events = days.map(function (day) {return day.events}).flat().map(function (event) {return {
		name: event.name,
		description: event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g) == null ? [] : event.description.match(/(?<=[>])[\s\S]*?(?=[<])/g).filter(function (content) {return content.length > 0 ? content : null}).map(function (content) {return content.trim()}).join(' '),
		course_name: "course" in event ? event.course.fullnamedisplay : "Undefined course.",
		course_category: "course" in event ? event.course.coursecategory : "Undefined course.",
		date: new Date(event.timestart * 1000),
		url: event.url
	}})

	// Tests:
	for (i = 0; i < events.length; i++) {
		console.log(textify(events[i])); // displays an event.
		console.log(format_difference(new Date(Date.now()), events[0].date) + '\n'); // displays the remaning time.
	}
})
