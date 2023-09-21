import { Board, Stroke, Area, TextZone, Representation, Rectangle, BasicVertexData, BasicLinkData } from "gramoloss";
import { HistBoard } from "../hist_board";

export enum SENSIBILITY {
    GEOMETRIC = "GEOMETRIC", // Move of vertex/link
    COLOR = "COLOR", // Change of color for vertices/links
    ELEMENT = "ELEMENT", // Create/delete vertex/link
    WEIGHT = "WEIGHT"
}

export enum RESIZE_TYPE {
    BOTTOM = "BOTTOM",
    TOP = "TOP",
    LEFT = "LEFT",
    RIGHT = "RIGHT",
    TOP_RIGHT = "TOP_RIGHT",
    TOP_LEFT = "TOP_LEFT",
    BOTTOM_RIGHT = "BOTTOM_RIGHT",
    BOTTOM_LEFT = "BOTTOM_LEFT"
}

export class ServerBoard extends Board<BasicVertexData, BasicLinkData, Stroke, Area, TextZone, Representation, Rectangle>{
    
}


export interface BoardModification { 
    try_implement(board: ServerBoard): Set<SENSIBILITY> | string;
    deimplement(board: ServerBoard): Set<SENSIBILITY>;
    firstEmitImplementation(board: HistBoard): void;
    emitImplementation(board: HistBoard): void;
    emitDeimplementation(board: HistBoard): void;
};
