const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
dotenv.config()
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'https://azizulian-reg-finder.vercel.app', // আপনার লাইভ ফ্রন্টএন্ড ইউআরএল
        'http://localhost:3000'                    // লোকালহোস্টে টেস্ট করার জন্য
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));

app.use(express.json())


const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function server() {
    try {
        // await client.connect();

        // ডেটাবেস এবং কালেকশন তৈরি
        const db = client.db("Azizul-studentPortal-DB");
        const studentsCollection = db.collection("students");

        // ১. নতুন শিক্ষার্থীর তথ্য জমা নেওয়ার POST রুট (ভ্যালিডেশনসহ)
        app.post('/api/students', async (req, res) => {
            const { name, regNumber, phnNumber } = req.body;
            console.log("✅FrontEnd : ", name, regNumber, phnNumber)
            // console.log("SERVER", req.body)

            // Empty submission database validation
            if (!name || !name.trim() || !regNumber) {
                return res.status(400).send({
                    success: false,
                    error: "নাম এবং রেজিস্ট্রেশন নাম্বার দেওয়া আবশ্যক!"
                });
            }

            const regNumInt = parseInt(regNumber);
            const phnNumberInt = parseInt(phnNumber);

            // Registration number (Duplicate Validation)
            const isExist = await studentsCollection.findOne({ regNumber: regNumInt });
            if (isExist) {
                return res.status(400).send({
                    success: false,
                    error: "এই রেজিস্ট্রেশন নাম্বারটি আগেই ব্যবহার করা হয়েছে।"
                });
            }

            // // নতুন ডেটা অবজেক্ট
            const newStudent = {
                name: name.trim(),
                regNumber: regNumInt,
                phnNumber: phnNumberInt
            };

            const result = await studentsCollection.insertOne(newStudent);
            res.send({
                success: true,
                message: "সফলভাবে ডাটাবেজে সংরক্ষণ হয়েছে!",
                result
            });
        });

        app.get('/api/data/students/info', async (req, res) => {
            const result = await studentsCollection.find().toArray()
            // console.log(result)
            res.send(result)
        })


        // ২. রেজিস্ট্রেশন নাম্বার দিয়ে সার্চ এবং আগের-পরের সিট বের করার GET রুট
        app.get('/api/search/:regNumber', async (req, res) => {
            const targetReg = parseInt(req.params.regNumber);

            if (isNaN(targetReg)) {
                return res.status(400).send({ success: false, error: "সঠিক রেজিস্ট্রেশন নাম্বার দিন।" });
            }

            // মূল রেকর্ডটি খোঁজা (Current Seat)
            const current = await studentsCollection.findOne({ regNumber: targetReg });

            if (!current) {
                return res.status(404).send({ success: false, error: "কোনো তথ্য পাওয়া যায়নি!" });
            }

            // ঠিক আগের সিটের রেকর্ড (Previous Seat)
            // রেজিস্ট্রেশন নাম্বার ছোটোদের মধ্যে সবচেয়ে বড়টি ($lt এবং sort -1)
            const previousArray = await studentsCollection.find({ regNumber: { $lt: targetReg } })
                .sort({ regNumber: -1 })
                .limit(1)
                .toArray();
            const previous = previousArray.length > 0 ? previousArray[0] : null;

            // ঠিক পরের সিটের রেকর্ড (Next Seat)
            // রেজিস্ট্রেশন নাম্বার বড়দের মধ্যে সবচেয়ে ছোটটি ($gt এবং sort 1)
            const nextArray = await studentsCollection.find({ regNumber: { $gt: targetReg } })
                .sort({ regNumber: 1 })
                .limit(1)
                .toArray();
            const next = nextArray.length > 0 ? nextArray[0] : null;

            // ফ্রন্টএন্ডে অবজেক্ট আকারে ডেটা পাঠানো
            res.send({ previous, current, next });
        });


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
server().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Student Portal Server is Running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})