import { Area, Coord, Rectangle, Representation } from "gramoloss";
import { broadcastInRoom } from "../..";
import { handleBoardModification } from "../../handler";
import { HistBoard } from "../../hist_board";
import { Client } from "../../user";
import { BoardModification, RESIZE_TYPE, SENSIBILITY, ServerBoard } from "../modification";

export class ResizeElement implements BoardModification {
    element: Area | Rectangle | Representation;
    index: number;
    kind: string;
    previous_c1: Coord;
    previous_c2: Coord;
    new_c1: Coord;
    new_c2: Coord;

    constructor(element: Area | Rectangle | Representation, index: number, kind: string, previous_c1: Coord, previous_c2: Coord, new_c1: Coord, new_c2: Coord) {
        this.element = element;
        this.index = index;
        this.kind = kind;
        this.previous_c1 = previous_c1;
        this.previous_c2 = previous_c2;
        this.new_c1 = new_c1;
        this.new_c2 = new_c2;
    }

    static fromElement(element: Area | Rectangle | Representation, index: number, kind: string, x: number, y: number, resize_type: RESIZE_TYPE): ResizeElement{
        const new_c1 = element.c1.copy();
        const new_c2 = element.c2.copy();

        switch (resize_type) {
            case RESIZE_TYPE.TOP:
                if (element.c1.y > element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
            case RESIZE_TYPE.RIGHT:
                if (element.c1.x > element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                break;
            case RESIZE_TYPE.BOTTOM:
                if (element.c1.y < element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
            case RESIZE_TYPE.LEFT:
                if (element.c1.x < element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                break;
            case RESIZE_TYPE.TOP_LEFT:{
                if (element.c1.x < element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                if (element.c1.y > element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
            }
            case RESIZE_TYPE.TOP_RIGHT:{
                if (element.c1.x > element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                if (element.c1.y > element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
            }
            case RESIZE_TYPE.BOTTOM_RIGHT:
                if (element.c1.x > element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                if (element.c1.y < element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
            case RESIZE_TYPE.BOTTOM_LEFT:
                if (element.c1.x < element.c2.x) { new_c1.x = x; }
                else { new_c2.x = x; }
                if (element.c1.y < element.c2.y) { new_c2.y = y; }
                else { new_c1.y = y; }
                break;
        }

        return new ResizeElement(element, index, kind, element.c1, element.c2, new_c1, new_c2);
    }

    try_implement(board: ServerBoard): Set<SENSIBILITY> | string{
        this.element.c1 = this.new_c1;
        this.element.c2 = this.new_c2;
        return new Set([]);
    }

    deimplement(board: ServerBoard): Set<SENSIBILITY>{
        this.element.c1 = this.previous_c1;
        this.element.c2 = this.previous_c2;
        return new Set([]);
    }

    static handle(board: HistBoard, kind: string, index: number, x: number, y: number, rawResizeType: string) {
        console.log("Receive Request: resize_element");
        let element: undefined | Area | Representation | Rectangle = undefined;
        if (kind == "Area") {
            if (board.areas.has(index) == false) {
                console.log(`Error : cannot handle because Area index ${index} does not exist`);
                return;
            }
            element = board.areas.get(index);
        } else if (kind == "Rectangle") {
            if (board.rectangles.has(index) == false) {
                console.log(`Error : cannot handle because Rectangle index ${index} does not exist`);
                return;
            }
            element = board.rectangles.get(index);
        } else if (kind == "Representation") {
            if (board.representations.has(index) == false) {
                console.log(`Error : cannot handle because Representation index ${index} does not exist`);
                return;
            }
            element = board.representations.get(index);
        }
        if (element == null) {
            console.log("Error : Type ", kind, " is unsupported");
            return;
        }

        const resizeType = rawResizeType as RESIZE_TYPE;
        const modif = ResizeElement.fromElement(element, index, kind, x, y, resizeType);
        handleBoardModification(board, modif);
    }

    firstEmitImplementation(board: HistBoard): void{
    }

    emitImplementation(board: HistBoard): void{
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: "c1", value: this.new_c1 }, new Set());
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: "c2", value: this.new_c2 }, new Set());
    }

    emitDeimplementation(board: HistBoard){
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: "c1", value: this.previous_c1 }, new Set());
        broadcastInRoom(board.roomId, "update_element", { index: this.index, kind: this.kind, param: "c2", value: this.previous_c2 }, new Set());
    }

    static addEvent(client: Client){
        client.socket.on("resize_element", ( kind: string, index: number, x: number, y: number, rawResizeType: string) => ResizeElement.handle(client.board, kind, index, x, y, rawResizeType));
    }
}