import { SENSIBILITY } from "gramoloss";
import { BoardModification, ServerBoard } from "../modification";



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
                    console.log("param ${this.param} not implemented")
                }
            }
            return new Set();
        } else if (this.kind == "Vertex" && board.graph.vertices.has(this.index)){
            const vertex = board.graph.vertices.get(this.index);
            if (vertex !== undefined){
                if (this.param == "color"){
                    vertex.color = this.new_value;
                } else if (this.param == "weight"){
                    vertex.weight = this.new_value;
                } else {
                    console.log("param ${this.param} not implemented")
                }
            }
            return new Set()
        }else if (this.kind == "Link" && board.graph.links.has(this.index)){
            const link = board.graph.links.get(this.index);
            if (link !== undefined){
                if (this.param == "color"){
                    link.color = this.new_value;
                } else if (this.param == "weight"){
                    link.weight = this.new_value;
                } else {
                    console.log("param ${this.param} not implemented")
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
                    console.log("param ${this.param} not implemented")
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
                    console.log("param ${this.param} not implemented")
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
                    console.log("param ${this.param} not implemented")
                }
            }
            return new Set();
        }else if (this.kind == "Vertex" && board.graph.vertices.has(this.index)){
            const vertex = board.graph.vertices.get(this.index);
            if (vertex !== undefined){
                if (this.param == "color"){
                    vertex.color = this.old_value;
                } else if (this.param == "weight"){
                    vertex.weight = this.old_value;
                } else {
                    console.log("param ${this.param} not implemented")
                }
            }
            return new Set([SENSIBILITY.COLOR])
        }else if (this.kind == "Link" && board.graph.links.has(this.index)){
            const link = board.graph.links.get(this.index);
            if (link !== undefined){
                if (this.param == "color"){
                    link.color = this.old_value;
                } else if (this.param == "weight"){
                    link.weight = this.old_value;
                } else {
                    console.log("param ${this.param} not implemented")
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
                    console.log("param ${this.param} not implemented")
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
                    console.log("param ${this.param} not implemented")
                }
            }
            return new Set()
        }
        return new Set();
    }
}