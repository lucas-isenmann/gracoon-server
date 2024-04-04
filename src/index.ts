import { Coord, BasicVertexData, BasicVertex, Rectangle, BasicLinkData, BasicLink, ORIENTATION, Stroke, Area, TextZone } from "gramoloss";
import ENV from './.env.json';
import { HistBoard } from './hist_board';
import { AddElements } from './modifications/implementations/add_element';
import { ApplyModifyer } from './modifications/implementations/apply_modifyer';
import { DeleteElements } from './modifications/implementations/delete_elements';
import { GraphPaste } from './modifications/implementations/graph_paste';
import { MergeVertices } from './modifications/implementations/merge_vertices';
import { ResizeElement } from './modifications/implementations/resize_element';
import { TranslateElements } from './modifications/implementations/translate_elements';
import { UpdateElements } from './modifications/implementations/update_element';
import { SENSIBILITY } from './modifications/modification';
import { getRandomColor } from './utils';
import PACKAGE from '../package.json';
import * as fs from 'fs';

import { Server, Socket } from 'socket.io';
import { SubdivideLinkModification } from "./modifications/implementations/subdivide_link";

import { Client } from "./user";
import { GenerateGraph } from "./modifications/implementations/generate_graph";
import { handleGetParameterInfo } from "./handler";





// Initialize the server
// export const io = new Server({
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// io.listen(ENV.port);

// console.log("----------------------------------------------");
// console.log(`Server started at http://localhost:${ENV.port}`);
// console.log(`version: ${PACKAGE.version}`);
// console.log("----------------------------------------------");


import https from 'https';

const httpsServer = https.createServer({
    key: fs.readFileSync(ENV.keyPath),
    cert: fs.readFileSync(ENV.certPath)
});

export const io = new Server(httpsServer, {
    cors: {
        origin: ENV.corsOrigin
    }
});

httpsServer.listen(ENV.port, () => {
    console.log("----------------------------------------------");
    console.log(`Server started at https://localhost:${ENV.port}`);
    console.log(`version: ${PACKAGE.version}`);
    console.log(`corsOrigin: ${ENV.corsOrigin}`);
    console.log("----------------------------------------------");
});




/*
socket.emit                   just to the socket
io.sockets.in(roomId).emit    to all the room
socket.to(roomId).emit        to all the room except the socket
*/


export const boards = new Map<string, HistBoard>();



export function emitGraphToRoom(board: HistBoard, s: Set<SENSIBILITY>) {
    io.sockets.in(board.roomId).emit('graph', [...board.graph.vertices.entries()], [...board.graph.links.entries()], [...s]);
}

export function broadcastInRoom(roomId: string, name: string, data: any, s: Set<SENSIBILITY>) {
    io.sockets.in(roomId).emit(name, data, [...s]);
}


io.sockets.on('connection', function (socket: Socket) {

    // Initialization
    const userAgent = socket.request.headers['user-agent'];
    let isBot = false;
    
    if (typeof userAgent != "undefined" && userAgent.indexOf("bot") !== -1){
        isBot = true;
     }

    console.log("--------------------------------")
    console.log("connection from ", socket.id, isBot ? "BOT" : "");
    console.log("   ", socket.request.headers['user-agent']);
    console.log("   ", socket.handshake.address)
    const client = new Client(socket, getRandomColor());
    console.log("--------------------------------")

    // ---------------------------------------------------------
    // Setup General API
    socket.on("get-public-boards", handleGetPublicRooms);
    socket.on("get-parameter-info", handleGetParameterInfo);

    function handleGetPublicRooms(){
        const data = new Array<string>();
        for (const [id, board] of boards.entries()){
            data.push( `${id} ${board.creationDate} ${board.modifications_stack.length} ${board.clients.size}` );
        }
        socket.emit("get-public-boards", data)
    }

    
    // ---------------------------------------------------------
    // SETUP NON GRAPH ACTIONS
    socket.on("moving_cursor", handleUpdateUser);
    socket.on("disconnect", handleDisconnect);
    socket.on("change_room_to", handleChangeRoomTo);
    socket.on("get_room_id", (callback) => { callback(handleGetRoomId()) });
    socket.on("update_self_user", handleUpdateSelfUser);
    socket.on("follow", addFollower);
    socket.on("unfollow", removeFollower);
    socket.on("my_view", sendViewToFollowers);

    function handleUpdateSelfUser(label: string, color: string) {
        client.color = color;
        client.label = label;
        client.broadcastToOthers('update_user', socket.id, client.label, client.color, client.pos);
    }

    function handleGetRoomId() {
        return client.board.roomId;
    }

    function handleChangeRoomTo(roomIdAsked: string) {
        console.log(`Handle: change_room, client: ${socket.id}, asked: ${roomIdAsked}`);
        if (boards.has(roomIdAsked)) {
            const board = boards.get(roomIdAsked);
            if (typeof board  !== "undefined"){
                client.joinBoard(board);
            }
        }
        else {
            console.log(`Asked room (${roomIdAsked}) does not exist in memory`);

            // Try to load it
            const filePath = `${ENV.boardsPath}${roomIdAsked}.json`;
            try {
                const rawData = fs.readFileSync(filePath, 'utf8');
                console.log(`${ENV.boardsPath}${roomIdAsked}.json file exists` );
                const jsonData = JSON.parse(rawData);

                const newBoard = new HistBoard(roomIdAsked);

                if ( jsonData.hasOwnProperty("vertices")){
                    for (const rawVertex of jsonData.vertices){
                        const pos = new Coord(rawVertex.data.pos.x, rawVertex.data.pos.y);
                        const data = new BasicVertexData(pos, rawVertex.data.weight, rawVertex.data.color);
                        const vertex = new BasicVertex(rawVertex.index, data);
                        newBoard.graph.vertices.set(rawVertex.index, vertex);
                    }
                }

                if (jsonData.hasOwnProperty("links")){
                    for (const rawLink of jsonData.links){
                        const index = rawLink.index;
                        const startVertex = newBoard.graph.vertices.get(rawLink.startVertex.index);
                        const endVertex = newBoard.graph.vertices.get(rawLink.endVertex.index);
                        if (typeof startVertex == "undefined") continue;
                        if (typeof endVertex == "undefined") continue;
                        const weight = rawLink.data.weight;
                        const color = rawLink.data.color;
                        const orientation = rawLink.orientation as ORIENTATION;
                        const cp = rawLink.data.hasOwnProperty("cp") ? new Coord(rawLink.data.cp.x, rawLink.data.cp.y): undefined;
                        const data = new BasicLinkData(cp, weight, color);
                        const link = new BasicLink(index, startVertex, endVertex, orientation, data);
                        newBoard.graph.links.set(index, link);
                    }
                }

                if (jsonData.hasOwnProperty("strokes")){
                    for (const rawStroke of jsonData.strokes){
                        const index = rawStroke.index;
                        const width = rawStroke.width;
                        const positions = new Array();
                        for (const pos of rawStroke.positions){
                            positions.push( new Coord(pos.x, pos.y));
                        }
                        const color = rawStroke.color;
                        const stroke = new Stroke(positions, color, width, index);
                        newBoard.strokes.set(index, stroke);
                    }
                }

                if ( jsonData.hasOwnProperty("areas")){
                    for (const rawArea of jsonData.areas){
                        const index = rawArea.index;
                        const c1 = new Coord(rawArea.c1.x, rawArea.c1.y);
                        const c2 = new Coord(rawArea.c2.x, rawArea.c2.y);
                        const color = rawArea.color;
                        const label = rawArea.label;
                        const area = new Area(label, c1, c2, color, index);
                        newBoard.areas.set(index, area);
                    }
                }

                if ( jsonData.hasOwnProperty("textZones")){
                    for (const rawTextZone of jsonData.textZones){
                        const index = rawTextZone.index;
                        const pos = new Coord(rawTextZone.pos.x, rawTextZone.pos.y);
                        const width = rawTextZone.width;
                        const text = rawTextZone.text;
                        const textZone = new TextZone(pos, width, text, index);
                        newBoard.text_zones.set(index, textZone);
                    }
                }

                if ( jsonData.hasOwnProperty("rectangles")){
                    for (const rawRectangle of jsonData.rectangles){
                        const index = rawRectangle.index;
                        const c1 = new Coord(rawRectangle.c1.x, rawRectangle.c1.y);
                        const c2 = new Coord(rawRectangle.c2.x, rawRectangle.c2.y);
                        const color = rawRectangle.color;
                        const rectangle = new Rectangle(c1, c2, color, index);
                        newBoard.rectangles.set(rawRectangle.index, rectangle);
                    }
                }

                boards.set(roomIdAsked, newBoard);
                client.joinBoard(newBoard);
                
            } catch (err) {
                console.log('File does not exist');
                socket.emit("update_room_id", client.board.roomId);

            }
            

        }
    }

    function handleDisconnect() {
        console.log(`Handle: disconnect, client: ${socket.id}`);
        client.broadcastToOthers('remove_user', socket.id);
        client.board.removeClient(socket.id);
        if (client.board.isEmpty() == false){
            const filePath = `${ENV.boardsPath}${client.board.roomId}.json`;
            const fileContent = client.board.toString();
            fs.writeFile(filePath, fileContent, (err) => {
                if (err) {
                    console.error('An error occurred while saving the file:', err);
                  } else {
                    console.log(`File ${client.board.roomId}.json saved successfully (${client.board.getNbElements()} elements)`);
                  }
            });
        } else {
            console.log(`Board ${client.board.roomId} is empty and therefore not saved.`)
        }
       
    }

    function handleUpdateUser(x: number, y: number) {
        client.pos = new Coord(x,y);
        // console.log("Handle: update_user ", client.label, client.pos);
        client.broadcastToOthers('update_user', socket.id, client.label, client.color, client.pos);
    }

    function addFollower(id: string) {
        console.log("ADDING FOLLOWER...");
        if (client.board.clients.has(id)) {
            const user = client.board.clients.get(id);
            if (typeof user  != "undefined" ){
                user.followers.push(socket.id);
                io.to(id).emit("send_view");
                console.log("ADDED!");
            }
        }
    }

    function removeFollower(id: string) {
        console.log("REMOVING FOLLOWER...");
        if (client.board.clients.has(id)) {
            const user = client.board.clients.get(id);
            if (typeof user  != "undefined"){
                const index = user.followers.indexOf(socket.id);
                if (index > -1) {
                    user.followers.splice(index, 1);
                    console.log("REMOVED!");
                }
            }
            
        }
    }

    function sendViewToFollowers(x: number, y: number, zoom: number) {
        // console.log("SEND VIEW TO FOLLOWERS:", x,y,zoom, client.id, users.get(client.id).followers);
        const user = client.board.clients.get(socket.id);
        if (user  !== undefined){
            for (const userId of user.followers) {
                io.to(userId).emit("view_follower", x, y, zoom, socket.id);
            }
        }
        
    }


    // ------------------------------------------------
    // GRAPH API
    // ------------------------------------------------

    // Graph Actions
    GraphPaste.addEvent(client);
    MergeVertices.addEvent(client);
    ApplyModifyer.addEvent(client);
    SubdivideLinkModification.addEvent(client);
    GenerateGraph.addEvent(client);

    // Board Generic
    ResizeElement.addEvent(client);
    UpdateElements.addEvent(client);
    AddElements.addEvent(client);
    TranslateElements.addEvent(client);
    DeleteElements.addEvent(client);

    // translate_elements // ne regarde pas écraser la dernière modif // TODO
    
    // Not Elementary Actions
    socket.on("undo", () => client.board.handleUndo());
    socket.on("redo", () => client.board.handleRedo());
    socket.on("load_json", handleLoadJson); // TODO undoable
    // No modification on the graph
    socket.on("get_json", handleGetJson);

    // ------------------------

    // JSON
    function handleLoadJson(s: string) {
        client.board.graph.clear();

        const data = JSON.parse(s);
        for (const vdata of data.vertices) {
            const newVertexData = new BasicVertexData(new Coord(data[1]["pos"]["x"], vdata[1]["pos"]["y"]), "", "black");
            const newVertex = new BasicVertex(vdata[0], newVertexData);
            client.board.graph.vertices.set(vdata[0], newVertex)
        }
        for (const link of data.links) {
            // TODO
            //g.add_link_with_cp(link[1].start_vertex, link[1].end_vertex, link[1].orientation, new Coord(link[1].cp.x, link[1].cp.y))
        }
        emitGraphToRoom(client.board, new Set([SENSIBILITY.COLOR, SENSIBILITY.ELEMENT, SENSIBILITY.GEOMETRIC]));
    }



    function handleGetJson(callback: (arg0: string) => void) {
        const graphStringiable = {
            vertices: Array.from(client.board.graph.vertices.entries()),
            links: Array.from(client.board.graph.links.entries()),
        }
        callback(JSON.stringify(graphStringiable));
    }

})

