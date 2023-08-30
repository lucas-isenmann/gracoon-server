import { Vertex, Link, SENSIBILITY, Coord, Graph, ORIENTATION } from "gramoloss";
import { BoardModification, ServerBoard } from "../modification";




export class SubdivideLinkModification implements BoardModification {
    newVertex: Vertex;
    newVertexIndex: number;
    newLink1Index: number;
    newLink1: Link;
    newLink2Index: number;
    newLink2: Link;
    oldLinkIndex: number;
    oldLink: Link;
    
    constructor(newVertex: Vertex, newVertexIndex: number, newLink1Index: number, newLink1: Link, newLink2Index: number, newLink2: Link, oldLinkIndex: number, oldLink: Link ) {
        this.newVertexIndex = newVertexIndex;
        this.newVertex = newVertex;
        this.newLink1Index = newLink1Index;
        this.newLink1 = newLink1;
        this.newLink2Index = newLink2Index
        this.newLink2 = newLink2;
        this.oldLinkIndex = oldLinkIndex;
        this.oldLink = oldLink;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        board.graph.vertices.set(this.newVertexIndex, this.newVertex);
        board.graph.links.delete(this.oldLinkIndex);
        board.graph.links.set(this.newLink1Index, this.newLink1);
        board.graph.links.set(this.newLink2Index, this.newLink2);
        return new Set();
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        board.graph.vertices.delete(this.newVertexIndex);
        board.graph.links.delete(this.newLink1Index);
        board.graph.links.delete(this.newLink2Index);
        board.graph.links.set(this.oldLinkIndex, this.oldLink);
        return new Set();
    }

    static from_graph(graph: Graph<Vertex,Link>, oldLinkIndex: number, oldLink: Link, pos: Coord  ): SubdivideLinkModification{
        const newVertex = new Vertex(pos.x, pos.y, "");
        const newVertexIndex = graph.get_next_available_index_vertex();
        const newLink1 = new Link(oldLink.start_vertex, newVertexIndex, "", ORIENTATION.UNDIRECTED, oldLink.color, "");
        const newLink2 = new Link(newVertexIndex, oldLink.end_vertex, "", ORIENTATION.UNDIRECTED, oldLink.color, "");
        const [newLink1Index, newLink2Index] = graph.get_next_n_available_link_indices(2);
        return new SubdivideLinkModification(newVertex, newVertexIndex, newLink1Index, newLink1, newLink2Index, newLink2, oldLinkIndex, oldLink )
    }
}