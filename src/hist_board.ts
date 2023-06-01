import { SENSIBILITY } from "gramoloss";
import { ServerBoard, BoardModification } from "./modifications/modification";

export class HistBoard extends ServerBoard {
    modifications_stack: Array<BoardModification> = new Array();
    modifications_canceled: Array<BoardModification> = new Array();

    constructor() {
        super();
    }

    append_modification_already_implemented(modif: BoardModification){
        this.modifications_stack.push(modif);
        this.modifications_canceled.length = 0;
    }

    try_push_new_modification(modif: BoardModification): Set<SENSIBILITY> | string{
        const r = modif.try_implement(this);
        if ( typeof r === "string"){
            console.log("ERROR: try to implement but failed: " , r);
        }else {
            this.modifications_stack.push(modif);
            this.modifications_canceled.length = 0;
        }
        return r;
    }

    cancel_last_modification(): BoardModification | string{
        const last_modif = this.modifications_stack.pop();
        if (last_modif !== undefined){
            const s = last_modif.deimplement(this);
            this.modifications_canceled.push(last_modif);
            return last_modif;
        } 
        return "no modification in stack";
    }

    redo(): BoardModification | string {
        const modif = this.modifications_canceled.pop();
        if (modif !== undefined){
            const r = modif.try_implement(this);
            if ( typeof r === "string"){
                console.log("ERROR: try to implement but failed: " , r);
            }else {
                this.modifications_stack.push(modif);
            }
            return modif;
        }
        return "REMARK: no canceled modifcation to redo";
    }
    
}