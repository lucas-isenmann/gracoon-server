import { Area, BasicLink, BasicLinkData, BasicVertex, BasicVertexData, Stroke, TextZone } from "gramoloss";
import { io } from ".";
import { ServerBoard, BoardModification, SENSIBILITY } from "./modifications/modification";
import { Client } from "./user";

export type BoardElement = BasicVertex<BasicVertexData>|BasicLink<BasicVertexData, BasicLinkData>|Stroke|Area|TextZone;

export class HistBoard extends ServerBoard {
    clients: Map<string, Client>;
    roomId: string;
    modifications_stack: Array<BoardModification> = new Array();
    modifications_canceled: Array<BoardModification> = new Array();

    creationDate: string;

    constructor(roomId: string) {
        super();
        this.clients = new Map();
        this.roomId = roomId;
        this.creationDate = (new Date()).toISOString();
    }

    removeClient(clientId: string){
        this.clients.delete(clientId);
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
            // console.log(this.modifications_stack.length)
            this.modifications_canceled.length = 0;
        }
        return r;
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
    
    broadcast(ev: string, ...args: any[]){
        io.sockets.in(this.roomId).emit(ev, ...args);
    }

    broadcastItsClients() {
        for (const client of this.clients.values()){
            this.broadcast('update_user', client.socket.id, client.label, client.color, client.pos);
        }
    }


    handleUndo() {
        console.log("Handle: undo");
        const modif = this.modifications_stack.pop();
        if (modif !== undefined){
            const s = modif.deimplement(this);
            this.modifications_canceled.push(modif);
            modif.emitDeimplementation(this);
        } else {
            console.log(`Remark: no modification in stack`)
        }
    }


    handleRedo() {
        console.log("Handle: redo");
        const modif = this.redo();
        if (typeof modif === "string") {
            console.log(modif);
        } else {
            modif.emitImplementation(this);
        }
    }

    toString(): string{
        const data = {
            creationDate: this.creationDate,
            nbModificationsInStack: this.modifications_stack.length,
            vertices: Array.from(this.graph.vertices.values()),
            links: Array.from(this.graph.links.values()),
            strokes: Array.from(this.strokes.values()),
            areas: Array.from(this.areas.values()),
            textZones: Array.from(this.text_zones.values())
        }
        return JSON.stringify(data)
    }
}