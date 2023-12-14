import { Stroke, Area, TextZone, BasicVertex, BasicLink, BasicVertexData, BasicLinkData, Rectangle } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

/**
 * Contains the list of the deleted elements
 */
export class DeleteElements implements BoardModification {
    agregId: string;
    vertices: Map<number, BasicVertex<BasicVertexData>>;
    links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>;
    strokes: Map<number, Stroke>;
    areas: Map<number, Area>;
    text_zones: Map<number, TextZone>;
    rectangles: Map<number, Rectangle>;

    constructor(agregId: string, vertices: Map<number, BasicVertex<BasicVertexData>>, links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>, strokes: Map<number, Stroke>, areas: Map<number, Area>, text_zones: Map<number, TextZone>, rectangles: Map<number, Rectangle>) {
        this.agregId = agregId;
        this.vertices = vertices;
        this.links = links;
        this.strokes = strokes;
        this.areas = areas;
        this.text_zones = text_zones;
        this.rectangles = rectangles;
    }

    static fromBoard(board: ServerBoard, agregId: string, indices: Array<[string, number]>): DeleteElements | undefined{
        const vertices = new Map();
        const links = new Map();
        const strokes = new Map();
        const areas = new Map();
        const textZones = new Map();
        const rectangles = new Map();
        for (const [kind, index] of indices){
            if (kind == "Vertex"){
                const deletedVertex = board.graph.vertices.get(index);
                if (typeof deletedVertex == "undefined"){
                    console.log(`Error: DeleteElements.fromBoard: vertex index ${index} does not exists`);
                    return undefined;
                }
                vertices.set(index, deletedVertex);
                board.graph.links.forEach((link, link_index) => {
                    if (link.endVertex.index === index || link.startVertex.index === index) {
                        links.set(link_index, link);
                    }
                })
            } else if (kind == "Link"){
                const deletedLink = board.graph.links.get(index);
                if (typeof deletedLink == "undefined"){
                    console.log(`Error: DeleteElements.fromBoard: link index ${index} does not exists`);
                    return undefined;
                }
                links.set(index, deletedLink);
            } else if (kind == "Stroke"){
                strokes.set(index, board.strokes.get(index));
            } else if (kind == "Area"){
                areas.set(index, board.areas.get(index));
            } else if (kind == "TextZone"){
                textZones.set(index, board.text_zones.get(index));
            } else if (kind == "Rectangle"){
                rectangles.set(index, board.rectangles.get(index));
            } else {
                console.log(`Error: DeleteElements.fromBoard: kind ${kind} not supported`);
                return undefined;
            }
        }
        return new DeleteElements(agregId, vertices, links, strokes, areas, textZones, rectangles);
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for (const index of this.vertices.keys()) {
            board.graph.delete_vertex(index);
        }
        for (const index of this.links.keys()) {
            board.graph.delete_link(index);
        }
        for (const index of this.strokes.keys()) {
            board.delete_stroke(index);
        }
        for (const index of this.areas.keys()) {
            board.delete_area(index);
        }
        for (const index of this.text_zones.keys()){
            board.text_zones.delete(index);
        }
        for (const index of this.rectangles.keys()){
            board.rectangles.delete(index);
        }
        // TODO set is false
        return new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC, SENSIBILITY.WEIGHT])
    }


    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        for (const [index, vertex] of this.vertices.entries()) {
            board.graph.vertices.set(index, vertex);
        }
        for (const [index, link] of this.links.entries()) {
            board.graph.links.set(index, link);
        }
        for (const [index, stroke] of this.strokes.entries()) {
            board.strokes.set(index, stroke);
        }
        for (const [index, area] of this.areas.entries()) {
            board.areas.set(index, area);
        }
        for (const [index, text_zone] of this.text_zones.entries()){
            board.text_zones.set(index, text_zone);
        }
        for (const [index, rectangle] of this.rectangles.entries()){
            board.rectangles.set(index, rectangle);
        }
        return new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC, SENSIBILITY.WEIGHT])
    }

    agregate(board: HistBoard, elementsToDelete: Array<BasicVertex<BasicVertexData> | BasicLink<BasicVertexData, BasicLinkData> | Stroke | Area | TextZone | Rectangle>){
        for (const element of elementsToDelete){
            if (element instanceof BasicVertex){
                this.vertices.set(element.index, element);
                board.graph.vertices.delete(element.index);
            } else if (element instanceof BasicLink){
                this.links.set(element.index, element);
                board.graph.links.delete(element.index);
            } else if (element instanceof Stroke){
                this.strokes.set(element.index, element);
                board.strokes.delete(element.index);
            } else if (element instanceof Area){
                this.areas.set(element.index, element);
                board.areas.delete(element.index);
            } else if (element instanceof TextZone){
                this.text_zones.set(element.index, element);
                board.text_zones.delete(element.index);
            } else if (element instanceof Rectangle){
                this.rectangles.set(element.index, element);
                board.rectangles.delete(element.index);
            }
        }
    }

    static handle(board: HistBoard, agregId: string, rawElements: Array<[string, number]>): void{
        console.log("Handle: delete_elements", agregId, rawElements);

        if (board.modifications_stack.length > 0){
            const lastModif = board.modifications_stack[board.modifications_stack.length-1];
            if (lastModif instanceof DeleteElements && lastModif.agregId == agregId){
                const elementsToDelete = transformRawElements(board, rawElements);
                if ( typeof elementsToDelete != "undefined"){
                    lastModif.agregate(board, elementsToDelete);
                    broadcastInRoom(board.roomId, "delete_elements", rawElements, new Set());
                    return;
                }
            }
        }

        const modif = DeleteElements.fromBoard(board, agregId, rawElements);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        const indices= new Array<[string, number]>();
        for (const vertexId of this.vertices.keys()){
            indices.push(["Vertex", vertexId])
        }
        for (const linkId of this.links.keys()){
            indices.push(["Link", linkId])
        }
        for (const strokeId of this.strokes.keys()){
            indices.push(["Stroke", strokeId])
        }
        for (const areaId of this.areas.keys()){
            indices.push(["Area", areaId])
        }
        for (const id of this.text_zones.keys()){
            indices.push(["TextZone", id])
        }
        for (const id of this.rectangles.keys()){
            indices.push(["Rectangle", id])
        }

        broadcastInRoom(board.roomId, "delete_elements", indices, new Set());
    }

    emitDeimplementation(board: HistBoard): void {
        const removed = new Array();
        for (const [index, vertex] of this.vertices.entries()) {
            removed.push({ kind: "Vertex", index: index, element: vertex });
        }
        for (const [index, link] of this.links.entries()) {
            removed.push({ kind: "Link", index: index, element: link });
        }
        for (const [index, area] of this.areas.entries()) {
            removed.push({ kind: "Area", index: index, element: area });
        }
        for (const [index, stroke] of this.strokes.entries()) {
            removed.push({ kind: "Stroke", index: index, element: stroke });
        }
        for (const [index, text_zone] of this.text_zones.entries()) {
            removed.push({ kind: "TextZone", index: index, element: text_zone });
        }
        for (const [index, rectangle] of this.rectangles.entries()){
            removed.push({kind: "Rectangle", index: index, element: rectangle})
        }
        broadcastInRoom(board.roomId, "add_elements", removed, new Set());
    }

    static addEvent(client: Client){
        client.socket.on("delete_elements", (agregId: string, indices: Array<[string, number]>) => { DeleteElements.handle(client.board, agregId, indices)});

    }
}





function transformRawElements(board: HistBoard, rawElements: Array<[string, number]>): undefined | Array<BasicVertex<BasicVertexData> | BasicLink<BasicVertexData, BasicLinkData> | Stroke | Area | TextZone > {
    const elements = new Array();
    for (const [kind, index] of rawElements){
        if (kind == "Vertex"){
            const deletedVertex = board.graph.vertices.get(index);
            if (typeof deletedVertex == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: vertex index ${index} does not exist`);
                return undefined;
            }
            elements.push(deletedVertex);
            board.graph.links.forEach((link, link_index) => {
                if (link.endVertex.index === index || link.startVertex.index === index) {
                    elements.push(link);
                }
            })
        } else if (kind == "Link"){
            const deletedLink = board.graph.links.get(index);
            if (typeof deletedLink == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: link index ${index} does not exist`);
                return undefined;
            }
            elements.push(deletedLink);
        } else if (kind == "Stroke"){
            const stroke = board.strokes.get(index);
            if (typeof stroke == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: stroke index ${index} does not exist`);
                return undefined;
            }
            elements.push(stroke);
        } else if (kind == "Area"){
            const area = board.areas.get(index);
            if (typeof area == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: area index ${index} does not exist`);
                return undefined;
            }
            elements.push(area);
        } else if (kind == "TextZone"){
            const tz = board.areas.get(index);
            if (typeof tz == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: textZone index ${index} does not exist`);
                return undefined;
            }
            elements.push(tz);
        } else if (kind == "Rectangle"){
            const rectangle = board.rectangles.get(index);
            if (typeof rectangle == "undefined"){
                console.log(`Error: DeleteElements.fromBoard: rectangle index ${index} does not exist`);
                return undefined;
            }
            elements.push(rectangle);
        } else {
            console.log(`Error: DeleteElements.fromBoard: kind ${kind} not supported`);
            return undefined;
        }
    }

    return elements;
}