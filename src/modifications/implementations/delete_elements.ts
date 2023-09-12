import { Stroke, Area, TextZone, Representation, BasicVertex, BasicLink, BasicVertexData, BasicLinkData } from "gramoloss";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

/**
 * Contains the list of the deleted elements
 */
export class DeleteElements implements BoardModification {
    vertices: Map<number, BasicVertex<BasicVertexData>>;
    links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>;
    strokes: Map<number, Stroke>;
    areas: Map<number, Area>;
    text_zones: Map<number, TextZone>;

    constructor(vertices: Map<number, BasicVertex<BasicVertexData>>, links: Map<number, BasicLink<BasicVertexData, BasicLinkData>>, strokes: Map<number, Stroke>, areas: Map<number, Area>, text_zones: Map<number, TextZone>) {
        this.vertices = vertices;
        this.links = links;
        this.strokes = strokes;
        this.areas = areas;
        this.text_zones = text_zones;
    }

    static fromBoard(board: ServerBoard, indices: Array<[string, number]>): DeleteElements | undefined{
        const vertices = new Map();
        const links = new Map();
        const strokes = new Map();
        const areas = new Map();
        const textZones = new Map();
        for (const [kind, index] of indices){
            if (kind == "Vertex"){
                const deletedVertex = board.graph.vertices.get(index);
                if (typeof deletedVertex == "undefined"){
                    console.log(`Error: DeleteElements.fromBoard: vertex index ${index} does not exists`);
                    return undefined;
                }
                vertices.set(index, deletedVertex);
                board.graph.links.forEach((link, link_index) => {
                    if (link.endVertex.index === index || link.startVertex.index === index) {
                        links.set(link_index, link);
                    }
                })
            } else if (kind == "Link"){
                const deletedLink = board.graph.links.get(index);
                if (typeof deletedLink == "undefined"){
                    console.log(`Error: DeleteElements.fromBoard: link index ${index} does not exists`);
                    return undefined;
                }
                links.set(index, deletedLink);
            } else if (kind == "Stroke"){
                strokes.set(index, board.strokes.get(index));
            } else if (kind == "Area"){
                areas.set(index, board.areas.get(index));
            } else if (kind == "TextZone"){
                textZones.set(index, board.text_zones.get(index));
            } else {
                console.log(`Error: DeleteElements.fromBoard: kind ${kind} not supported`);
                return undefined;
            }
        }
        return new DeleteElements(vertices, links, strokes, areas, textZones);
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for (const index of this.vertices.keys()) {
            board.graph.delete_vertex(index);
        }
        for (const index of this.links.keys()) {
            board.graph.delete_link(index);
        }
        for (const index of this.strokes.keys()) {
            board.delete_stroke(index);
        }
        for (const index of this.areas.keys()) {
            board.delete_area(index);
        }
        for (const index of this.text_zones.keys()){
            board.text_zones.delete(index);
        }
        // TODO set is false
        return new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC, SENSIBILITY.WEIGHT])
    }


    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        for (const [index, vertex] of this.vertices.entries()) {
            board.graph.vertices.set(index, vertex);
        }
        for (const [index, link] of this.links.entries()) {
            board.graph.links.set(index, link);
        }
        for (const [index, stroke] of this.strokes.entries()) {
            board.strokes.set(index, stroke);
        }
        for (const [index, area] of this.areas.entries()) {
            board.areas.set(index, area);
        }
        for (const [index, text_zone] of this.text_zones.entries()){
            board.text_zones.set(index, text_zone);
        }
        return new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC, SENSIBILITY.WEIGHT])
    }
}