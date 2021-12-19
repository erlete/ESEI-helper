const axios = require("axios");
const fs = require("fs");

let cookie = "e535f2184f715ef1b7b37fcf602c6c23";
const out = "./outs.json"

async function get_data(year=2021, month=11) {
	return (await axios.post(
		"https://moovi.uvigo.gal/lib/ajax/service.php?sesskey=wQ2GngY4A6&info=core_calendar_get_calendar_monthly_view",
		[{"index":0,"methodname":"core_calendar_get_calendar_monthly_view","args":{"year":year,"month":month,"courseid":1,"categoryid":0,"includenavigation":false,"mini":true,"day":1}}],
		{headers: {Cookie: `MoodleSession=${cookie}`}}
	)).data[0]
}


function get_date(seconds) {
	return new Date(seconds * 1000);
}


get_data().then(function(response) {
	let weeks = response.data.weeks;

	// let days = weeks.map(function (week, index) {return week.days.map(function (day, index) {return day.daytitle})});

	let days = weeks.map(function(week) {return week.days});
	console.log(days);

	console.log("\n\n\n\n\n\n\n");

	// let days = weeks.map(function(week) {return week.days.map(function(day) {return day.daytitle})}).flat();
	// console.log(days);

	console.log("\n\n\n\n\n\n\n");

	let events = days.map(function(day) {return day.events.map(function(event) {return get_date(event.timestart)})}).flat();
	console.log(events);

	let courses = weeks.map(function(week) {return week.days.map(function(day) {return day.events.map(function(event) {return event.course[0].timestart})})}).flat();
	console.log(courses);
})
