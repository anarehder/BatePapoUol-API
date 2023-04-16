import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const app = express();

// Configs
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect()
    console.log("MongoDB conectado!")
} catch (err) {
    console.log(err.message)
}
const db = mongoClient.db()


app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const userSchema = joi.object({
        name: joi.string().required(),
    })
    const validation = userSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try {
        const user = await db.collection("participants").findOne({ name: name })
        if (user) return res.status(409).send("Esse usuário já existe!")

        const newUser = {name: name, lastStatus: Date.now()};
        const newMessage = { from: name, to: "Todos", text: "entra na sala...", 
            type: 'status', time: dayjs().format('HH:mm:ss') };
        await db.collection("participants").insertOne(newUser);
        await db.collection("messages").insertOne(newMessage);
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message)
    }
});

app.get("/participants", async (req, res) => {
    try {
        const listaParticipantes = await db.collection("participants").find().toArray()
        console.log(listaParticipantes)
        res.send(listaParticipantes)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const user = req.headers.user;

    const messageSchema = joi.object({
        to:joi.string().min(1).required(),
        text: joi.string().min(1).required(),
        type: joi.string().min(1).valid('message', 'private_message').required()
    })

    const validation = messageSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try {
        const userAvailable = await db.collection("participants").findOne({ name: user });
        if (userAvailable) {
            const newMessage = {from: user, to, text, type, time: dayjs().format('HH:mm:ss')};
            await db.collection("messages").insertOne(newMessage);
            return res.sendStatus(201);
        }
        else {
            return res.sendStatus(422)
        }
    } catch (err) {
        res.status(500).send(err.message)
    }
});

app.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const { limit } = req.query;

    if(limit){
        if(Number(limit)<= 0 || isNaN(Number(limit))){
            return res.sendStatus(422);
        }
    }

    try {
        const mensagensDisponiveis = await db.collection("messages").
            find({ $or: [ {type: "status"}, {to: "Todos"}, {to: user}, {from: user} ]}).toArray();
        if(limit){
            const mensagensExibidas = mensagensDisponiveis.slice(-Number(limit));
            return res.send(mensagensExibidas);
        }
        return res.send(mensagensDisponiveis);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;

    if(!user){
        return res.sendStatus(404);
    }

    try {
        const userUpdate = await db.collection("participants").findOne({ name: user })
        if (!userUpdate) {
            return res.sendStatus(404);
        }

        const id = userUpdate._id;
        const newUser = {name: user, lastStatus: Date.now()};

        await db.collection("participants").updateOne({ _id: new ObjectId(id) }, { $set: newUser});

        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message)
    }
});

async function intervalFunc() {
    try{
        const listaUsuarios = await db.collection("participants").find().toArray();

        const usuariosInativos = listaUsuarios.filter((user) => (Date.now()-user.lastStatus)>10000);

        usuariosInativos.forEach( async user => {
            await db.collection("messages").insertOne({ from: user.name, to: "Todos", 
                text:"sai da sala...", type:"status", time: dayjs().format('HH:mm:ss') })
            await db.collection("participants").deleteOne({ _id: user._id });
        })

    }catch(err){
        console.log(err)
    }
}
  
setInterval(intervalFunc, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Rodando servidor na porta ${PORT}`));