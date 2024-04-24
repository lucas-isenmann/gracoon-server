# Gracoon Server

Gracoon is an online collaborative graph editor.
This repository is the api/server of Gracoon.

An instance is running on [gracoon.com](https://www.gracoon.com) :rocket:

The client project can be found there: [https://github.com/lucas-test/gracoon-client](https://github.com/lucas-test/gracoon-client)

## Features

The server applies the requests from the users: add, remove graph elements, generate classical graphs, apply global modifications to the graph.

It also manage the following objects:

- strokes
- text zones
- rectangular shapes


## Install, build and launch server

Copy the example environment configuration file example:

    cp src/.env.json.example src/.env.json 

In `.env.json` set the following attributes:
    - the port you want to use,
    - the path where the boards are stored,
    - the path to ssl keys,
    - the Cors origin.

For a local server you can create self certificated keys with: 

    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

Then create a directory where to store the boards (the server should have access to it):

    mkdir /home/user/boards

Then run the following commands to install, build and start the server.

    npm ci
    npm run build
    npm start
