require("dotenv").config();
const express = require("express");
const client = require("prom-client");
const { connectToMongoDB } = require("./database");
const path = require("path");
const cors = require('cors');
const app = express();
const winston = require("winston");
const responseTime = require("response-time");

// const LokiTransport = require("winston-loki");
const options = {
  transports: [
    new (winston.transports.Console)(),
    // new LokiTransport({
    //   host: process.env.LOKI_URL,
    //   labels: {
    //     appName: "express-application"
    //   }
    // })
  ]
};

const logger = winston.createLogger(options);

exports.logger = logger;

// Middleware section
app.use(express.json());
app.use(cors());

// Creating custom metrics
const reqResTime = new client.Histogram({
    name: "http_express_req_res_time",
    help: "This will describe how much time was taken by req/res",
    labelNames: ["method", "route", "status_code"],
    buckets: [1, 50, 100, 200, 400, 700, 900, 1500, 2500]
});

const totalRequestCounter = new client.Counter({
    name: "total_req",
    help: "Tells total req"
})

app.use(responseTime((req, res, time) => {
    totalRequestCounter.inc();
    reqResTime.labels({
        method: req.method,
        route: req.url,
        status_code: req.statusCode
    }).observe(time)
}))

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({
    register: client.register
})

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "build/index.html"));
});

// Heath check route
app.get("/health-check", (req, res) => {

    const health_check = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now()
    }

    try {
        res.send(health_check);
    } catch (error) {
        health_check.message = error;
        res.status(503).send();
    }

})

// Exposing the metrics 
app.get("/metrics", async (req, res) => {
    res.setHeader("Content-Type", client.register.contentType);
    let metrics = await client.register.metrics();
    res.send(metrics);
})


const router = require("./routes");
app.use("/api", router);

const port = process.env.PORT;

async function startServer() {
    await connectToMongoDB();
    app.listen(port, () => {
        console.log(`Server is listening on http://localhost:${port}`);
    });
}
startServer();