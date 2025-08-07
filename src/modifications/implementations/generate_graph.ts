import { BasicLink, BasicVertex, BasicVertexData, Coord, EmbeddedGraph, generateGraph, Option, ORIENTATION, Vect } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard, ServerLinkData } from "../modification";




export class GenerateGraph implements BoardModification {
    addedVertices: Array<BasicVertex<BasicVertexData>>;
    addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>;

    constructor(addedVertices: Array<BasicVertex<BasicVertexData>>, addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>){
        this.addedVertices = addedVertices;
        this.addedLinks = addedLinks;
    }


    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for ( const vertex of this.addedVertices){
            board.graph.vertices.set(vertex.index, vertex);
        }
        for ( const link of this.addedLinks){
            board.graph.links.set(link.index, link);
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
        return new Set([SENSIBILITY.ELEMENT])
    }

    static handle(board: HistBoard, clientId: string, shift: {x: number, y: number}, generatorId: string, params: Array<any>): void{
        console.log(`Handle generate-graph b:${board.roomId} u:${clientId}: ${shift.x.toFixed(2)} ${shift.y.toFixed(2)} ${generatorId} ${params}`);

        const g = generateGraph(generatorId, params);
        if ( typeof g == "undefined"){
            console.log(`Error: generateGraph failed: handle request is impossible`);
            return;
        }

        const addedVertices = new Map<number, BasicVertex<BasicVertexData>>();
        const addedLinks = new Array<BasicLink<BasicVertexData, ServerLinkData>>();
        
        const vertex_indices_transformation = new Map<number, number>(); // used to translate the vertices indices in the added links
        const new_vertex_indices: Array<number> = board.graph.get_next_n_available_vertex_indices(g.vertices.size);
        let i = 0;
        for (const v of g.vertices.values()) {
            const vertexData = new BasicVertexData(new Coord(v.data.pos.x + shift.x, v.data.pos.y + shift.y), "", "Neutral");
            const vertex = new BasicVertex(new_vertex_indices[i], vertexData);
            addedVertices.set(vertex.index, vertex);
            vertex_indices_transformation.set(v.index, vertex.index);
            i++;
        }

        const new_link_indices = board.graph.get_next_n_available_link_indices(g.links.size);
        let j = 0;
        for (const newLink of g.links.values()) {
            const startIndex = vertex_indices_transformation.get(newLink.startVertex.index);
            const endIndex = vertex_indices_transformation.get(newLink.endVertex.index);
            if (typeof startIndex == "number" && typeof endIndex == "number") {
                const startVertex = addedVertices.get(startIndex);
                const endVertex = addedVertices.get(endIndex);
                if (typeof startVertex == "undefined" || typeof endVertex == "undefined"){
                    console.log(`Error: cannot create GraphPaste: cannot get new startVertex or new endVertex at indices ${startIndex} ${endIndex}`)
                    return;
                }
                const linkData = new ServerLinkData(undefined, "", "Neutral", "normal");
                const link = new BasicLink(new_link_indices[j], startVertex, endVertex, newLink.orientation, linkData);
                addedLinks.push( link);
                j++;
            }
        }

        const modif = new GenerateGraph([...addedVertices.values()], addedLinks);
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
        broadcastInRoom(board.roomId, "delete_elements", indices, new Set());
    }


    static addEvent(client: Client){
        client.socket.on("generate-graph", (pos: {x: number, y: number}, generatorId: string, params: Array<any>) => {GenerateGraph.handle(client.board, client.label, pos, generatorId, params)});
    }
}







