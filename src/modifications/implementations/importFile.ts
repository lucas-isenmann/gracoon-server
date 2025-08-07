import { BasicLink, BasicVertex, BasicVertexData, Coord, ORIENTATION } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, SENSIBILITY, ServerBoard, ServerLinkData } from "../modification";

export class ImportFile implements BoardModification {
    addedVertices: Array<BasicVertex<BasicVertexData>>;
    addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>;


    constructor(
        addedVertices: Array<BasicVertex<BasicVertexData>>, 
        addedLinks: Array<BasicLink<BasicVertexData, ServerLinkData>>){
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

    static handle(board: HistBoard, clientId: string, rawFile: string, cx: number, cy: number, r: number): void{
        console.log(`Handle: import_file b:${board.roomId} u:${clientId} ${rawFile.slice(0,20)}`);



        const lines = rawFile.split('\n');
        const outNeighbors = new Map<string, Array<[string, string]>>();
        const newEdges = new Array<[string, string, string]>();

        lines.forEach(line => {
            const match = line.match(/(\w+)\s*->\s*(\w+)\s*(?:\[.*?label=(\w+).*?\])?;/);
            // console.log("line: ", line);
            if (match) {
                const [, from, to, label] = match;
                if (!outNeighbors.has(from)){
                    outNeighbors.set(from, []);
                } 
                if (!outNeighbors.has(to)){
                    outNeighbors.set(to, []);
                }
                outNeighbors.get(from)!.push([to, label || ""]);
                // console.log(from, to, label);
            } else {
                // console.log("no match");
            }

            const matchUndirected = line.match(/(\w+)\s*--\s*(\w+)\s*(?:\[.*?label=(\w+).*?\])?;/);
            // console.log("line: ", line);
            if (matchUndirected) {
                const [, from, to, label] = matchUndirected;
                if (!outNeighbors.has(from)){
                    outNeighbors.set(from, []);
                } 
                if (!outNeighbors.has(to)){
                    outNeighbors.set(to, []);
                }
                newEdges.push([from, to, label || ""]);
                console.log("edge: ", from, to, label);
            } else {
                // console.log("no match");
            }
        });

        const nbNewVertices = outNeighbors.size;
        const newVerticesIndices: Array<number> = board.graph.get_next_n_available_vertex_indices(nbNewVertices);


        const addedVertices = new Map<number, BasicVertex<BasicVertexData>>();
        const addedLinks = new Array<BasicLink<BasicVertexData, ServerLinkData>>();
        const vertexIndicesTransformation = new Map<string, number>(); // used to translate the vertices indices in the added links


        let nbNewLinks = 0;
        let i = 0;
        for (const [v, vOutNeighbors] of outNeighbors) {
            const angle = i*Math.PI*2/nbNewVertices;
            const pos = new Coord(cx + r*Math.cos(angle), cy + r*Math.sin(angle));
            const vertexData = new BasicVertexData(pos, "", "Neutral");
            const vertex = new BasicVertex(newVerticesIndices[i], vertexData);
            addedVertices.set(vertex.index, vertex);
            vertexIndicesTransformation.set(v, vertex.index);
            i++;
            nbNewLinks += vOutNeighbors.length;
        }

        nbNewLinks += newEdges.length;

        const newLinkIndices = board.graph.get_next_n_available_link_indices(nbNewLinks);

        // Add arcs
        let j = 0;
        for (const [v, vOutNeighbors] of outNeighbors) {
            for (const [w, label] of vOutNeighbors){
                const startIndex = vertexIndicesTransformation.get(v);
                const endIndex = vertexIndicesTransformation.get(w);
                if (typeof startIndex == "number" && typeof endIndex == "number") {
                    let cp: undefined | Coord = undefined;
                    const startVertex = addedVertices.get(startIndex);
                    const endVertex = addedVertices.get(endIndex);
                    if (typeof startVertex == "undefined" || typeof endVertex == "undefined"){
                        console.log(`Error: cannot create ImportFile: cannot get new startVertex or new endVertex at indices ${startIndex} ${endIndex}`)
                        return;
                    }
                    const linkData = new ServerLinkData(cp, label, "Neutral", "normal");
                    const link = new BasicLink(newLinkIndices[j], startVertex, endVertex, ORIENTATION.DIRECTED, linkData);
                    addedLinks.push( link);
                    j++;
                }
            }
        }

        // Add edges
        for (const [v,w, label] of newEdges){
            const startIndex = vertexIndicesTransformation.get(v);
            const endIndex = vertexIndicesTransformation.get(w);
            if (typeof startIndex == "number" && typeof endIndex == "number") {
                let cp: undefined | Coord = undefined;
                const startVertex = addedVertices.get(startIndex);
                const endVertex = addedVertices.get(endIndex);
                if (typeof startVertex == "undefined" || typeof endVertex == "undefined"){
                    console.log(`Error: cannot create ImportFile: cannot get new startVertex or new endVertex at indices ${startIndex} ${endIndex}`)
                    return;
                }
                const linkData = new ServerLinkData(cp, label, "Neutral", "normal");
                const link = new BasicLink(newLinkIndices[j], startVertex, endVertex, ORIENTATION.UNDIRECTED, linkData);
                addedLinks.push( link);
                j++;
            }
        }

     

        

        const modif = new ImportFile([...addedVertices.values()], addedLinks);
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
        client.socket.on("import_file", (rawFile: string, cx: number, cy: number, r: number) => {
            ImportFile.handle(client.board, client.label, rawFile, cx, cy, r)});
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