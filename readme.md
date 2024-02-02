# Gracoon Server

Gracoon is an online collaborative graph editor.

An instance is running on [gracoon.com](http://gracoon.com) :rocket:

The client project can be found there: [https://github.com/lucas-test/gracoon-client](https://github.com/lucas-test/gracoon-client)

## Features

The server apply the requests from the users: add, remove graph elements, generate classical graphs, apply global modifications to the graph.

It also manage the following objects:

- strokes
- text zones
- rectangular shapes


## Install, build and launch server

Fix the port you want to use in the `.env` file.

    npm i
    cp src/.env.json.example src/.env.json 
    npm run build
    mkdir boards
    npm start
