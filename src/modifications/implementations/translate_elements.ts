import { Vect } from "gramoloss";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";

export class TranslateElements implements BoardModification {
    indices: Array<[string,number]>;
    shift: Vect;
    
    constructor(indices: Array<[string,number]>, shift: Vect){
        this.indices = indices;
        this.shift = shift;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        for (const [kind, index] of this.indices) {
            if (kind == "TextZone"){
                const textZone = board.text_zones.get(index);
                if (textZone !== undefined){
                    textZone.pos.translate(this.shift);
                }else {
                    return "Error: index not in text_zones";
                }
            } else if (kind == "Stroke"){
                const stroke = board.strokes.get(index);
                if (stroke !== undefined){
                    stroke.translate(this.shift);
                }else {
                    return "Error: index not in strokes";
                }
            } else if (kind == "Area"){
                if (board.areas.has(index)){
                    board.translate_areas(new Set([index]), this.shift);
                }else {
                    return "Error: index not in areas";
                }
            } else if (kind == "ControlPoint"){
                const link = board.graph.links.get(index);
                if (link !== undefined){
                    if ( typeof link.data.cp != "undefined"){
                        link.data.cp.translate(this.shift);
                    }
                }else {
                    return "Error: index not in links";
                }
            } else if (kind == "Vertex"){
                if( board.graph.vertices.has(index)){
                    board.graph.translate_vertices([index], this.shift);
                } else {
                    return "Error: index not in vertices";
                }
            }
        }
        return new Set();
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        for (const [kind, index] of this.indices) {
            if (kind == "TextZone"){
                const textZone = board.text_zones.get(index);
                if (textZone !== undefined){
                    textZone.pos.rtranslate(this.shift);
                }
            } else if (kind == "Stroke"){
                const stroke = board.strokes.get(index);
                if (stroke !== undefined){
                    stroke.rtranslate(this.shift);
                }
            } else if (kind == "Area"){
                if (board.areas.has(index)){
                    board.translate_areas(new Set([index]), this.shift.opposite());               
                }
            } else if (kind == "ControlPoint"){
                const link = board.graph.links.get(index);
                if (link !== undefined){
                    if ( typeof link.data.cp != "undefined"){
                        link.data.cp.rtranslate(this.shift);
                    }
                }
            } else if (kind == "Vertex"){
                if( board.graph.vertices.has(index)){
                    board.graph.translate_vertices([index], this.shift.opposite());
                }
            }
        }
        return new Set();
    }
}