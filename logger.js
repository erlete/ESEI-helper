// Dependencies and declarations:

const {
    format,
    transports,
    loggers
} = require('winston');
const {
    combine,
    timestamp,
    label,
    printf,
} = format;

const myFormat = printf(({
    level,
    message,
    label,
    timestamp
}) => {
    return JSON.stringify({
        type: label,
        level: level,
        timestamp: new Date(timestamp).toLocaleString("en-GB", {
            timeZone: "Europe/Madrid"
        }),
        message: message
    });
})


// Logger configurations:

// Logger configuration for admins.
loggers.add('admin', {
    format: combine(
        label({
            label: 'Admin_log'
        }),
        timestamp(),
        myFormat,
    ),
    transports: [
        new transports.Console({}),
        new transports.File({
            level: 'info',
            filename: 'logs/admin.log'
        }),
        new transports.File({
            level: 'error',
            filename: 'logs/admin_errors.log'
        })
    ],
    rejectionHandlers: [
        new transports.File({
            filename: 'logs/rejections.log'
        })
    ]
});

// Logger configuration for users.
loggers.add('user', {
    format: combine(
        label({
            label: 'user_log'
        }),
        timestamp(),

        myFormat
    ),
    transports: [
        new transports.Console({}),


        new transports.File({
            level: 'info',
            filename: 'logs/user.log'
        }),
        new transports.File({
            level: 'error',
            filename: 'logs/user_errors.log'
        })
    ]
});

// Logger configuration for clients.
loggers.add('client', {
    format: combine(
        label({
            label: 'client_log'
        }),
        timestamp(),

        myFormat
    ),
    transports: [
        new transports.Console({}),
        new transports.File({
            level: 'info',
            filename: 'logs/client.log'
        }),
        new transports.File({
            level: 'error',
            filename: 'logs/client_errors.log'
        })
    ]
});

// Logger configuration for new events.
loggers.add('events', {
    format: combine(
        label({
            label: 'events_log'
        }),
        timestamp(),

        myFormat
    ),
    transports: [
        new transports.Console({}),
        new transports.File({
            level: 'info',
            filename: 'logs/events.log'
        }),
        new transports.File({
            level: 'error',
            filename: 'logs/events_errors.log'
        })
    ]
});

const admin = loggers.get('admin');
const user = loggers.get('user');
const client = loggers.get('client');
const events = loggers.get('events');


// Module exports:

module.exports = {
    admin,
    user,
    client,
    events
}
