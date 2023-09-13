import { BasicLink, BasicLinkData, BasicVertex, BasicVertexData, Coord, ORIENTATION } from "gramoloss";
import { Socket } from "socket.io";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

export class GraphPaste implements BoardModification {
    addedVertices: Array<BasicVertex<BasicVertexData>>;
    addedLinks: Array<BasicLink<BasicVertexData, BasicLinkData>>;

    constructor(addedVertices: Array<BasicVertex<BasicVertexData>>, addedLinks: Array<BasicLink<BasicVertexData, BasicLinkData>>){
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

    static handle(board: HistBoard, verticesEntries: any[], linksEntries: any[]): void{
        console.log("Handle: paste_graph");

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


    static addEvent(board: HistBoard, client: Socket){
        client.on("paste_graph", (verticesEntries: any[], linksEntries: any[]) => {GraphPaste.handle(board, verticesEntries, linksEntries)});
    }
}
