import { BasicLink, BasicLinkData, BasicVertex, BasicVertexData, Coord, Graph } from "gramoloss";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";




export class SubdivideLinkModification implements BoardModification {
    newVertex: BasicVertex<BasicVertexData>;
    newLink1: BasicLink<BasicVertexData, BasicLinkData>;
    newLink2: BasicLink<BasicVertexData, BasicLinkData>;
    oldLink: BasicLink<BasicVertexData, BasicLinkData>;
    
    constructor(newVertex: BasicVertex<BasicVertexData>, newLink1: BasicLink<BasicVertexData, BasicLinkData>, newLink2: BasicLink<BasicVertexData, BasicLinkData>,  oldLink: BasicLink<BasicVertexData, BasicLinkData> ) {
        this.newVertex = newVertex;
        this.newLink1 = newLink1;
        this.newLink2 = newLink2;
        this.oldLink = oldLink;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        board.graph.vertices.set(this.newVertex.index, this.newVertex);
        board.graph.links.delete(this.oldLink.index);
        board.graph.links.set(this.newLink1.index, this.newLink1);
        board.graph.links.set(this.newLink2.index, this.newLink2);
        return new Set();
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        board.graph.vertices.delete(this.newVertex.index);
        board.graph.links.delete(this.newLink1.index);
        board.graph.links.delete(this.newLink2.index);
        board.graph.links.set(this.oldLink.index, this.oldLink);
        return new Set();
    }

    static fromGraph(board: ServerBoard, oldLinkIndex: number, pos: Coord  ): SubdivideLinkModification | undefined{
        const oldLink = board.graph.links.get(oldLinkIndex);
        if (typeof oldLink == "undefined"){
            console.log (`Error: cannot create SubdivideLink from graph. ${oldLinkIndex} is not a valid link index.`)
            return undefined;
        }

        const newVertexData = new BasicVertexData( pos, "", "black");
        const newVertexIndex = board.graph.get_next_available_index_vertex();
        const newVertex = new BasicVertex(newVertexIndex, newVertexData);

        const newLink1Data = new BasicLinkData( undefined, "", oldLink.data.color);
        const newLink2Data = new BasicLinkData( undefined, "", oldLink.data.color);
        const [newLink1Index, newLink2Index] = board.graph.get_next_n_available_link_indices(2);

        const newLink1 = new BasicLink(newLink1Index, oldLink.startVertex, newVertex, oldLink.orientation, newLink1Data);
        const newLink2 = new BasicLink(newLink2Index, newVertex, oldLink.endVertex, oldLink.orientation, newLink1Data);
        
        return new SubdivideLinkModification(newVertex, newLink1, newLink2,  oldLink )
    }
}