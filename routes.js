const express = require("express");
const router = express.Router();
const { getConnectedClient } = require("./database");
const { ObjectId } = require("mongodb");
const logger = require("./index").logger;

const getCollection = () => {
    const client = getConnectedClient();
    const collection = client.db("todosdb").collection("todos");
    return collection;
}

// GET /todos
router.get("/todos", async (req, res) => {

    logger.info("Request for getting all todos : Request Path - [GET : /todos]");
    const collection = getCollection();
    const todos = await collection.find({}).toArray();

    res.status(200).json(todos);
});

// POST /todos
router.post("/todos", async (req, res) => {

    logger.info("Request for creating a todo : Request Path - [POST : /todos]");
    const collection = getCollection();
    let { todo } = req.body;

    if (!todo) {
        return res.status(400).json({ mssg: "error no todo found"});
    }

    todo = (typeof todo === "string") ? todo : JSON.stringify(todo);

    const newTodo = await collection.insertOne({ todo, status: false });

    res.status(201).json({ todo, status: false, _id: newTodo.insertedId });
});

// DELETE /todos/:id
router.delete("/todos/:id", async (req, res) => {

    logger.info(`Request for deleting a todo : Request Path - [DELETE : /todos/${req.params.id}]`);

    const collection = getCollection();
    const _id = new ObjectId(req.params.id);

    const deletedTodo = await collection.deleteOne({ _id });

    res.status(200).json(deletedTodo);
});

// PUT /todos/:id
router.put("/todos/:id", async (req, res) => {

    logger.info(`Request for updating a todo : Request Path - [PUT : /todos/${req.params.id}]`);

    const collection = getCollection();
    const _id = new ObjectId(req.params.id);
    const { status } = req.body;

    if (typeof status !== "boolean") {
        return res.status(400).json({ mssg: "invalid status"});
    }

    const updatedTodo = await collection.updateOne({ _id }, { $set: { status: !status } });

    res.status(200).json(updatedTodo);
});

module.exports = router;