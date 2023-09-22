import { Stroke, Area, TextZone, BasicVertexData, BasicLinkData, BasicVertex, BasicLink, Coord, ORIENTATION } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

/**
 * kind: the kind of the new element
 * index: the index of the new element
 */
export class AddElement implements BoardModification {

    kind: string;
    index: number;
    element: BasicVertex<BasicVertexData>|BasicLink<BasicVertexData, BasicLinkData>|Stroke|Area|TextZone;
    callback: (response: number) => void;
    
    constructor(kind: string, index: number, element: BasicVertex<BasicVertexData>|BasicLink<BasicVertexData, BasicLinkData>|Stroke|Area|TextZone,  callback: (response: number) => void ) {
        this.kind = kind;
        this.index = index;
        this.element = element;
        this.callback = callback;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        if (this.kind == "TextZone"){
            if ( board.text_zones.has(this.index) ){
                return "index " + String(this.index) + " already exists in text_zones";
            } else {
                const element = this.element as TextZone;
                board.text_zones.set(this.index, element);
            }
        } else if (this.kind == "Vertex"){
            if ( board.graph.vertices.has(this.index) ){
                return "index " + String(this.index) + " already exists in vertices";
            } else {
                const element = this.element as BasicVertex<BasicVertexData>;
                board.graph.vertices.set(this.index, element);
            }
        }else if (this.kind == "Link"){
            if ( board.graph.links.has(this.index) ){
                return "index " + String(this.index) + " already exists in links";
            } else {
                const link = this.element as BasicLink<BasicVertexData, BasicLinkData>;
                if (board.graph.check_link(link)){
                    board.graph.links.set(this.index, link);
                } else {
                    return "Error: link is not valid";
                }
            }
        }else if (this.kind == "Stroke"){
            if ( board.strokes.has(this.index) ){
                return "index " + String(this.index) + " already exists in strokes";
            } else {
                const element = this.element as Stroke;
                board.strokes.set(this.index, element);
            }
        }else if (this.kind == "Area"){
            if ( board.areas.has(this.index) ){
                return "index " + String(this.index) + " already exists in areas";
            } else {
                const element = this.element as Area;
                board.areas.set(this.index, element);
            }
        }
        return new Set();
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        if ( this.kind == "TextZone"){
            board.text_zones.delete(this.index);
        } else if (this.kind == "Stroke"){
            board.strokes.delete(this.index);
        } else if (this.kind == "Area"){
            board.areas.delete(this.index);
        } else if (this.kind == "Vertex"){
            board.graph.delete_vertex(this.index);
        } else if (this.kind == "Link"){
            board.graph.links.delete(this.index);
        }
        return new Set();
    }


    static fromBoard(board: HistBoard, kind: string, data: any, callback: (index: number) => void): AddElement | undefined{
        let newIndex: number;
        let newElement;

        if (kind == "Stroke") {
            newIndex = board.get_next_available_index_strokes();
            const positions = new Array();
            data.points.forEach((e: any) => {
                const pos = new Coord(e[1].x, e[1].y);
                positions.push(pos);
            });
            newElement = new Stroke(positions, data.color, data.width, newIndex);
        } else if (kind == "Area") {
            newIndex = board.get_next_available_index_area();
            const c1 = new Coord(data.c1.x, data.c1.y);
            const c2 = new Coord(data.c2.x, data.c2.y);
            newElement = new Area(data.label + newIndex, c1, c2, data.color, newIndex);
        }
        else if (kind == "TextZone") {
            newIndex = board.get_next_available_index_text_zone();
            const pos = new Coord(data.pos.x, data.pos.y);
            newElement = new TextZone(pos, 200, "new text zone", newIndex);
        } else if (kind == "Vertex") {
            newIndex = board.graph.get_next_available_index_vertex();
            const pos = new Coord(data.pos.x, data.pos.y);
            const newVertexData = new BasicVertexData(new Coord(pos.x, pos.y), data.weight, data.color);
            newElement = new BasicVertex(newIndex, newVertexData);
        } else if (kind == "Link") {
            newIndex = board.graph.get_next_available_index_links();
            let orient = ORIENTATION.UNDIRECTED;
            switch (data.orientation) {
                case "UNDIRECTED":
                    orient = ORIENTATION.UNDIRECTED
                    break;
                case "DIRECTED":
                    orient = ORIENTATION.DIRECTED
                    break;
            }
            const startVertex = board.graph.vertices.get(data.start_index);
            const endVertex = board.graph.vertices.get(data.end_index);
            if (typeof startVertex != "undefined" && typeof endVertex != "undefined"){
                const newLinkData = new BasicLinkData(undefined, data.weight, data.color);
                newElement = new BasicLink(newIndex, startVertex, endVertex, orient, newLinkData );
            } else {
                console.log(`Error: AddElement.fromBoard: trying to add a link between undefined vertex index ${data.start_index} or ${data.end_index}`);
                return undefined;
            }
        } else {
            console.log(`Error: AddElement.fromBoard: kind is not supported: ${kind}`);
            return undefined;
        }

        return new AddElement(kind, newIndex, newElement, callback);
    }

    static handle(board: HistBoard, kind: string, data: any, callback: (created_index: number) => void) {
        console.log(`Handle: add_element in ${board.roomId}: ${kind} ${toShortString(kind, data)}`);
        const modif = AddElement.fromBoard(board, kind, data, callback);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard){
        this.callback(this.index);
    }

    emitImplementation(board: HistBoard){
        broadcastInRoom(board.roomId, "add_elements", [{ kind: this.kind, index: this.index, element: this.element }], new Set());
    }

    emitDeimplementation(board: HistBoard){
        broadcastInRoom(board.roomId, "delete_elements", [[this.kind, this.index]], new Set());

    }

    static addEvent(client: Client){
        client.socket.on("add_element", (kind: string, data: any, callback: (created_index: number) => void) => { AddElement.handle(client.board, kind, data, callback)} );
    }
}




function toShortString(kind: string, data: any): string{
    if (kind == "Vertex"){
        return `${data.pos.x.toFixed(2)} ${data.pos.y.toFixed(2)} ${data.color} ${data.weight}`;
    } else if (kind == "Link"){
        return `${data.orientation == "UNDIRECTED" ? "edge": "arc" } ${data.start_index} ${data.end_index} ${data.color} ${data.weight}`;
    } else if (kind == "Stroke"){
        return `${data.points.length}points ${data.color} ${data.width}`;
    }
    else {
        return JSON.stringify(data)
    }
}