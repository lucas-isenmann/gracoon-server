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
import { getRandomColor, User, users } from './user';
import { makeid } from './utils';

import { Server, Socket } from 'socket.io';
import { SubdivideLinkModification } from "./modifications/implementations/subdivide_link";
import PACKAGE from '../package.json';

// Initialize the server

const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.listen(ENV.port);
console.log('Server started at http://localhost:' + ENV.port);


// gestion des rooms

const room_boards = new Map<string, HistBoard>();
const clientRooms = new Map<string, string>();



export function emit_graph_to_room(board: HistBoard, s: Set<SENSIBILITY>) {
    io.sockets.in(board.roomId).emit('graph', [...board.graph.vertices.entries()], [...board.graph.links.entries()], [...s]);
}

export function broadcastInRoom(roomId: string, name: string, data: any, s: Set<SENSIBILITY>) {
    io.sockets.in(roomId).emit(name, data, [...s]);
}


io.sockets.on('connection', function (client: Socket) {

    // INIT NEW PLAYER
    console.log("connection from ", client.id);
    const user_data = new User(client.id, getRandomColor());
    users.set(client.id, user_data);
    client.emit('myId', user_data.id, user_data.label, user_data.color, Date.now());
    client.emit("server-version", PACKAGE.version);

    // ROOM CREATION

    let room_id = makeid(5);
    client.join(room_id);
    clientRooms.set(client.id, room_id);
    client.emit('room_id', room_id); // useless ? TODO remove
    console.log("new room : ", room_id);
    let board = new HistBoard(room_id);
    // board.graph.set_vertex(0, new Vertex(200, 100, ""));
    emit_graph_to_room(board, new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC]));
    emit_strokes_to_room();
    emit_areas_to_room();
    emit_users_to_client();

    room_boards.set(room_id, board);



    function emit_graph_to_client(s: Set<SENSIBILITY>) {
        client.emit('graph', [...board.graph.vertices.entries()], [...board.graph.links.entries()], [...s]);
    }

    function emit_reset_board() {
        client.emit("reset_board", [...board.text_zones.entries()]);
    }

    function broadcast(name: string, data: any, s: Set<SENSIBILITY>) {
        io.sockets.in(room_id).emit(name, data, [...s]);
    }

    

    function emit_strokes_to_room() {
        io.sockets.in(room_id).emit('strokes', [...board.strokes.entries()]);
    }

    function emit_areas_to_room() {
        io.sockets.in(room_id).emit('areas', [...board.areas.entries()])
    }

    function emit_users_to_client() {
        if (client.id in clientRooms) {
            const users_in_room = get_other_clients_in_room(client.id, clientRooms);
            client.emit('clients', [...users_in_room.entries()]);
            // TODO: Corriger ca: on envoie le nouvel user à tous les users de la room, mais on n'a pas ses coordonnées donc ce sont de fausses coordonnées.
            client.to(room_id).emit('update_user', client.id, user_data.label, user_data.color, -100, -100);
        }
    }



    // SETUP NON GRAPH ACTIONS
    client.on("moving_cursor", update_user);
    client.on("disconnect", handle_disconnect);
    client.on("change_room_to", handle_change_room_to);
    client.on("get_room_id", (callback) => { callback(handle_get_room_id()) });
    client.on("update_self_user", handle_update_self_user);
    client.on("follow", add_follower);
    client.on("unfollow", remove_follower);
    client.on("my_view", send_view_to_followers);

    function handle_update_self_user(label: string, color: string) {
        if (users.has(client.id)) {
            const user = users.get(client.id);
            if (user !== undefined){
                user.color = color;
                user.label = label;
                client.to(room_id).emit('update_other_self_user', client.id, label, color);
            }
        }
        else {
            console.log("Error, client not found", client.id);
        }
    }

    function handle_get_room_id() {
        return room_id;
    }

    function handle_change_room_to(new_room_id: string) {
        if (room_boards.has(new_room_id)) {
            client.join(new_room_id);
            clientRooms.set(client.id, new_room_id);
            room_id = new_room_id;

            const getBoard = room_boards.get(room_id);
            if (typeof getBoard  !== "undefined"){
                board = getBoard;
            }
            emit_graph_to_client(new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC]));
            emit_strokes_to_room();
            emit_areas_to_room();
            emit_users_to_client();
            emit_reset_board();
        }
        else {
            console.log("asked room does not exist");
            client.emit("update_room_id", room_id);
        }
    }

    function handle_disconnect() {
        if (users.has(client.id)) {
            users.delete(client.id);
        }
        io.sockets.in(room_id).emit('remove_user', client.id);
    }

    function update_user(x: number, y: number) {
        client.to(room_id).emit('update_user', client.id, user_data.label, user_data.color, x, y);
    }

    function add_follower(id: string) {
        console.log("ADDING FOLLOWER...");
        if (users.has(client.id) && users.has(id)) {
            const user = users.get(id);
            if (user  !== undefined ){
                user.followers.push(client.id);
                io.to(id).emit("send_view");
                console.log("ADDED!");
            }
        }
    }

    function remove_follower(id: string) {
        console.log("REMOVING FOLLOWER...");
        if (users.has(client.id) && users.has(id)) {
            const user = users.get(id);
            if (user  !== undefined){
                const index = user.followers.indexOf(client.id);
                if (index > -1) {
                    user.followers.splice(index, 1);
                    console.log("REMOVED!");
                }
            }
            
        }
    }

    function send_view_to_followers(x: number, y: number, zoom: number) {
        // console.log("SEND VIEW TO FOLLOWERS:", x,y,zoom, client.id, users.get(client.id).followers);
        const user = users.get(client.id);
        if (user  !== undefined){
            for (const user_id of user.followers) {
                io.to(user_id).emit("view_follower", x, y, zoom, client.id);
            }
        }
        
    }


    // ------------------------
    // GRAPH API
    // ------------------------

    // Graph Actions
    // GraphPaste.addEvent(board, client);
    client.on("paste_graph", (verticesEntries: any[], linksEntries: any[]) => {GraphPaste.handle(board, verticesEntries, linksEntries)});
    // MergeVertices.addEvent(board, client);
    client.on("vertices_merge", (fixedVertexId: number, vertexToRemoveId: number) => MergeVertices.handle(board, fixedVertexId, vertexToRemoveId));
    // ApplyModifyer.addEvent(board, client);
    client.on("apply_modifyer", (name: string, attributesData: Array<any>) => ApplyModifyer.handle(board, name, attributesData));
    // SubdivideLinkModification.addEvent(board, client);
    client.on("subdivide_link", (linkIndex: number, pos: {x: number, y: number}, callback: (response: number) => void) => {SubdivideLinkModification.handle(board, linkIndex, new Coord(pos.x, pos.y), callback)} );


    // Board Generic
    // ResizeElement.addEvent(board, client);
    client.on("resize_element", ( kind: string, index: number, x: number, y: number, rawResizeType: string) => ResizeElement.handle(board, kind, index, x, y, rawResizeType));
    // UpdateElement.addEvent(board, client);
    client.on("update_element", (kind: string, index: number, param: string, newValue: any) => UpdateElement.handle(board, kind, index, param, newValue));
    // AddElement.addEvent(board, client);
    client.on("add_element", (kind: string, data: any, callback: (created_index: number) => void) => { AddElement.handle(board, kind, data, callback)} );
    // TranslateElements.addEvent(board, client);
    client.on("translate_elements", (indices: Array<[string, number]>, rawShift: {x: number, y: number}) => TranslateElements.handle(board, indices, rawShift));
    // DeleteElements.addEvent(board, client);
    client.on("delete_elements", (indices: Array<[string, number]>) => { DeleteElements.handle(board, indices)});

    // translate_elements // ne regarde pas écraser la dernière modif // TODO
    
    // Not Elementary Actions
    client.on("undo", handleUndo);
    client.on("redo", handleRedo);
    client.on("load_json", handle_load_json); // TODO undoable
    // No modification on the graph
    client.on("get_json", handle_get_json);

    // ------------------------

    function handleUndo() {
        console.log("Handle: undo");
        const modif = board.cancel_last_modification();
        if (typeof modif === "string") {
            console.log(modif);
        } else {
            modif.emitDeimplementation(board);
        }
    }

    function handleRedo() {
        console.log("Handle: redo");
        const modif = board.redo();
        if (typeof modif === "string") {
            console.log(modif);
        } else {
            modif.emitImplementation(board);
        }
    }



    // JSON
    function handle_load_json(s: string) {
        board.graph.clear();

        const data = JSON.parse(s);
        for (const vdata of data.vertices) {
            const newVertexData = new BasicVertexData(new Coord(data[1]["pos"]["x"], vdata[1]["pos"]["y"]), "", "black");
            const newVertex = new BasicVertex(vdata[0], newVertexData);
            board.graph.vertices.set(vdata[0], newVertex)
        }
        for (const link of data.links) {
            // TODO
            //g.add_link_with_cp(link[1].start_vertex, link[1].end_vertex, link[1].orientation, new Coord(link[1].cp.x, link[1].cp.y))
        }
        emit_graph_to_room(board, new Set([SENSIBILITY.COLOR, SENSIBILITY.ELEMENT, SENSIBILITY.GEOMETRIC]));
    }



    function handle_get_json(callback: (arg0: string) => void) {
        const graph_stringifiable = {
            vertices: Array.from(board.graph.vertices.entries()),
            links: Array.from(board.graph.links.entries()),
        }
        callback(JSON.stringify(graph_stringifiable));
    }








})




function get_other_clients_in_room(client_id: string, clientRooms: Map<string, string>): Map<string, User> {
    const users_in_room = new Map<string, User>();
    for (const id_client in clientRooms) {
        if (client_id != id_client && clientRooms.get(client_id) == clientRooms.get(id_client) && users.has(id_client)) {
            const client = users.get(id_client);
            if (client){
                users_in_room.set(id_client, client);
            }
        }
    }
    return users_in_room;
}










