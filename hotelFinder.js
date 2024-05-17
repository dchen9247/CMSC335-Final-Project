const axios = require("axios");
const http = require("http")
const path = require("path");
const express = require("express");
const ejs = require('ejs');
const app = express();
const bodyParser = require("body-parser");

process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write(`Usage hotelFinder.js portNumber \n`);
    process.exit(1);
}

const portNumber = process.argv[2];

app.use(express.static(path.join(__dirname, 'public')))

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

console.log(`Web server started and running at: http://localhost:${portNumber}`);


app.get("/", (request, response) => {
    response.render("index");
});
app.get("/browse", (request, response) => {
    response.render("browse", {portNumber: portNumber, table: '<div></div>'});
});
app.get("/register", (request, response) => {
    response.render("register", {portNumber: portNumber});
});
app.get("/checkReservation", (request, response) => {
    response.render("checkReservation", {portNumber: portNumber});
});
app.get("/remove", (request, response) => {
    response.render("removeReservations", {portNumber: portNumber});
});
app.post("/browse", (request, response) => {
    async function main() {
        let {checkInDate, checkOutDate, numberOfPeople} = request.body
        let html =  await getHotelData(checkInDate, checkOutDate, numberOfPeople)
        let params = 
        { portNumber: portNumber,
          hotelshtml: html,
        }
        response.render("browsing", params)
    }
    main()
});
app.post("/confirmRemoval", (request, response) => {
    async function main() {
        let {email} = request.body
        const path = require("path");
        require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
        const uri = process.env.MONGO_CONNECTION_STRING;
        const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
        const { MongoClient, ServerApiVersion } = require('mongodb');
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            await deleteOne(client, databaseAndCollection, email)
            response.render("confirmRemoval");
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main()
});
app.post("/confirmRegistration", (request, response) => {
    let {name, email, hotel, numberOfPeople, backgroundInformation} = request.body;
    let confirmationVariables = 
        {
            name: name,
            email: email,
            hotel: hotel,
            numberOfPeople: numberOfPeople,
            backgroundInformation: backgroundInformation
        }
    response.render("confirmRegistration", confirmationVariables)
    

    async function main() {
        const path = require("path");
        require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
        const uri = process.env.MONGO_CONNECTION_STRING;
        const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
        const { MongoClient, ServerApiVersion } = require('mongodb');
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            let clientData = confirmationVariables
            await insertClient(client, databaseAndCollection, clientData)
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main()
});

app.post("/confirmEmail", (request, response) => {
    let {email} = request.body;

    async function main() {
        const path = require("path");
        require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
        const uri = process.env.MONGO_CONNECTION_STRING;
        const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
        const { MongoClient, ServerApiVersion } = require('mongodb');
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            let confirmationVariables = await lookUpByEmail(client, databaseAndCollection, email)
            response.render("confirmRegistration", confirmationVariables)
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main()
});

app.listen(portNumber)
const prompt = "Stop to shutdown the server: "
process.stdout.write(prompt)
process.stdin.on('readable', () => {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command == "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

async function insertClient(client, databaseAndCollection, clientData) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(clientData);
}

async function lookUpByEmail(client, databaseAndCollection, email) {
    let filter = {email: email};
    const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne(filter);
    let object = {
        name: "NONE",
        email: "NONE",
        hotel: "NONE",
        numberOfPeople: "NONE",
        backgroundInformation: "NONE"
    }
    if (result) {
        object = {
            name: result.name,
            email: result.email,
            hotel: result.hotel,
            numberOfPeople: result.numberOfPeople,
            backgroundInformation: result.backgroundInformation
        }
    }
    return object
}

async function deleteOne(client, databaseAndCollection, targetEmail) {
    let filter = {email:targetEmail};
    const result = await client.db(databaseAndCollection.db)
                   .collection(databaseAndCollection.collection)
                   .deleteOne(filter);
}

async function getHotelData(checkInDate, checkOutDate, guests) {
    const axios = require('axios');

    const options = {
    method: 'GET',
    url: 'https://hotels-com-provider.p.rapidapi.com/v2/hotels/search',
    params: {
        region_id: '6057494',
        locale: 'en_US',
        checkin_date: checkInDate,
        sort_order: 'DISTANCE',
        adults_number: guests,
        domain: 'US',
        checkout_date: checkOutDate,
        page_number: '1',
        available_filter: 'SHOW_AVAILABLE_ONLY'
    },
    headers: {
        'X-RapidAPI-Key': '0d08a0a467mshc838b055749ffc9p1081a7jsnb3e24cc85d86',
        'X-RapidAPI-Host': 'hotels-com-provider.p.rapidapi.com'
    }
    };
    try {
        const response = await axios.request(options);
        let properties = response.data.properties
        let html = ``
        properties.forEach((property)=>{
            html+=`<div id = "hotelitem">`
            html+=`<div id = "hoteltext">`
            html+=`<p><strong>${property.name}</strong></p>`
            html+= `<p><strong>Price per Night:</strong> ${property.price.lead.formatted}</p>`
            html+= `<p><strong>Rating: </strong>${property.reviews.score}</p><br>`
            html+= `</div>`
            html+=`<div id = "hotelimg">`
            html+=`<img src = "${property.propertyImage?.image?.url}" alt = "${property.name}"><br>`
            html+=`</div>`
            html+=`</div>`
        })
        return html
    } catch (error) {
        console.error(error);
    }
}
