import express from "express"
import cors from "cors"

const app = express();

// Configs
app.use(cors());
app.use(express.json());

DATABASE_URL = "";


app.post("/participants", (req, res) => {
    res.send("OK");
});

app.get("/participants", (req, res) => {
    res.send("OK");
});

app.post("/messages", (req, res) => {
    res.send("OK");
});

app.get("/messages", (req, res) => {
    res.send("OK");
});

app.post("/status", (req, res) => {
    res.send("OK");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Rodando servidor na porta ${PORT}`));