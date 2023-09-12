import { Vertex, Coord, Link, ORIENTATION, Area, Vect, Representation, Rectangle, BasicVertexData, BasicLinkData, BasicVertex, BasicLink } from "gramoloss";
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
import { RESIZE_TYPE, SENSIBILITY } from './modifications/modification';
import { getRandomColor, User, users } from './user';
import { eq_indices, makeid } from './utils';

import { Server, Socket } from 'socket.io';
import { handleSubdivideLink } from "./handler";
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



export function emit_graph_to_room(board: HistBoard, roomId: string, s: Set<SENSIBILITY>) {
    io.sockets.in(roomId).emit('graph', [...board.graph.vertices.entries()], [...board.graph.links.entries()], [...s]);
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
    let board = new HistBoard();
    // board.graph.set_vertex(0, new Vertex(200, 100, ""));
    emit_graph_to_room(board, room_id, new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC]));
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
    client.on("paste_graph", handle_paste_graph);
    client.on("vertices_merge", handle_vertices_merge);
    client.on("apply_modifyer", handleApplyModifyer);
    client.on("subdivide_link", (linkIndex: number, pos: Coord, callback: (response: number) => void) => {handleSubdivideLink(board, room_id, linkIndex, pos, callback)});
    // Board Generic
    client.on("resize_element", handle_resize_element);
    client.on("update_element", handle_update_element);
    client.on("add_element", handle_add_element);
    client.on("translate_elements", handle_translate_elements);
    client.on("delete_elements", handle_delete_elements);
    // translate_elements // ne regarde pas écraser la dernière modif // TODO
    // Not Elementary Actions
    client.on("undo", handle_undo);
    client.on("redo", handle_redo);
    client.on("load_json", handle_load_json); // TODO undoable
    // No modification on the graph
    client.on("get_json", handle_get_json);

    // ------------------------
    //
    // ------------------------

    function handleApplyModifyer(name: string, attributesData: Array<any>) {
        console.log("Handle: apply modifyer")
        const oldVertices = new Map();
        const oldLinks = new Map();
        for (const [index, vertex] of board.graph.vertices.entries()) {
            const oldVertexData = new BasicVertexData(vertex.data.pos, vertex.data.weight, vertex.data.color);
            const oldVertex = new Vertex(index, oldVertexData);
            oldVertices.set(index, oldVertex);
        }
        for (const [index, link] of board.graph.links.entries()) {
            const oldLinkData = new BasicLinkData(link.data.cp, link.data.weight, link.data.color);
            const oldLink = new Link(index, link.startVertex, link.endVertex, link.orientation, oldLinkData);
            oldLinks.set(index, oldLink);
        }

        if (name == "into_tournament") {
            if (attributesData.length != 1) {
                console.log("wrong number of attributes");
                return;
            }

            const area_index = attributesData[0];
            if (typeof area_index == "string") {
                const all_vertices_indices = new Array();
                for (const index of board.graph.vertices.keys()) {
                    all_vertices_indices.push(index);
                }
                board.graph.completeSubgraphIntoTournament(all_vertices_indices, (index: number, startVertex: BasicVertex<BasicVertexData>, endVertex: BasicVertex<BasicVertexData>) => { return new BasicLink(index, startVertex, endVertex, ORIENTATION.DIRECTED, new BasicLinkData(undefined, "", "black")) })
            } else {
                const area = board.areas.get(area_index);
                if (area  !== undefined){
                    const vertices_indices = board.graph.vertices_contained_by_area(area);
                    board.graph.completeSubgraphIntoTournament(vertices_indices, (index: number, startVertex: BasicVertex<BasicVertexData>, endVertex: BasicVertex<BasicVertexData>) => { return new BasicLink(index, startVertex, endVertex, ORIENTATION.DIRECTED, new BasicLinkData(undefined, "", "black")) })
                }
            }

            // emit_graph_to_room(new Set([SENSIBILITY.ELEMENT])); // TODO change to Modification
        } else if (name == "removeRandomLinks"){
            if (attributesData.length != 2) {
                console.log("wrong number of attributes");
                return;
            }
            const area_index = attributesData[0];
            const p = attributesData[1];
            if (typeof p == "number"){
                if (typeof area_index == "string") {
                    for (const index of board.graph.links.keys()) {
                        if (Math.random() < p){
                            board.graph.links.delete(index);
                        }
                    }
                } else {
                    const area = board.areas.get(area_index);
                    if (area  !== undefined){
                        const areaVIndices = board.graph.vertices_contained_by_area(area);
                        for (const [index, link] of board.graph.links.entries()) {
                            if (areaVIndices.has(link.startVertex.index) && Math.random() < p){
                                board.graph.links.delete(index);
                            }
                        }
                    }
                }
            }
        }

        const new_vertices = new Map();
        const new_links = new Map();
        for (const [index, vertex] of board.graph.vertices.entries()) {
            const newVertexData = new BasicVertexData(vertex.data.pos.copy(), vertex.data.weight, vertex.data.color);
            const newVertex = new Vertex(index, newVertexData);
            new_vertices.set(index, newVertex);
        }
        for (const [index, link] of board.graph.links.entries()) {
            const newLinkData = new BasicLinkData(undefined, link.data.weight, link.data.color);
            if (typeof link.data.cp != "undefined" ){
                newLinkData.cp = link.data.cp.copy();
            }
            const newLink = new Link(index, link.startVertex, link.endVertex, link.orientation, newLinkData);
            new_links.set(index, newLink);
        }

        const modif = new ApplyModifyer(oldVertices, oldLinks, new_vertices, new_links);
        board.append_modification_already_implemented(modif);
        emit_graph_to_room(board, room_id, new Set([SENSIBILITY.ELEMENT]));
    }

    function handle_add_element(kind: string, data: any, callback: (created_index: number) => void) {
        console.log("Handle: add_element", kind, data);
        const modif = AddElement.fromBoard(board, kind, data);
        if (typeof modif == "undefined"){
            console.log("Error: handle add element: impossible to create AddElement");
            return;
        }
        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            callback(modif.index);
            broadcast("add_elements", [{ kind: kind, index: modif.index, element: modif.element }], new Set());
        }
    }


    function handle_translate_elements(indices: Array<[string, number]>, raw_shift: any) {
        console.log("Handle: translate_elements", indices);
        const shift = new Vect(raw_shift.x, raw_shift.y);
        // console.log(shift);

        if (board.modifications_stack.length > 0) {
            const last_modif = board.modifications_stack[board.modifications_stack.length - 1];
            if (last_modif.constructor == TranslateElements) {
                const last_modif2 = last_modif as TranslateElements;
                if (eq_indices(last_modif2.indices, indices)) {
                    shift.translate(last_modif2.shift);
                    last_modif2.deimplement(board);
                    board.modifications_stack.pop();
                }
            }
        }
        const modif = new TranslateElements(indices, shift);

        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            broadcast("translate_elements", { indices: indices, shift: raw_shift }, new Set());
        }
    }

    function handle_delete_elements(indices: Array<[string, number]>) {
        console.log("Handle: delete_elements", indices);
        const modif = DeleteElements.fromBoard(board, indices);
        if (typeof modif === "undefined") {
            console.log(`Error: cannot create DeleteElements from indices ${indices}`);
            return;
        }
        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            broadcast("delete_elements", indices, new Set());
        }
    }



    function handle_update_element(kind: string, index: number, param: string, new_value: any) {
        console.log("Handle: update_element", kind, index, param, new_value);
        const old_value = board.get_value(kind, index, param);
        if (param == "cp") {
            if (typeof new_value != "undefined") {
                new_value = new Coord(new_value.x, new_value.y);
            }
        }
        const modif = new UpdateElement(index, kind, param, new_value, old_value)
        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            broadcast("update_element", { index: modif.index, kind: modif.kind, param: modif.param, value: modif.new_value }, new Set());
        }
    }

    function handle_undo() {
        console.log("Handle: undo");
        const r = board.cancel_last_modification();
        if (typeof r === "string") {
            console.log(r);
        } else {
            switch (r.constructor) {
                case TranslateElements: {
                    const modif = r as TranslateElements;
                    broadcast("translate_elements", { indices: modif.indices, shift: modif.shift.opposite() }, new Set());
                    break;
                }
                case UpdateElement: {
                    const modif = r as UpdateElement;
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: modif.param, value: modif.old_value }, new Set());
                    break;
                }
                case AddElement: {
                    const modif = r as AddElement;
                    broadcast("delete_elements", [[modif.kind, modif.index]], new Set());
                    break;
                }
                case GraphPaste: {
                    const modif = r as GraphPaste;
                    const indices = new Array();
                    for (const vertex of modif.addedVertices) {
                        indices.push(["Vertex", vertex.index]);
                    }
                    for (const link of modif.addedLinks) {
                        indices.push(["Link", link.index]);
                    }
                    broadcast("delete_elements", indices, new Set());
                    break;
                }
                case DeleteElements: {
                    const modif = r as DeleteElements;
                    const removed = new Array();
                    for (const [index, vertex] of modif.vertices.entries()) {
                        removed.push({ kind: "Vertex", index: index, element: vertex });
                    }
                    for (const [index, link] of modif.links.entries()) {
                        removed.push({ kind: "Link", index: index, element: link });
                    }
                    for (const [index, area] of modif.areas.entries()) {
                        removed.push({ kind: "Area", index: index, element: area });
                    }
                    for (const [index, stroke] of modif.strokes.entries()) {
                        removed.push({ kind: "Stroke", index: index, element: stroke });
                    }
                    for (const [index, text_zone] of modif.text_zones.entries()) {
                        removed.push({ kind: "TextZone", index: index, element: text_zone });
                    }
                    broadcast("add_elements", removed, new Set());
                    break;
                }
                case MergeVertices: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
                case ApplyModifyer: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
                case ResizeElement: {
                    const modif = r as ResizeElement;
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: "c1", value: modif.previous_c1 }, new Set());
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: "c2", value: modif.previous_c2 }, new Set());
                    break;
                }
                case SubdivideLinkModification: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
            }
        }

        // TODO to put in board
        // const sensibilities = g.reverse_last_modification();
        // emit_graph_to_room(sensibilities);
        // emit_strokes_to_room();
        // emit_areas_to_room();
    }

    function handle_redo() {
        console.log("Handle: redo");

        const r = board.redo();
        if (typeof r === "string") {
            console.log(r);
        } else {
            switch (r.constructor) {
                case TranslateElements: {
                    const modif = r as TranslateElements;
                    broadcast("translate_elements", { indices: modif.indices, shift: modif.shift }, new Set());
                    break;
                }
                case UpdateElement: {
                    const modif = r as UpdateElement;
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: modif.param, value: modif.new_value }, new Set());
                    break;
                }
                case AddElement: {
                    const modif = r as AddElement;
                    broadcast("add_elements", [{ kind: modif.kind, index: modif.index, element: modif.element }], new Set());
                    break;
                }
                case GraphPaste: {
                    const modif = r as GraphPaste;
                    const elements = new Array();
                    for (const vertex of modif.addedVertices) {
                        elements.push({ kind: "Vertex", index: vertex.index, element: vertex });
                    }
                    for (const link of modif.addedLinks) {
                        elements.push({ kind: "Link", index: link.index, element: link });
                    }
                    broadcast("add_elements", elements, new Set());
                    break;
                }
                case DeleteElements: {
                    const modif = r as DeleteElements;
                    const indices = new Array();
                    for (const index of modif.vertices.keys()) {
                        indices.push(["Vertex", index]);
                    }
                    for (const index of modif.links.keys()) {
                        indices.push(["Link", index]);
                    }
                    for (const index of modif.strokes.keys()) {
                        indices.push(["Stroke", index]);
                    }
                    for (const index of modif.areas.keys()) {
                        indices.push(["Area", index]);
                    }
                    for (const index of modif.text_zones.keys()) {
                        indices.push(["TextZone", index]);
                    }
                    broadcast("delete_elements", indices, new Set());
                    break;
                }
                case MergeVertices: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
                case ApplyModifyer: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
                case ResizeElement: {
                    const modif = r as ResizeElement;
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: "c1", value: modif.new_c1 }, new Set());
                    broadcast("update_element", { index: modif.index, kind: modif.kind, param: "c2", value: modif.new_c2 }, new Set());
                    break;
                }
                case SubdivideLinkModification: {
                    emit_graph_to_room(board, room_id, new Set());
                    break;
                }
            }
        }

        // TODO to put in board
        // const sensibilities = g.redo();
        // emit_graph_to_room(sensibilities);
        // emit_strokes_to_room();
        // emit_areas_to_room();
    }

    function handle_resize_element(type: string, index: number, x: number, y: number, raw_resize_type: string) {
        console.log("Receive Request: resize_element");
        let element: undefined | Area | Representation | Rectangle = undefined;
        if (type == "Area") {
            if (board.areas.has(index) == false) {
                console.log("Error : Area index %d does not exist", index);
                return;
            }
            element = board.areas.get(index);
        } else if (type == "Rectangle") {
            if (board.rectangles.has(index) == false) {
                console.log("Error : Rectangle index %d does not exist", index);
                return;
            }
            element = board.rectangles.get(index);
        } else if (type == "Representation") {
            if (board.representations.has(index) == false) {
                console.log("Error : Representations index %d does not exist", index);
                return;
            }
            element = board.representations.get(index);
        }
        if (element == null) {
            console.log("Error : Type ", type, " is unsupported");
            return;
        }

        const resize_type = raw_resize_type as RESIZE_TYPE;
        const new_modif = ResizeElement.from_element(element, index, type, x, y, resize_type);
        const r = board.try_push_new_modification(new_modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            broadcast("update_element", { index: index, kind: type, param: "c1", value: new_modif.new_c1 }, new Set());
            broadcast("update_element", { index: index, kind: type, param: "c2", value: new_modif.new_c2 }, new Set());
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
        emit_graph_to_room(board, room_id, new Set([SENSIBILITY.COLOR, SENSIBILITY.ELEMENT, SENSIBILITY.GEOMETRIC]));
    }



    function handle_get_json(callback: (arg0: string) => void) {
        const graph_stringifiable = {
            vertices: Array.from(board.graph.vertices.entries()),
            links: Array.from(board.graph.links.entries()),
        }
        callback(JSON.stringify(graph_stringifiable));
    }






    function handle_vertices_merge(vertex_index_fixed: number, vertex_index_to_remove: number) {
        console.log("Receive Request: vertices_merge");
        board.cancel_last_modification(); // TODO its not necessarily the last which is a translate
        const modif = MergeVertices.fromBoard(board,  vertex_index_fixed, vertex_index_to_remove);
        if (typeof modif == "undefined"){
            console.log(`Error: cannot create MergeVertices`);
            return;
        }

        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            emit_graph_to_room(board, room_id, r);
        }
    }


    // OTHERS 
    function handle_paste_graph(verticesEntries: any[], linksEntries: any[]) {
        console.log("Receive Request: paste graph");

        const addedVertices = new Map<number, BasicVertex<BasicVertexData>>();
        const addedLinks = new Array<BasicLink<BasicVertexData, BasicLinkData>>();
        const vertex_indices_transformation = new Map<number, number>(); // used to translate the vertices indices in the added links
        const new_vertex_indices: Array<number> = board.graph.get_next_n_available_vertex_indices(verticesEntries.length);
        let i = 0;
        for (const data of verticesEntries) {
            const vertexData = new BasicVertexData(new Coord(data[1].data.pos.x, data[1].data.pos.y), "", "black");
            const vertex = new BasicVertex(new_vertex_indices[i], vertexData);
            addedVertices.set(vertex.index, vertex);
            vertex_indices_transformation.set(data[1].index, vertex.index);
            i++;
        }

        const new_link_indices = board.graph.get_next_n_available_link_indices(linksEntries.length);
        let j = 0;
        for (const data of linksEntries) {
            let orient = ORIENTATION.UNDIRECTED;
            switch (data[1].orientation) {
                case "UNDIRECTED":
                    orient = ORIENTATION.UNDIRECTED
                    break;
                case "DIRECTED":
                    orient = ORIENTATION.DIRECTED
                    break;
            }
            const startIndex = vertex_indices_transformation.get(data[1].startVertex.index);
            // console.log("link: startIndex ", startIndex);
            const endIndex = vertex_indices_transformation.get(data[1].endVertex.index);
            if (typeof startIndex == "number" && typeof endIndex == "number") {
                let cp: undefined | Coord = undefined;
                if ( data[1].data.cp ){
                    cp =  new Coord(data[1].data.cp.x, data[1].data.cp.y);
                }
                const startVertex = addedVertices.get(startIndex);
                const endVertex = addedVertices.get(endIndex);
                if (typeof startVertex == "undefined" || typeof endVertex == "undefined"){
                    console.log(`Error: cannot create GraphPaste: cannot get new startVertex or new endVertex at indices ${startIndex} ${endIndex}`)
                    return;
                }
                const linkData = new BasicLinkData(cp, data[1].data.weight, data[1].data.color);
                const link = new BasicLink(new_link_indices[j], startVertex, endVertex, orient, linkData);
                addedLinks.push( link);
                j++;
            }
           
        }

        const modif = new GraphPaste([...addedVertices.values()], addedLinks);
        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            const elements = new Array();
            for (const vertex of modif.addedVertices) {
                elements.push({ kind: "Vertex", index: vertex.index, element: vertex });
            }
            for (const link of modif.addedLinks) {
                elements.push({ kind: "Link", index: link.index, element: link });
            }
            broadcast("add_elements", elements, new Set());
            // emit_graph_to_room(new Set([SENSIBILITY.ELEMENT]));
        }
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










