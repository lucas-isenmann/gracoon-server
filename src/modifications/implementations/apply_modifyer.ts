import { BasicLink, BasicLinkData, BasicVertex, BasicVertexData, Link, Option, ORIENTATION, Vertex } from "gramoloss";
import { emitGraphToRoom } from "../..";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

export class ApplyModifyer implements BoardModification {
    old_vertices: Map<number, BasicVertex<BasicVertexData>>;
    old_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>;
    new_vertices: Map<number, BasicVertex<BasicVertexData>>;
    new_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>;

    constructor(old_vertices: Map<number, BasicVertex<BasicVertexData>>, old_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>, new_vertices: Map<number, BasicVertex<BasicVertexData>>,        new_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>){
        this.old_vertices = old_vertices;
        this.old_links = old_links;
        this.new_vertices = new_vertices;
        this.new_links = new_links;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        board.graph.vertices = new Map();
        for ( const [vertex_index, vertex] of this.new_vertices.entries()){
            board.graph.vertices.set(vertex_index, vertex);
        }
        board.graph.links = new Map();
        for ( const [link_index, link] of this.new_links.entries()){
            board.graph.links.set(link_index, link);
        }
        return new Set([SENSIBILITY.ELEMENT]);
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        board.graph.vertices = new Map();
        for ( const [vertex_index, vertex] of this.old_vertices.entries()){
            board.graph.vertices.set(vertex_index, vertex);
        }
        board.graph.links = new Map();
        for ( const [link_index, link] of this.old_links.entries()){
            board.graph.links.set(link_index, link);
        }
        return new Set([SENSIBILITY.ELEMENT])
    }

    static handle(board: HistBoard, name: string, attributesData: Array<any>, verticesSelection: Option<Array<number>>) {
        console.log(`Handle: apply modifyer: ${name}`);
        const oldVertices = new Map<number, BasicVertex<BasicVertexData>>();
        const oldLinks = new Map<number, BasicLink<BasicVertexData, BasicLinkData>>();
        for (const [index, vertex] of board.graph.vertices.entries()) {
            const oldVertexData = new BasicVertexData(vertex.data.pos, vertex.data.weight, vertex.data.color);
            const oldVertex = new BasicVertex(index, oldVertexData);
            oldVertices.set(index, oldVertex);
        }
        for (const [index, link] of board.graph.links.entries()) {
            const oldLinkData = new BasicLinkData(link.data.cp, link.data.weight, link.data.color);
            const oldLink = new BasicLink(index, link.startVertex, link.endVertex, link.orientation, oldLinkData);
            oldLinks.set(index, oldLink);
        }

        if (name == "into_tournament") {
            if (attributesData.length != 1) {
                console.log(`Error: wrong number of attributes: ${attributesData.length} (expected: 1)`);
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
                console.log(`Error: wrong number of attributes: ${attributesData.length} (expected: 2)`);
                return;
            }
            const areaIndex = attributesData[0];
            const p = attributesData[1];
            if (typeof p == "number"){
                if (typeof areaIndex == "string") {
                    if (areaIndex == "Everything"){
                        for (const index of board.graph.links.keys()) {
                            if (Math.random() < p){
                                board.graph.links.delete(index);
                            }
                        }
                    } else {
                        if (typeof verticesSelection != "undefined"){
                            for (const [index, link] of board.graph.links.entries()) {
                                if (Math.random() < p && verticesSelection.includes(link.startVertex.index) && verticesSelection.includes(link.endVertex.index)){
                                    board.graph.links.delete(index);
                                }
                            }
                        } else {
                            console.log("asked: selection, but no attributes vertices selection given")
                        }
                    }
                } else {
                    const area = board.areas.get(areaIndex);
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

        const new_vertices = new Map<number, BasicVertex<BasicVertexData>>();
        const new_links = new Map<number, BasicLink<BasicVertexData, BasicLinkData>>();
        for (const [index, vertex] of board.graph.vertices.entries()) {
            const newVertexData = new BasicVertexData(vertex.data.pos.copy(), vertex.data.weight, vertex.data.color);
            const newVertex = new BasicVertex(index, newVertexData);
            new_vertices.set(index, newVertex);
        }
        for (const [index, link] of board.graph.links.entries()) {
            const newLinkData = new BasicLinkData(undefined, link.data.weight, link.data.color);
            if (typeof link.data.cp != "undefined" ){
                newLinkData.cp = link.data.cp.copy();
            }
            const newLink = new BasicLink(index, link.startVertex, link.endVertex, link.orientation, newLinkData);
            new_links.set(index, newLink);
        }

        const modif = new ApplyModifyer(oldVertices, oldLinks, new_vertices, new_links);
        board.append_modification_already_implemented(modif);
        emitGraphToRoom(board, new Set([SENSIBILITY.ELEMENT]));
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        emitGraphToRoom(board, new Set([SENSIBILITY.ELEMENT]));
    }

    emitDeimplementation(board: HistBoard): void {
        emitGraphToRoom(board, new Set());
    }

    static addEvent(client: Client){
        client.socket.on("apply_modifyer", (name: string, attributesData: Array<any>, verticesSelection: Option<Array<number>>) => ApplyModifyer.handle(client.board, name, attributesData, verticesSelection));
    }
}