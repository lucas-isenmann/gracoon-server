import { BasicLink, BasicLinkData, BasicVertex, BasicVertexData } from "gramoloss";
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
}