import { Vect } from "gramoloss";
import { broadcastInRoom } from "../..";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { eq_indices } from "../../utils";
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
            if (kind == "Rectangle"){
                const rectangle = board.rectangles.get(index);
                if (typeof rectangle != "undefined"){
                    rectangle.c1.translate(this.shift);
                    rectangle.c2.translate(this.shift);
                }else {
                    return "Error: index not in rectangles";
                }
            } else if (kind == "TextZone"){
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
            if (kind == "Rectangle"){
                const rectangle = board.rectangles.get(index);
                if (typeof rectangle != "undefined"){
                    rectangle.c1.rtranslate(this.shift);
                    rectangle.c2.rtranslate(this.shift);
                }
            } else if (kind == "TextZone"){
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


    static handle(board: HistBoard, indices: Array<[string, number]>, rawShift: {x: number, y: number}) {
        // console.log("Handle: translate_elements", indices, rawShift);
        if ( !rawShift.hasOwnProperty('x') || !rawShift.hasOwnProperty('y')){
            console.log(`Error: cannot handle because give shift has no x or y property.`)
            return;
        }
        const shift = new Vect(rawShift.x, rawShift.y);
        let agregate = false;        

        if (board.modifications_stack.length > 0) {
            const last_modif = board.modifications_stack[board.modifications_stack.length - 1];
            if (last_modif.constructor == TranslateElements) {
                const last_modif2 = last_modif as TranslateElements;
                if (eq_indices(last_modif2.indices, indices)) {
                    shift.translate(last_modif2.shift);
                    last_modif2.deimplement(board);
                    board.modifications_stack.pop();
                    agregate = true;
                }
            }
        }
        if (agregate == false){
            console.log(`Handle: translate b:${board.roomId}`, indices, rawShift);
        }
        const modif = new TranslateElements(indices, shift);
        const r = board.try_push_new_modification(modif);
        if (typeof r === "string") {
            console.log(r);
        } else {
            broadcastInRoom(board.roomId, "translate_elements", { indices: modif.indices, shift: rawShift }, new Set());
        }

    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        broadcastInRoom(board.roomId, "translate_elements", { indices: this.indices, shift: this.shift }, new Set());
    }

    emitDeimplementation(board: HistBoard): void {
        broadcastInRoom(board.roomId, "translate_elements", { indices: this.indices, shift: this.shift.opposite() }, new Set());
    }

    static addEvent(client: Client){
        client.socket.on("translate_elements", (indices: Array<[string, number]>, rawShift: {x: number, y: number}) => TranslateElements.handle(client.board, indices, rawShift));

    }
}