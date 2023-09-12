import { BasicLink, BasicLinkData, BasicVertex, BasicVertexData } from "gramoloss";
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
}
