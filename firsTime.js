const {
    MongoClient
} = require("mongodb")

let DBClient, ESEI_DB, adminsColl;
async function initDB() {
    return new Promise(async function (resolve, reject) {
        try {
            DBClient = await MongoClient.connect("mongodb://127.0.0.1:27017/", {
                connectTimeoutMS: 2000,
                retryWrites: true,
                useNewUrlParser: true,
            })
            ESEI_DB = DBClient.db("ESEI_DB")
            adminsColl = ESEI_DB.collection("admins")
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
                await adminsColl.updateOne({
                        name: admin.name
                    }, {
                        $set: admin
                    },

                    {
                        upsert: true
                    },
                )
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