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
import PACKAGE from '../package.json';
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



export function emit_graph_to_room(board: HistBoard, s: Set<SENSIBILITY>) {
    io.sockets.in(board.roomId).emit('graph', [...board.graph.vertices.entries()], [...board.graph.links.entries()], [...s]);
}

export function broadcastInRoom(roomId: string, name: string, data: any, s: Set<SENSIBILITY>) {
    io.sockets.in(roomId).emit(name, data, [...s]);
}


io.sockets.on('connection', function (socket: Socket) {

    // Initialization
    console.log("connection from ", socket.id);
    const client2 = new Client(socket, getRandomColor());
    socket.emit('myId', socket.id, client2.label, client2.color, Date.now());
    socket.emit("server-version", PACKAGE.version);
    socket.join(client2.board.roomId);
    



    // SETUP NON GRAPH ACTIONS
    socket.on("moving_cursor", handleUpdateUser);
    socket.on("disconnect", handleDisconnect);
    socket.on("change_room_to", handleChangeRoomTo);
    socket.on("get_room_id", (callback) => { callback(handleGetRoomId()) });
    socket.on("update_self_user", handle_update_self_user);
    socket.on("follow", add_follower);
    socket.on("unfollow", remove_follower);
    socket.on("my_view", send_view_to_followers);

    function handle_update_self_user(label: string, color: string) {
        client2.color = color;
        client2.label = label;
        client2.broadcast('update_user', socket.id, client2.label, client2.color, 0,0);
    }

    function handleGetRoomId() {
        return client2.board.roomId;
    }

    function handleChangeRoomTo(roomIdAsked: string) {
        console.log("Handle: change room")
        if (boards.has(roomIdAsked)) {
            const board = boards.get(roomIdAsked);
            if (typeof board  !== "undefined"){
                
                client2.joinBoard(board);
            }
        }
        else {
            console.log("asked room does not exist");
            socket.emit("update_room_id", client2.board.roomId);
        }
    }

    function handleDisconnect() {
        console.log("Handle: disconnect");
        client2.broadcast('remove_user', socket.id);
    }

    function handleUpdateUser(x: number, y: number) {
        // console.log("Handle: update_user ", client.id, x, y)
        client2.broadcast('update_user', socket.id, client2.label, client2.color, x, y);
    }

    function add_follower(id: string) {
        console.log("ADDING FOLLOWER...");
        if (client2.board.clients.has(id)) {
            const user = client2.board.clients.get(id);
            if (typeof user  != "undefined" ){
                user.followers.push(socket.id);
                io.to(id).emit("send_view");
                console.log("ADDED!");
            }
        }
    }

    function remove_follower(id: string) {
        console.log("REMOVING FOLLOWER...");
        if (client2.board.clients.has(id)) {
            const user = client2.board.clients.get(id);
            if (typeof user  != "undefined"){
                const index = user.followers.indexOf(socket.id);
                if (index > -1) {
                    user.followers.splice(index, 1);
                    console.log("REMOVED!");
                }
            }
            
        }
    }

    function send_view_to_followers(x: number, y: number, zoom: number) {
        // console.log("SEND VIEW TO FOLLOWERS:", x,y,zoom, client.id, users.get(client.id).followers);
        const user = client2.board.clients.get(socket.id);
        if (user  !== undefined){
            for (const user_id of user.followers) {
                io.to(user_id).emit("view_follower", x, y, zoom, socket.id);
            }
        }
        
    }


    // ------------------------
    // GRAPH API
    // ------------------------

    // Graph Actions
    // GraphPaste.addEvent(board, client);
    socket.on("paste_graph", (verticesEntries: any[], linksEntries: any[]) => {GraphPaste.handle(client2.board, verticesEntries, linksEntries)});
    // MergeVertices.addEvent(board, client);
    socket.on("vertices_merge", (fixedVertexId: number, vertexToRemoveId: number) => MergeVertices.handle(client2.board, fixedVertexId, vertexToRemoveId));
    // ApplyModifyer.addEvent(board, client);
    socket.on("apply_modifyer", (name: string, attributesData: Array<any>) => ApplyModifyer.handle(client2.board, name, attributesData));
    // SubdivideLinkModification.addEvent(board, client);
    socket.on("subdivide_link", (linkIndex: number, pos: {x: number, y: number}, callback: (response: number) => void) => {SubdivideLinkModification.handle(client2.board, linkIndex, new Coord(pos.x, pos.y), callback)} );


    // Board Generic
    // ResizeElement.addEvent(board, client);
    socket.on("resize_element", ( kind: string, index: number, x: number, y: number, rawResizeType: string) => ResizeElement.handle(client2.board, kind, index, x, y, rawResizeType));
    // UpdateElement.addEvent(board, client);
    socket.on("update_element", (kind: string, index: number, param: string, newValue: any) => UpdateElement.handle(client2.board, kind, index, param, newValue));
    // AddElement.addEvent(board, client);
    socket.on("add_element", (kind: string, data: any, callback: (created_index: number) => void) => { AddElement.handle(client2.board, kind, data, callback)} );
    // TranslateElements.addEvent(board, client);
    socket.on("translate_elements", (indices: Array<[string, number]>, rawShift: {x: number, y: number}) => TranslateElements.handle(client2.board, indices, rawShift));
    // DeleteElements.addEvent(board, client);
    socket.on("delete_elements", (indices: Array<[string, number]>) => { DeleteElements.handle(client2.board, indices)});

    // translate_elements // ne regarde pas écraser la dernière modif // TODO
    
    // Not Elementary Actions
    socket.on("undo", handleUndo);
    socket.on("redo", handleRedo);
    socket.on("load_json", handle_load_json); // TODO undoable
    // No modification on the graph
    socket.on("get_json", handle_get_json);

    // ------------------------

    function handleUndo() {
        console.log("Handle: undo");
        const modif = client2.board.cancel_last_modification();
        if (typeof modif === "string") {
            console.log(modif);
        } else {
            modif.emitDeimplementation(client2.board);
        }
    }

    function handleRedo() {
        console.log("Handle: redo");
        const modif = client2.board.redo();
        if (typeof modif === "string") {
            console.log(modif);
        } else {
            modif.emitImplementation(client2.board);
        }
    }



    // JSON
    function handle_load_json(s: string) {
        client2.board.graph.clear();

        const data = JSON.parse(s);
        for (const vdata of data.vertices) {
            const newVertexData = new BasicVertexData(new Coord(data[1]["pos"]["x"], vdata[1]["pos"]["y"]), "", "black");
            const newVertex = new BasicVertex(vdata[0], newVertexData);
            client2.board.graph.vertices.set(vdata[0], newVertex)
        }
        for (const link of data.links) {
            // TODO
            //g.add_link_with_cp(link[1].start_vertex, link[1].end_vertex, link[1].orientation, new Coord(link[1].cp.x, link[1].cp.y))
        }
        emit_graph_to_room(client2.board, new Set([SENSIBILITY.COLOR, SENSIBILITY.ELEMENT, SENSIBILITY.GEOMETRIC]));
    }



    function handle_get_json(callback: (arg0: string) => void) {
        const graph_stringifiable = {
            vertices: Array.from(client2.board.graph.vertices.entries()),
            links: Array.from(client2.board.graph.links.entries()),
        }
        callback(JSON.stringify(graph_stringifiable));
    }

})

