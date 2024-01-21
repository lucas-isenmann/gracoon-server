import { Stroke, Area, TextZone, BasicVertexData, BasicLinkData, BasicVertex, BasicLink, Coord, ORIENTATION, Option, Rectangle } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { BoardElement, HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardElementKind, BoardModification, kindOfElement, SENSIBILITY, ServerBoard } from "../modification";





/**
 * kind: the kind of the new element
 * index: the index of the new element
 */
export class AddElements implements BoardModification {
    agregId: string;
    elements: Array<BoardElement>;
    callback: (response: number) => void;
    
    constructor(agregId: string, callback: (response: number) => void ) {
        this.agregId = agregId;
        this.elements = new Array();
        this.callback = callback;
    }

    try_implement(board: HistBoard): Set<SENSIBILITY> | string{
        for (const element of this.elements){
            trySetElement(board, element);
        }
        
        return new Set();
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        for (const element of this.elements){
            if ( element instanceof TextZone){
                board.text_zones.delete(element.index);
            } else if (element instanceof Stroke){
                board.strokes.delete(element.index);
            } else if (element instanceof Area){
                board.areas.delete(element.index);
            } else if (element instanceof BasicVertex){
                board.graph.delete_vertex(element.index);
            } else if (element instanceof BasicLink){
                board.graph.links.delete(element.index);
            } else if (element instanceof Rectangle){
                board.rectangles.delete(element.index);
            }
        }
        
        return new Set();
    }


    static fromBoard(board: HistBoard, agregId: string, kind: string, data: any, callback: (index: number) => void): AddElements | undefined{
        const newElement = elementFromRaw(board, kind, data);
        if (typeof newElement == "undefined"){
            console.log("Error: AddElements.fromBoard: newElement is undefined")
            return;
        }
        const modif = new AddElements(agregId, callback);
        modif.agregate(newElement);
        return modif;
    }

    agregate(newElement: BoardElement): void{
        for (const element of this.elements){
            if (kindOfElement(element) == kindOfElement(newElement) && element.index == newElement.index){
                return;
            }
        }
        this.elements.push(newElement)
    }


    static handle(board: HistBoard, clientId: string, agregId: string, kind: string, data: any, callback: (created_index: number) => void) {
        console.log(`Handle: add_element b:${board.roomId} u:${clientId} a:${agregId} ${kind} ${toShortString(kind, data)}`);


        if (board.modifications_stack.length > 0){
            const lastModif = board.modifications_stack[board.modifications_stack.length-1];
            if (lastModif instanceof AddElements && lastModif.agregId == agregId){
                const newElement = elementFromRaw(board, kind, data);
                if (typeof newElement == "undefined"){
                    console.log("Error: AddElements.handle: newElement is undefined");
                    return;
                }
                lastModif.agregate(newElement);
                trySetElement(board, newElement);
                callback(newElement.index);
                broadcastInRoom(board.roomId, "add_elements", [{ index: newElement.index, kind: kind, element: newElement }], new Set());
                return;
            }
        }

        const modif = AddElements.fromBoard(board, agregId, kind, data, callback);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard){
        if (this.elements.length > 0){
            this.callback(this.elements[0].index);
        }
    }

    emitImplementation(board: HistBoard){
        const data = new Array<{kind: BoardElementKind, index: number, element: any}>();
        for (const element of this.elements){
            data.push( {kind: kindOfElement(element), index: element.index, element: element})
        }
        broadcastInRoom(board.roomId, "add_elements", data, new Set());
    }

    emitDeimplementation(board: HistBoard){
        const data = new Array<[ BoardElementKind, number]>();
        for (const element of this.elements){
            data.push( [kindOfElement(element), element.index])
        }
        broadcastInRoom(board.roomId, "delete_elements", data, new Set());

    }

    static addEvent(client: Client){
        client.socket.on("add_element", (agregId: string, kind: string, data: any, callback: (created_index: number) => void) => { AddElements.handle(client.board, client.label, agregId, kind, data, callback)} );
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


function elementFromRaw(board: HistBoard, kind: string, data: any): Option<BoardElement>{
    if (kind == "Rectangle"){
        const newIndex = board.get_next_available_index_rectangle();
        const c1 = new Coord(data.c1.x, data.c1.y);
        const c2 = new Coord(data.c2.x, data.c2.y);
        return new Rectangle(c1, c2, data.color, newIndex);
    }
    if (kind == "Stroke") {
        const newIndex = board.get_next_available_index_strokes();
        const positions = new Array();
        data.points.forEach((e: any) => {
            const pos = new Coord(e[1].x, e[1].y);
            positions.push(pos);
        });
        return new Stroke(positions, data.color, data.width, newIndex);
    } else if (kind == "Area") {
        const newIndex = board.get_next_available_index_area();
        const c1 = new Coord(data.c1.x, data.c1.y);
        const c2 = new Coord(data.c2.x, data.c2.y);
        return new Area(data.label + newIndex, c1, c2, data.color, newIndex);
    }
    else if (kind == "TextZone") {
        const newIndex = board.get_next_available_index_text_zone();
        const pos = new Coord(data.pos.x, data.pos.y);
        return new TextZone(pos, 200, "new text zone", newIndex);
    } else if (kind == "Vertex") {
        const newIndex = board.graph.get_next_available_index_vertex();
        const pos = new Coord(data.pos.x, data.pos.y);
        const newVertexData = new BasicVertexData(new Coord(pos.x, pos.y), data.weight, data.color);
        return new BasicVertex(newIndex, newVertexData);
    } else if (kind == "Link") {
        const newIndex = board.graph.get_next_available_index_links();
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
            return new BasicLink(newIndex, startVertex, endVertex, orient, newLinkData );
        } else {
            console.log(`Error: elementFromRaw trying: to create a link between undefined vertex index ${data.start_index} or ${data.end_index}`);
            return undefined;
        }
    } else {
        console.log(`Error: elementFromRaw: kind is not supported: ${kind}`);
        return undefined;
    }
}


function trySetElement(board: HistBoard, element: BoardElement): string | undefined{
    if (element instanceof TextZone){
        if ( board.text_zones.has(element.index) ){
            return "index " + String(element.index) + " already exists in text_zones";
        } else {
            board.text_zones.set(element.index, element);
        }
    } else if (element instanceof BasicVertex){
        if ( board.graph.vertices.has(element.index) ){
            return "index " + String(element.index) + " already exists in vertices";
        } else {
            board.graph.vertices.set(element.index, element);
        }
    }else if (element instanceof BasicLink){
        if ( board.graph.links.has(element.index) ){
            return "index " + String(element.index) + " already exists in links";
        } else {
            if (board.graph.check_link(element)){
                board.graph.links.set(element.index, element);
            } else {
                return "Error: link is not valid";
            }
        }
    }else if (element instanceof Stroke){
        if ( board.strokes.has(element.index) ){
            return "index " + String(element.index) + " already exists in strokes";
        } else {
            board.strokes.set(element.index, element);
        }
    }else if (element instanceof Area){
        if ( board.areas.has(element.index) ){
            return "index " + String(element.index) + " already exists in areas";
        } else {
            board.areas.set(element.index, element);
        }
    } else if (element instanceof Rectangle){
        if ( board.rectangles.has(element.index) ){
            return "index " + String(element.index) + " already exists in rectangles";
        } else {
            board.rectangles.set(element.index, element);
        }
    }
    return undefined;
}