const {
    MongoClient
} = require("mongodb")
require('dotenv').config();

let DBClient, ESEI_DB, adminsColl;
async function initDB() {
    return new Promise(async function (resolve, reject) {
        try {
            DBClient = await MongoClient.connect(process.env.MONGO_URL, {
                connectTimeoutMS: 2000,
                retryWrites: true,
                useNewUrlParser: true,
            })
            ESEI_DB = DBClient.db("ESEI_DB")
            adminsColl = ESEI_DB.collection("admins")
            eventsColl = ESEI_DB.collection("events")

            console.log(adminsColl)
            let events = await eventsColl.find({
                // date: {
                // 	$gt: Date.now()
                // }
            }).toArray()
            console.log(events)
            resolve()
        } catch (e) {
            console.log(e)
            reject(e)
        }
    })
}

async function adminInit() {
    return new Promise(async function (resolve, reject) {
        let admins = [{
            name: "Víctor",
            ws_id: "34604052393@c.us"
        }, {
            name: "Lete",
            ws_id: "34620703668@c.us"
        }]
        try {
            admins.forEach(async function (admin, index) {
                let a =await adminsColl.updateOne({
                        name: admin.name
                    }, {
                        $set: admin
                    },

                    {
                        upsert: true
                    },
                )
                console.log(a)
                if (index == admins.length - 1) {
                    resolve("Admins initialized")
                }
            })
        } catch (e) {
            reject(e)
        }
    })
}
async function main() {
    if (!ESEI_DB) {
        await initDB()
    }
    console.log(await adminInit())
    DBClient.close()
}
main()