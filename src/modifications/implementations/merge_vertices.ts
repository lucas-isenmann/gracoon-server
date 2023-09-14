import { eqSet, BasicVertex, BasicVertexData, BasicLinkData, BasicLink } from "gramoloss";
import { emit_graph_to_room } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

/**
    deleted_links: links that are deleted during the implementation
    modified_links_indices: links that are modifed
 */
export class MergeVertices implements BoardModification {
    vertexFixed: BasicVertex<BasicVertexData>;
    vertex_to_remove: BasicVertex<BasicVertexData>;
    deleted_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>;
    modified_links_indices: Array<number>;

    constructor(vertexFixed: BasicVertex<BasicVertexData>, vertex_to_remove: BasicVertex<BasicVertexData>, deleted_links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>, modified_links_indices: Array<number>) {
        this.vertexFixed = vertexFixed;
        this.vertex_to_remove = vertex_to_remove;
        this.deleted_links = deleted_links;
        this.modified_links_indices = modified_links_indices;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for (const link_index of this.deleted_links.keys()){
            board.graph.links.delete(link_index);
        }
        for (const link_index of this.modified_links_indices.values()){
            const link = board.graph.links.get(link_index);
            if (typeof link !== "undefined"){
                if ( link.startVertex.index == this.vertex_to_remove.index){
                    link.startVertex = this.vertexFixed;
                    const fixed_end = link.endVertex;
                    link.transformCP( this.vertexFixed.data.pos, this.vertex_to_remove.data.pos, fixed_end.data.pos);
                } else if ( link.endVertex.index == this.vertex_to_remove.index){
                    link.endVertex = this.vertexFixed;
                    const fixed_end = link.startVertex;
                    link.transformCP(this.vertexFixed.data.pos, this.vertex_to_remove.data.pos, fixed_end.data.pos);
                }
            }
        }
        board.graph.delete_vertex(this.vertex_to_remove.index);
        return new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC, SENSIBILITY.WEIGHT])
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        board.graph.vertices.set(this.vertex_to_remove.index, this.vertex_to_remove);
        for (const [link_index, link] of this.deleted_links.entries()) {
            board.graph.links.set(link_index, link);
        }
        for (const link_index of this.modified_links_indices.values()) {
            const link = board.graph.links.get(link_index);
            if (link !== undefined){
                if (link.startVertex.index == this.vertexFixed.index){
                    link.startVertex = this.vertex_to_remove;
                    const fixed_end = link.endVertex;
                    link.transformCP(this.vertex_to_remove.data.pos, this.vertexFixed.data.pos, fixed_end.data.pos);
                } else if (link.endVertex.index == this.vertexFixed.index ){
                    link.endVertex = this.vertex_to_remove;
                    const fixed_end = link.startVertex;
                    link.transformCP(this.vertex_to_remove.data.pos, this.vertexFixed.data.pos, fixed_end.data.pos);
                }
            }
        }

        
        return new Set([]);
    }

    // does not modify the graph
    // any link between fixed and remove are deleted
    // any link such that one of its endpoints is "remove", is either deleted either modified
    static fromBoard(board: ServerBoard, vertex_index_fixed: number, vertex_index_to_remove: number ): MergeVertices | undefined{
        const vertexFixed = board.graph.vertices.get(vertex_index_fixed);
        const vertex_to_remove = board.graph.vertices.get(vertex_index_to_remove);
        if (typeof vertexFixed == "undefined" || typeof vertex_to_remove == "undefined"){
            console.log(`Error: cannot create MergeVertices: ${vertex_index_fixed} or ${vertex_index_to_remove} is not a valid vertex index.`)
            return undefined;
        }
        
        const deleted_links = new Map();
        const modified_links_indices = new Array();

        for ( const [link_index, link] of board.graph.links.entries()) {
            const endpoints = new Set([link.startVertex.index, link.endVertex.index]);
            if ( eqSet(endpoints, new Set([vertex_index_fixed, vertex_index_to_remove])) ){
                deleted_links.set(link_index, link);
            } else if (link.endVertex.index == vertex_index_to_remove) {
                let is_deleted = false;
                for (const [index2, link2] of board.graph.links.entries()) {
                    if ( index2 != link_index && link2.signatureEquals(link.startVertex.index, vertex_index_fixed, link.orientation )){
                        deleted_links.set(link_index, link);
                        is_deleted = true;
                        break;
                    }
                }
                if ( is_deleted == false ){
                    modified_links_indices.push(link_index);
                }
            } else if (link.startVertex.index == vertex_index_to_remove) {
                let is_deleted = false;
                for (const [index2, link2] of board.graph.links.entries()) {
                    if ( index2 != link_index && link2.signatureEquals(vertex_index_fixed, link.endVertex.index, link.orientation)){
                        deleted_links.set(link_index, link);
                        is_deleted = true;
                        break;
                    }
                }
                if ( is_deleted == false ){
                    modified_links_indices.push(link_index);
                }
            }
        }

        return new MergeVertices(vertexFixed,  vertex_to_remove, deleted_links, modified_links_indices);
    }

    static handle(board: HistBoard, fixedVertexId: number, vertexToRemoveId: number) {
        console.log(`Handle: vertices_merge: fixed: ${fixedVertexId} toRemove: ${vertexToRemoveId}`);
        board.handleUndo(); // TODO its not necessarily the last which is a translate
        // if Merge is impossible do not cancel last modification
        const modif = MergeVertices.fromBoard(board,  fixedVertexId, vertexToRemoveId);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        emit_graph_to_room(board, new Set())
    }

    emitDeimplementation(board: HistBoard): void {
        emit_graph_to_room(board, new Set());
    }

    static addEvent(client: Client){
        client.socket.on("vertices_merge", (fixedVertexId: number, vertexToRemoveId: number) => MergeVertices.handle(client.board, fixedVertexId, vertexToRemoveId));
    }
}
