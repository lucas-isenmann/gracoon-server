import { Coord, BasicVertexData, BasicVertex } from "gramoloss";
import ENV from './.env.json';
import { HistBoard } from './hist_board';
import { AddElement } from './modifications/implementations/add_element';
import { ApplyModifyer } from './modifications/implementations/apply_modifyer';
import { DeleteElements } from './modifications/implementations/delete_elements';
import { GraphPaste } from './modifications/implementations/graph_paste';
import { MergeVertices } from './modifications/implementations/merge_vertices';
import { ResizeElement } from './modifications/implementations/resize_element';
import { TranslateElements } from './modifications/implementations/translate_elements';
import { UpdateElement } from './modifications/implementations/update_element';
import { SENSIBILITY } from './modifications/modification';
import { getRandomColor } from './utils';

import { Server, Socket } from 'socket.io';
import { SubdivideLinkModification } from "./modifications/implementations/subdivide_link";

import { Client } from "./user";

// Initialize the server

export const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.listen(ENV.port);
console.log('Server started at http://localhost:' + ENV.port);


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
    console.log("connection from ", socket.id);
    const client = new Client(socket, getRandomColor());
    

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
        client.broadcast('update_user', socket.id, client.label, client.color, 0,0);
    }

    function handleGetRoomId() {
        return client.board.roomId;
    }

    function handleChangeRoomTo(roomIdAsked: string) {
        console.log("Handle: change room")
        if (boards.has(roomIdAsked)) {
            const board = boards.get(roomIdAsked);
            if (typeof board  !== "undefined"){
                
                client.joinBoard(board);
            }
        }
        else {
            console.log("asked room does not exist");
            socket.emit("update_room_id", client.board.roomId);
        }
    }

    function handleDisconnect() {
        console.log("Handle: disconnect");
        client.broadcast('remove_user', socket.id);
    }

    function handleUpdateUser(x: number, y: number) {
        // console.log("Handle: update_user ", client.id, x, y)
        client.broadcast('update_user', socket.id, client.label, client.color, x, y);
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


    // ------------------------
    // GRAPH API
    // ------------------------

    // Graph Actions
    GraphPaste.addEvent(client);
    MergeVertices.addEvent(client);
    ApplyModifyer.addEvent(client);
    SubdivideLinkModification.addEvent(client);

    // Board Generic
    ResizeElement.addEvent(client);
    UpdateElement.addEvent(client);
    AddElement.addEvent(client);
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

