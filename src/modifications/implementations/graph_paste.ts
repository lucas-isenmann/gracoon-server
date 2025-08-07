import { BasicLink, BasicVertex, BasicVertexData, Coord, ORIENTATION, Rectangle, Stroke } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard, ServerLinkData } from "../modification";

export class GraphPaste implements BoardModification {
    addedVertices: Array<BasicVertex<BasicVertexData>>;
    addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>;

    addedElements: Array<Stroke | Rectangle>;

    constructor(addedVertices: Array<BasicVertex<BasicVertexData>>, addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>, addedElements: Array<Stroke|Rectangle>){
        this.addedVertices = addedVertices;
        this.addedLinks = addedLinks;
        this.addedElements = addedElements;
    }


    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for ( const vertex of this.addedVertices){
            board.graph.vertices.set(vertex.index, vertex);
        }
        for ( const link of this.addedLinks){
            board.graph.links.set(link.index, link);
        }
        for (const element of this.addedElements){
            if (element instanceof Stroke){
                board.strokes.set(element.index, element);
            } else if (element instanceof Rectangle){
                board.rectangles.set(element.index, element);
            }
        }
        return new Set([SENSIBILITY.ELEMENT]);
    }


    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        for ( const vertex of this.addedVertices){
            board.graph.vertices.delete(vertex.index);
        }
        for ( const link of this.addedLinks){
            board.graph.links.delete(link.index);
        }
        for (const element of this.addedElements){
            if (element instanceof Stroke){
                board.strokes.delete(element.index);
            }else if (element instanceof Rectangle){
                board.rectangles.delete(element.index);
            }
        }
        return new Set([SENSIBILITY.ELEMENT])
    }

    static handle(board: HistBoard, clientId: string, rawElements: any[]): void{
        console.log(`Handle: paste_graph b:${board.roomId} u:${clientId} ${rawElements.length} elements`);

        const addedVertices = new Map<number, BasicVertex<BasicVertexData>>();
        const addedLinks = new Array<BasicLink<BasicVertexData, ServerLinkData>>();
        const vertex_indices_transformation = new Map<number, number>(); // used to translate the vertices indices in the added links


        const new_vertex_indices: Array<number> = board.graph.get_next_n_available_vertex_indices(countType(rawElements, "Vertex"));
        let i = 0;
        for (const data of rawElements) {
            if (data.type == "Vertex"){
                const vertexData = new BasicVertexData(new Coord(data.x, data.y), data.weight, data.color);
                const vertex = new BasicVertex(new_vertex_indices[i], vertexData);
                addedVertices.set(vertex.index, vertex);
                vertex_indices_transformation.set(data.index, vertex.index);
                i++;
            }
        }

        const new_link_indices = board.graph.get_next_n_available_link_indices(countType(rawElements, "Link"));
        let j = 0;
        for (const data of rawElements) {
            if (data.type == "Link"){
                let orient = ORIENTATION.UNDIRECTED;
                switch (data.orientation) {
                    case "UNDIRECTED":
                        orient = ORIENTATION.UNDIRECTED
                        break;
                    case "DIRECTED":
                        orient = ORIENTATION.DIRECTED
                        break;
                }
                const startIndex = vertex_indices_transformation.get(data.startIndex);
                // console.log("link: startIndex ", startIndex);
                const endIndex = vertex_indices_transformation.get(data.endIndex);
                if (typeof startIndex == "number" && typeof endIndex == "number") {
                    let cp: undefined | Coord = undefined;
                    if ( data.cp ){
                        cp =  new Coord(data.cp.x, data.cp.y);
                    }
                    const startVertex = addedVertices.get(startIndex);
                    const endVertex = addedVertices.get(endIndex);
                    if (typeof startVertex == "undefined" || typeof endVertex == "undefined"){
                        console.log(`Error: cannot create GraphPaste: cannot get new startVertex or new endVertex at indices ${startIndex} ${endIndex}`)
                        return;
                    }
                    const linkData = new ServerLinkData(cp, data.weight, data.color, "normal");
                    const link = new BasicLink(new_link_indices[j], startVertex, endVertex, orient, linkData);
                    addedLinks.push( link);
                    j++;
                }
            }
        }

        const newStrokesIndices = board.getNextNAvailableStrokeIndices(countType(rawElements, "Stroke"));
        const addedElements = new Array<Stroke|Rectangle>();
        i = 0;
        for (const element of rawElements) {
            if (element.type == "Stroke"){
                const positions = new Array();
                for (const pos of element.positions){
                    positions.push( new Coord(pos.x, pos.y));
                }
                const stroke = new Stroke(positions, element.color, element.width, newStrokesIndices[i]); 
                addedElements.push(stroke);
                i++;
            }
        }        

        const newRectanglesIndices = board.getNextNAvailableRectangleIndices(countType(rawElements, "Rectangle"));
        i = 0;
        for (const element of rawElements) {
            if (element.type == "Rectangle"){
                const rectangle = new Rectangle(new Coord(element.x1, element.y1), new Coord(element.x2, element.y2), element.color,  newRectanglesIndices[i]); 
                addedElements.push(rectangle);
                i++;
            }
        }        

        const modif = new GraphPaste([...addedVertices.values()], addedLinks, addedElements);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        const elements = new Array();
        for (const vertex of this.addedVertices) {
            elements.push({ kind: "Vertex", index: vertex.index, element: vertex });
        }
        for (const link of this.addedLinks) {
            elements.push({ kind: "Link", index: link.index, element: link });
        }
        for (const element of this.addedElements){
            if (element instanceof Stroke){
                elements.push({kind: "Stroke", index: element.index, element: element})
            } else if (element instanceof Rectangle){
                elements.push({kind: "Rectangle", index: element.index, element: element})
            }
        }
        broadcastInRoom(board.roomId, "add_elements", elements, new Set());
    }

    emitDeimplementation(board: HistBoard): void {
        const indices = new Array();
        for (const vertex of this.addedVertices) {
            indices.push(["Vertex", vertex.index]);
        }
        for (const link of this.addedLinks) {
            indices.push(["Link", link.index]);
        }
        for (const element of this.addedElements){
            if (element instanceof Stroke){
                indices.push(["Stroke", element.index]);
            } else if (element instanceof Rectangle){
                indices.push(["Rectangle", element.index]);
            }
        }
        broadcastInRoom(board.roomId, "delete_elements", indices, new Set());
    }


    static addEvent(client: Client){
        client.socket.on("paste_graph", (rawElements: any[]) => {GraphPaste.handle(client.board, client.label, rawElements)});
    }
}




function countType(rawElements: any[], type: string){
    let counter = 0;
    for (const rawElement of rawElements){
        if (rawElement.type == type){
            counter ++;
        }
    }
    return counter;
}