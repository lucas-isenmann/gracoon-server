import { Coord } from "gramoloss";
import { Socket } from "socket.io";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { BoardModification, SENSIBILITY, ServerBoard } from "../modification";



export class UpdateElement implements BoardModification {
    index: number;
    kind: string;
    param: string;
    new_value: any;
    old_value: any;
    
    constructor(index: number, kind: string, param: string, new_value: any, old_value: any){
        this.index = index;
        this.kind = kind;
        this.param = param;
        this.new_value = new_value;
        this.old_value = old_value;
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        if (this.kind == "TextZone" && board.text_zones.has(this.index)){
            const textZone = board.text_zones.get(this.index);
            if (textZone !== undefined){
                if (this.param == "text"){
                    textZone.text = this.new_value;
                } else if (this.param == "width"){
                    textZone.width = this.new_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set();
        } else if (this.kind == "Vertex" && board.graph.vertices.has(this.index)){
            const vertex = board.graph.vertices.get(this.index);
            if (vertex !== undefined){
                if (this.param == "color"){
                    vertex.data.color = this.new_value;
                } else if (this.param == "weight"){
                    vertex.data.weight = this.new_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }else if (this.kind == "Link" && board.graph.links.has(this.index)){
            const link = board.graph.links.get(this.index);
            if (link !== undefined){
                if (this.param == "cp"){
                    link.data.cp = this.new_value;
                } else if (this.param == "color"){
                    link.data.color = this.new_value;
                } else if (this.param == "weight"){
                    link.data.weight = this.new_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }else if (this.kind == "Stroke" && board.strokes.has(this.index)){
            const stroke = board.strokes.get(this.index);
            if (stroke !== undefined){
                if (this.param == "color"){
                    stroke.color = this.new_value;
                } else if (this.param == "width"){
                    stroke.width = this.new_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }else if (this.kind == "Area" && board.areas.has(this.index)){
            const area = board.areas.get(this.index);
            if (area !== undefined){
                if (this.param == "color"){
                    area.color = this.new_value;
                } else if (this.param == "label"){
                    area.label = this.new_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }else {
            return "Error: index not in text_zones";
        }
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        if (this.kind == "TextZone" && board.text_zones.has(this.index)){
            const textZone = board.text_zones.get(this.index);
            if (textZone !== undefined){
                if (this.param == "text"){
                    textZone.text = this.old_value;
                } else if (this.param == "width"){
                    textZone.width = this.old_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set();
        }else if (this.kind == "Vertex" && board.graph.vertices.has(this.index)){
            const vertex = board.graph.vertices.get(this.index);
            if (vertex !== undefined){
                if (this.param == "color"){
                    vertex.data.color = this.old_value;
                } else if (this.param == "weight"){
                    vertex.data.weight = this.old_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set([SENSIBILITY.COLOR])
        }else if (this.kind == "Link" && board.graph.links.has(this.index)){
            const link = board.graph.links.get(this.index);
            if (link !== undefined){
                if (this.param == "cp"){
                    link.data.cp = this.old_value;
                } else if (this.param == "color"){
                    link.data.color = this.old_value;
                } else if (this.param == "weight"){
                    link.data.weight = this.old_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }            return new Set()
        }else if (this.kind == "Stroke" && board.strokes.has(this.index)){
            const stroke = board.strokes.get(this.index);
            if (stroke !== undefined){
                if (this.param == "color"){
                    stroke.color = this.old_value;
                } else if (this.param == "width"){
                    stroke.width = this.old_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }else if (this.kind == "Area" && board.areas.has(this.index)){
            const area = board.areas.get(this.index);
            if (area !== undefined){
                if (this.param == "color"){
                    area.color = this.old_value;
                } else if (this.param == "label"){
                    area.label = this.old_value;
                } else {
                    console.log(`parameter ${this.param} not implemented`)
                }
            }
            return new Set()
        }
        return new Set();
    }

    

    static handle(board: HistBoard, kind: string, index: number, param: string, new_value: any) {
        console.log("Handle: update_element", kind, index, param, new_value);
        const old_value = board.get_value(kind, index, param);
        if (param == "cp") {
            if (new_value.hasOwnProperty('x') && new_value.hasOwnProperty('y')) {
                new_value = new Coord(new_value.x, new_value.y);
            } else {
                new_value = undefined;
            }
        }
        const modif = new UpdateElement(index, kind, param, new_value, old_value)
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: this.param, value: this.new_value }, new Set());
    }

    emitDeimplementation(board: HistBoard): void{
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: this.param, value: this.old_value }, new Set());
    }


    static addEvent(board: HistBoard, client: Socket){
        client.on("update_element", (kind: string, index: number, param: string, newValue: any) => UpdateElement.handle(board, kind, index, param, newValue));
    }

}