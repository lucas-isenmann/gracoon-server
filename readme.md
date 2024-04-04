# Gracoon Server

Gracoon is an online collaborative graph editor.
This repository is the api/server of Gracoon.

An instance is running on [gracoon.com](https://gracoon.com) :rocket:

The client project can be found there: [https://github.com/lucas-test/gracoon-client](https://github.com/lucas-test/gracoon-client)

## Features

The server applies the requests from the users: add, remove graph elements, generate classical graphs, apply global modifications to the graph.

It also manage the following objects:

- strokes
- text zones
- rectangular shapes


## Install, build and launch server

Fix the port you want to use in the `.env.json` file, the path to ssl keys and the Cors origin.

    npm i
    cp src/.env.json.example src/.env.json 
    npm run build
    mkdir boards
    npm start
